import { z } from "zod";
// Decimal strings avoid floating point rounding and silent PostgreSQL truncation.
export const quantitySchema = z
  .string()
  .regex(
    /^-?(?:0|[1-9]\d{0,13})(?:\.\d{1,6})?$/,
    "Use a decimal string with at most 14 integer and 6 fractional digits",
  );
export const positiveQuantitySchema = quantitySchema.refine(
  (v) => BigInt(v.replace(".", "").replace("-", "")) > 0n && !v.startsWith("-"),
  "Quantity must be positive",
);
export function assertUnitQuantity(unit: string, value: string): void {
  if (["EA", "KIT"].includes(unit) && /\.[0-9]*[1-9]/.test(value))
    throw new RangeError("Indivisible units require a whole quantity");
}
