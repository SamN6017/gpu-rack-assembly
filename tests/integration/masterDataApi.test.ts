import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { db, setupDatabase, clearDatabase } from "./databaseHarness";
import { GET, POST } from "@/app/api/materials/route";
import { GET as inventoryGET } from "@/app/api/inventory/route";
import { getDb } from "@/server/db/client";
process.env.MANUFACTURING_API_TOKEN =
  "integration-test-token-at-least-32-characters";
const headers = {
  authorization: `Bearer ${process.env.MANUFACTURING_API_TOKEN}`,
  "content-type": "application/json",
};
beforeAll(setupDatabase);
beforeEach(clearDatabase);
afterAll(async () => {
  await db.$disconnect();
  await getDb().$disconnect();
});
it("protects master data and rejects invalid input", async () => {
  expect(
    (await GET(new Request("http://localhost/api/materials"))).status,
  ).toBe(401);
  expect(
    (
      await POST(
        new Request("http://localhost/api/materials", {
          method: "POST",
          headers,
          body: "{}",
        }),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await GET(
        new Request("http://localhost/api/materials?limit=10000", { headers }),
      )
    ).status,
  ).toBe(400);
});
it("persists namespace-aware material data and returns conflict for duplicates", async () => {
  const data = {
    catalogNamespace: "api-test",
    partNumber: "PART",
    description: "Test",
    category: "test",
    unitOfMeasure: "EA",
    sourceReference: "test",
    datasetKind: "ACTUAL",
  };
  const request = () =>
    new Request("http://localhost/api/materials", {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
  expect((await POST(request())).status).toBe(201);
  expect((await POST(request())).status).toBe(409);
  const response = await GET(
    new Request("http://localhost/api/materials?limit=1", { headers }),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toHaveLength(1);
});
it("limits request sizes, reports malformed JSON and exposes inventory read-only", async () => {
  expect(
    (
      await POST(
        new Request("http://localhost/api/materials", {
          method: "POST",
          headers,
          body: "{",
        }),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await POST(
        new Request("http://localhost/api/materials", {
          method: "POST",
          headers,
          body: JSON.stringify({ value: "x".repeat(66000) }),
        }),
      )
    ).status,
  ).toBe(413);
  const response = await inventoryGET(
    new Request("http://localhost/api/inventory", { headers }),
  );
  expect(await response.json()).toEqual([]);
});
it("returns useful BOM conflict responses and validates indivisible quantities", async () => {
  const { fixture } = await import("./databaseHarness");
  const f = await fixture();
  const { POST: bomPOST } = await import("@/app/api/boms/route");
  const data = {
    rackModelId: f.model.id,
    materialId: f.material.id,
    workstationId: "00000000-0000-4000-8000-000000000001",
    quantityPerRack: "1",
    effectiveFrom: "2026-01-01T00:00:00Z",
    sourceReference: "test",
  };
  const request = (quantityPerRack = "1") =>
    new Request("http://localhost/api/boms", {
      method: "POST",
      headers,
      body: JSON.stringify({ ...data, quantityPerRack }),
    });
  expect((await bomPOST(request())).status).toBe(201);
  expect((await bomPOST(request())).status).toBe(409);
  expect((await bomPOST(request("1.5"))).status).toBe(400);
});
