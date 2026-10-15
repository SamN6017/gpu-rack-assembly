import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { db, setupDatabase, clearDatabase } from "./databaseHarness";
import {
  uploadDocument,
  previewImport,
  confirmImport,
} from "@/server/services/importService";
import { suggestMapping } from "@/import/validateRows";
beforeAll(setupDatabase);
beforeEach(clearDatabase);
afterAll(() => db.$disconnect());
it("retains source bytes and provenance and confirms atomically and idempotently", async () => {
  const bytes = Buffer.from(
    "part_number,description,category,unit_of_measure,source_reference,provenance\nDEMO,Demo part,Demo,EA,Demo only,SYNTHETIC\n",
  );
  const document = await uploadDocument(db, bytes, "demo.csv");
  const same = await uploadDocument(db, bytes, "demo.csv");
  expect(same.id).toBe(document.id);
  const batch = await previewImport(db, document.id, {
    worksheet: "CSV",
    catalogNamespace: "demo",
    datasetKind: "SYNTHETIC",
    classification: "ASSUMED",
    actor: "Reviewer",
    mapping: suggestMapping(document.sheets[0].headers),
  });
  expect(batch.status).toBe("VALIDATED");
  await expect(
    confirmImport(db, batch.id, "stale", "Reviewer"),
  ).rejects.toThrow("latest preview");
  await confirmImport(
    db,
    batch.id,
    batch.validationReportJson.hash,
    "Reviewer",
  );
  await confirmImport(
    db,
    batch.id,
    batch.validationReportJson.hash,
    "Reviewer",
  );
  expect(await db.material.count()).toBe(1);
  expect(await db.importRow.count({ where: { batchId: batch.id } })).toBe(1);
  expect(await db.dataProvenance.count()).toBe(7);
  expect(await db.inventoryBalance.count()).toBe(0);
  expect(
    Buffer.from(
      (
        await db.importDocument.findUniqueOrThrow({
          where: { id: document.id },
        })
      ).content,
    ),
  ).toEqual(bytes);
});
