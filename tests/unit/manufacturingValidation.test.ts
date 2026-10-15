import { describe, expect, it } from "vitest";
import {
  materialSchema,
  bomSchema,
  inventoryEventSchema,
  paginationSchema,
} from "@/domain/manufacturing/schemas";
import {
  assertUnitQuantity,
  quantitySchema,
} from "@/domain/manufacturing/quantities";
import { contentHash } from "@/server/services/contentHash";
const id = "00000000-0000-4000-8000-000000000001";
describe("manufacturing boundary validation", () => {
  it("requires provenance and namespace rather than inventing defaults", () => {
    expect(materialSchema.safeParse({ partNumber: "P1" }).success).toBe(false);
  });
  it.each([
    "NaN",
    "Infinity",
    "1e3",
    "0.0000001",
    "100000000000000",
    "",
    "1,000",
  ])("rejects unsafe quantity %s", (v) =>
    expect(quantitySchema.safeParse(v).success).toBe(false),
  );
  it("preserves decimal precision and distinguishes indivisible units", () => {
    expect(quantitySchema.parse("0.000001")).toBe("0.000001");
    expect(() => assertUnitQuantity("EA", "1.1")).toThrow();
    expect(() => assertUnitQuantity("KG", "1.1")).not.toThrow();
  });
  it("validates BOM quantity and effective interval", () => {
    expect(
      bomSchema.safeParse({
        rackModelId: id,
        materialId: id,
        workstationId: id,
        quantityPerRack: "1",
        effectiveFrom: "2026-01-02T00:00:00Z",
        effectiveTo: "2026-01-01T00:00:00Z",
        sourceReference: "test",
      }).success,
    ).toBe(false);
  });
  it("requires consumption reservations and adjustment reasons", () => {
    const base = {
      materialId: id,
      quantity: "1",
      occurredAt: "2026-01-01T00:00:00Z",
      sourceSystem: "test",
      externalEventId: "1",
      correlationId: "test",
      sourceReference: "test",
    };
    expect(
      inventoryEventSchema.safeParse({
        ...base,
        eventType: "CONSUMPTION",
        sourceLocationId: id,
      }).success,
    ).toBe(false);
    expect(
      inventoryEventSchema.safeParse({
        ...base,
        eventType: "ADJUSTMENT",
        destinationLocationId: id,
      }).success,
    ).toBe(false);
  });
  it("bounds pagination and rejects unknown query options", () => {
    expect(paginationSchema.safeParse({ limit: "101" }).success).toBe(false);
    expect(paginationSchema.safeParse({ secret: "x" }).success).toBe(false);
  });
  it("hashes key order independently but detects changed input", () => {
    expect(contentHash({ a: 1, b: 2 })).toBe(contentHash({ b: 2, a: 1 }));
    expect(contentHash({ a: 1 })).not.toBe(contentHash({ a: 2 }));
  });
});
