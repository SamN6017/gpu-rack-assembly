import { z } from "zod";
import { materialSchema } from "@/domain/manufacturing/schemas";
import type { Sheet } from "./workbookReader";
export const fields = [
  "partNumber",
  "description",
  "category",
  "unitOfMeasure",
  "sourceReference",
  "datasetKind",
] as const;
export const normalizeHeader = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
export function suggestMapping(headers: string[]) {
  return Object.fromEntries(
    fields.map((f) => [
      f,
      headers.find(
        (h) =>
          normalizeHeader(h) === normalizeHeader(f) ||
          (f === "datasetKind" && normalizeHeader(h) === "provenance"),
      ) || "",
    ]),
  );
}
export const mappingSchema = z
  .object({
    worksheet: z.string().min(1).max(200),
    catalogNamespace: z.string().trim().min(1).max(100),
    datasetKind: z.enum(["ACTUAL", "SYNTHETIC"]),
    classification: z.enum(["OBSERVED", "DERIVED", "ASSUMED", "UNKNOWN"]),
    mapping: z.record(z.string().max(200)),
    actor: z.string().trim().min(1).max(200),
  })
  .strict();
export type Mapping = z.infer<typeof mappingSchema>;
export type ValidatedRow = {
  rowNumber: number;
  raw: Record<string, string>;
  data: z.infer<typeof materialSchema> | null;
  errors: string[];
};
export function validateRows(sheet: Sheet, options: Mapping): ValidatedRow[] {
  const seen = new Set<string>();
  const mapped = Object.values(options.mapping).filter(Boolean);
  if (
    mapped.some((h) => !sheet.headers.includes(h)) ||
    new Set(mapped).size !== mapped.length
  )
    throw new Error("Map each field to a distinct existing column");
  const aliases: Record<string, string> = {
    EACH: "EA",
    PCS: "EA",
    PIECE: "EA",
    PIECES: "EA",
    KITS: "KIT",
    METERS: "M",
    METRES: "M",
    KILOGRAMS: "KG",
    LITERS: "L",
    LITRES: "L",
  };
  return sheet.rows.map((row) => {
    const raw = Object.fromEntries(
      sheet.headers.map((h, i) => [h, row.values[i] ?? ""]),
    );
    const input: Record<string, string> = {
      catalogNamespace: options.catalogNamespace,
      datasetKind: options.datasetKind,
    };
    for (const f of fields)
      if (options.mapping[f]) input[f] = raw[options.mapping[f]].trim();
    input.unitOfMeasure = (input.unitOfMeasure || "").toUpperCase();
    input.unitOfMeasure = aliases[input.unitOfMeasure] || input.unitOfMeasure;
    // Explicit source labels cannot be overridden by an upload-level selection.
    const sourceKind = Object.entries(raw)
      .find(([h]) =>
        ["provenance", "datasetkind"].includes(normalizeHeader(h)),
      )?.[1]
      .toUpperCase();
    const errors: string[] = [];
    if (sourceKind === "SYNTHETIC" && options.datasetKind !== "SYNTHETIC")
      errors.push("Synthetic source rows cannot be imported as actual");
    if (input.datasetKind !== options.datasetKind)
      errors.push("Row dataset kind differs from the selected dataset");
    const result = materialSchema.safeParse(input);
    if (!result.success)
      errors.push(
        ...result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      );
    const key = input.partNumber;
    if (key && seen.has(key))
      errors.push("Duplicate part number within this worksheet");
    seen.add(key);
    return {
      rowNumber: row.rowNumber,
      raw,
      data: result.success ? result.data : null,
      errors,
    };
  });
}
