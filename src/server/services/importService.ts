import "server-only";
import { Prisma, PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { readWorkbook } from "@/import/workbookReader";
import { mappingSchema, validateRows } from "@/import/validateRows";
import { DomainError, serializable } from "./transaction";
import { contentHash } from "./contentHash";
export async function uploadDocument(
  db: PrismaClient,
  bytes: Buffer,
  filename: string,
) {
  let sheets;
  try {
    sheets = await readWorkbook(bytes, filename);
  } catch (e) {
    throw new DomainError("INVALID_FILE", (e as Error).message, 400);
  }
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const document = await db.importDocument.upsert({
    where: { checksum },
    update: {},
    create: {
      filename,
      checksum,
      content: new Uint8Array(bytes),
      mediaType: /\.csv$/i.test(filename)
        ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
  return {
    id: document.id,
    checksum,
    sheets: sheets.map((s) => ({
      name: s.name,
      headers: s.headers,
      rowCount: s.rows.length,
      preview: s.rows.slice(0, 10),
    })),
  };
}
export async function previewImport(
  db: PrismaClient,
  id: string,
  input: unknown,
) {
  const options = mappingSchema.parse(input);
  const document = await db.importDocument.findUniqueOrThrow({ where: { id } });
  const sheets = await readWorkbook(
    Buffer.from(document.content),
    document.filename,
  );
  const sheet = sheets.find((s) => s.name === options.worksheet);
  if (!sheet) throw new DomainError("WORKSHEET", "Worksheet not found", 400);
  let rows;
  try {
    rows = validateRows(sheet, options);
  } catch (e) {
    throw new DomainError("MAPPING", (e as Error).message, 400);
  }
  if (!rows.length)
    throw new DomainError(
      "EMPTY_SHEET",
      "Selected worksheet has no data rows",
      400,
    );
  const existing = await db.material.findMany({
    where: {
      catalogNamespace: options.catalogNamespace,
      partNumber: {
        in: rows.flatMap((r) => (r.data ? [r.data.partNumber] : [])),
      },
    },
    select: { partNumber: true },
  });
  const duplicates = new Set(existing.map((m) => m.partNumber));
  for (const row of rows)
    if (row.data && duplicates.has(row.data.partNumber))
      row.errors.push("Part already exists in this catalog namespace");
  const rejectedRows = rows.filter((r) => r.errors.length).length;
  const report = {
    documentId: id,
    options,
    rows,
    hash: contentHash({ checksum: document.checksum, options, rows }),
  };
  const batch = await db.$transaction(async (tx) => {
    const source = await tx.dataSource.create({
      data: {
        name: document.filename,
        sourceType: /\.csv$/i.test(document.filename) ? "CSV" : "EXCEL",
        configurationJson: { documentId: id },
        connectionStatus: "DISCONNECTED",
      },
    });
    return tx.importBatch.create({
      data: {
        sourceId: source.id,
        filename: document.filename,
        checksum: document.checksum,
        rowCount: rows.length,
        acceptedRows: rows.length - rejectedRows,
        rejectedRows,
        status: rejectedRows ? "REJECTED" : "VALIDATED",
        mappingVersion: "materials-v1",
        schemaVersion: "1",
        validationReportJson: report as unknown as Prisma.InputJsonValue,
      },
    });
  });
  return {
    ...batch,
    validationReportJson: { ...report, rows: rows.slice(0, 100) },
    previewLimit: 100,
  };
}
export async function confirmImport(
  db: PrismaClient,
  id: string,
  hash: string,
  actor: string,
) {
  return serializable(db, async (tx) => {
    const batch = await tx.importBatch.findUniqueOrThrow({ where: { id } });
    const report = batch.validationReportJson as unknown as {
      documentId: string;
      options: ReturnType<typeof mappingSchema.parse>;
      hash: string;
      rows: ReturnType<typeof validateRows>;
    };
    if (report.hash !== hash)
      throw new DomainError(
        "STALE_PREVIEW",
        "Review the latest preview before confirming",
      );
    if (batch.status === "IMPORTED") return batch;
    if (batch.status !== "VALIDATED" || batch.rejectedRows)
      throw new DomainError(
        "INVALID_ROWS",
        "Correct all invalid rows before confirming",
      );
    for (const row of report.rows) {
      if (!row.data || row.errors.length)
        throw new DomainError("INVALID_ROWS", "Invalid row cannot be imported");
      const material = await tx.material.create({ data: row.data });
      await tx.importRow.create({
        data: {
          batchId: id,
          worksheet: report.options.worksheet,
          rowNumber: row.rowNumber,
          entityType: "Material",
          rawJson: row.raw,
          normalizedJson: row.data,
        },
      });
      await tx.dataProvenance.createMany({
        data: Object.entries(row.data).map(([fieldName, rawValue]) => ({
          entityType: "Material",
          entityId: material.id,
          fieldName,
          rawValue,
          classification: report.options.classification,
          datasetKind: row.data!.datasetKind,
          sourceReference: `${batch.filename}#${report.options.worksheet}!row=${row.rowNumber}; ${row.data!.sourceReference}`,
          sourceId: batch.sourceId,
          importBatchId: id,
        })),
      });
    }
    return tx.importBatch.update({
      where: { id },
      data: {
        status: "IMPORTED",
        importedAt: new Date(),
        approvedAt: new Date(),
        approvedBy: actor,
      },
    });
  });
}
