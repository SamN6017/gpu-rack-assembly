import ExcelJS from "exceljs";
import JSZip from "jszip";
import yauzl from "yauzl";
import { parse } from "csv-parse/sync";
export type Sheet = {
  name: string;
  headers: string[];
  rows: { rowNumber: number; values: string[] }[];
};
export const MAX_UPLOAD = 10 * 1024 * 1024;
// Bound declared expansion before ExcelJS allocates XML and shared strings.
async function inspectZip(bytes: Buffer) {
  await new Promise<void>((resolve, reject) =>
    yauzl.fromBuffer(bytes, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) return reject(new Error("Invalid XLSX archive"));
      let total = 0,
        count = 0;
      zip.on("error", reject);
      zip.on("entry", (entry: yauzl.Entry) => {
        total += entry.uncompressedSize;
        if (
          ++count > 2000 ||
          total > 40 * 1024 * 1024 ||
          entry.generalPurposeBitFlag & 1 ||
          /vbaProject|externalLinks/i.test(entry.fileName)
        ) {
          zip.close();
          reject(
            new Error(
              "Workbook exceeds expansion limits or contains macros/external links",
            ),
          );
          return;
        }
        zip.readEntry();
      });
      zip.on("end", resolve);
      zip.readEntry();
    }),
  );
}
function sheet(name: string, rows: string[][]): Sheet {
  if (
    rows.length > 10001 ||
    rows.some((r) => r.length > 100 || r.some((v) => v.length > 4000))
  )
    throw new Error(
      "Maximum 10,000 rows, 100 columns and 4,000 characters per cell",
    );
  const headers = rows[0] || [];
  if (
    !headers.length ||
    headers.some((h) => !h.trim()) ||
    new Set(headers).size !== headers.length
  )
    throw new Error("Headers must be nonempty and unique");
  return {
    name,
    headers,
    rows: rows
      .slice(1)
      .map((values, i) => ({ rowNumber: i + 2, values }))
      .filter((r) => r.values.some((v) => v !== "")),
  };
}
export async function readWorkbook(
  bytes: Buffer,
  filename: string,
): Promise<Sheet[]> {
  if (!bytes.length || bytes.length > MAX_UPLOAD)
    throw new Error("Upload must be between 1 byte and 10 MiB");
  if (/\.csv$/i.test(filename)) {
    const rows = parse(bytes.toString("utf8"), {
      bom: true,
      skip_empty_lines: true,
      relax_column_count: false,
      max_record_size: 400000,
    }) as string[][];
    return [sheet("CSV", rows)];
  }
  if (!/\.xlsx$/i.test(filename))
    throw new Error("Choose an .xlsx or .csv file");
  await inspectZip(bytes);
  // ExcelJS does not accept prefixed SpreadsheetML elements emitted by some
  // exporters. Normalize only prefixes bound exclusively to the standard URI.
  // Original uploaded bytes remain unchanged in ImportDocument.
  const archive = await JSZip.loadAsync(bytes);
  for (const entry of Object.values(archive.files)) {
    if (!entry.name.startsWith("xl/") || !entry.name.endsWith(".xml")) continue;
    let xml = await entry.async("string");
    const uri = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    const bindings = [...xml.matchAll(/xmlns:([A-Za-z_][\w.-]*)=["']([^"']+)["']/g)];
    for (const [, prefix, namespace] of bindings) {
      if (namespace !== uri || bindings.some(b => b[1] === prefix && b[2] !== uri)) continue;
      const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      xml = xml.replace(new RegExp(`<${escaped}:`, "g"), "<").replace(new RegExp(`</${escaped}:`, "g"), "</");
      xml = xml.replace(new RegExp(`xmlns:${escaped}=["']${uri}["']`, "g"), `xmlns="${uri}"`);
    }
    archive.file(entry.name, xml);
  }
  const normalizedBytes = await archive.generateAsync({type:"nodebuffer"});
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    normalizedBytes as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );
  if (workbook.worksheets.length > 30) throw new Error("Maximum 30 worksheets");
  return workbook.worksheets.map((ws) => {
    if (ws.rowCount > 10001 || ws.columnCount > 100)
      throw new Error("Worksheet exceeds row or column limit");
    const rows: string[][] = [];
    for (let n = 1; n <= ws.rowCount; n++) {
      const values: string[] = [];
      for (let c = 1; c <= ws.columnCount; c++) {
        const cell = ws.getCell(n, c),
          value = cell.value;
        if (
          cell.type === ExcelJS.ValueType.Formula ||
          (value &&
            typeof value === "object" &&
            ("formula" in value || "sharedFormula" in value))
        )
          throw new Error(
            `Formula cells are not accepted (${ws.name}!${cell.address}); export values first`,
          );
        values.push(
          value === null
            ? ""
            : value instanceof Date
              ? value.toISOString()
              : cell.text,
        );
      }
      rows.push(values);
    }
    return sheet(ws.name, rows);
  });
}
