import { it, expect } from "vitest";
import ExcelJS from "exceljs";
import { readWorkbook } from "@/import/workbookReader";
import {
  mappingSchema,
  suggestMapping,
  validateRows,
} from "@/import/validateRows";
const csv =
  'part_number,description,category,unit_of_measure,source_reference,provenance\nDEMO,"Part, one",Mechanical,each,Demo only,SYNTHETIC\n';
it("reads quoted CSV and normalizes mappings and units", async () => {
  const [s] = await readWorkbook(Buffer.from(csv), "demo.csv");
  const rows = validateRows(
    s,
    mappingSchema.parse({
      worksheet: s.name,
      catalogNamespace: "demo",
      datasetKind: "SYNTHETIC",
      classification: "ASSUMED",
      mapping: suggestMapping(s.headers),
      actor: "Reviewer",
    }),
  );
  expect(rows[0].errors).toEqual([]);
  expect(rows[0].data?.unitOfMeasure).toBe("EA");
  expect(rows[0].data?.description).toBe("Part, one");
});
it("rejects synthetic relabeling, duplicate parts and missing values", async () => {
  const [s] = await readWorkbook(
    Buffer.from(csv + "DEMO,,Mechanical,EA,Demo only,SYNTHETIC\n"),
    "demo.csv",
  );
  const rows = validateRows(
    s,
    mappingSchema.parse({
      worksheet: s.name,
      catalogNamespace: "demo",
      datasetKind: "ACTUAL",
      classification: "OBSERVED",
      mapping: suggestMapping(s.headers),
      actor: "Reviewer",
    }),
  );
  expect(rows[0].errors.join()).toContain("Synthetic");
  expect(rows[1].errors.join()).toContain("Duplicate");
  expect(rows[1].errors.join()).toContain("description");
});
it("reads multiple sheets and rejects formulas", async () => {
  const w = new ExcelJS.Workbook();
  w.addWorksheet("A").addRows([["part"], ["X"]]);
  w.addWorksheet("B").addRows([["part"], ["Y"]]);
  expect(
    await readWorkbook(Buffer.from(await w.xlsx.writeBuffer()), "test.xlsx"),
  ).toHaveLength(2);
  w.getWorksheet("A")!.getCell("A2").value = { formula: "1+1", result: 2 };
  await expect(
    readWorkbook(Buffer.from(await w.xlsx.writeBuffer()), "test.xlsx"),
  ).rejects.toThrow("Formula");
});
it("rejects invalid uploads and ambiguous headers", async () => {
  await expect(readWorkbook(Buffer.alloc(0), "a.csv")).rejects.toThrow();
  await expect(readWorkbook(Buffer.from("a,a\n1,2"), "a.csv")).rejects.toThrow(
    "unique",
  );
  await expect(readWorkbook(Buffer.from("bad"), "a.xlsx")).rejects.toThrow();
});

it('supports namespace-prefixed SpreadsheetML from alternate exporters', async () => {
  const JSZip = (await import('jszip')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Materials').addRows([['part_number'],['DEMO']]);
  const zip = await JSZip.loadAsync(await workbook.xlsx.writeBuffer());
  const entry = zip.file('xl/workbook.xml')!;
  const xml = (await entry.async('string')).replace('xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"','xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"').replace(/<(\/?)(workbook|sheets|sheet)(?=[\s>])/g,'<$1x:$2');
  zip.file('xl/workbook.xml',xml);
  const result = await readWorkbook(await zip.generateAsync({type:'nodebuffer'}),'prefixed.xlsx');
  expect(result[0].rows[0].values[0]).toBe('DEMO');
});
