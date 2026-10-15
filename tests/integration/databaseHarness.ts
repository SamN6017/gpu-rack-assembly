import "dotenv/config";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { seedFoundation } from "@/server/services/seedService";
import { randomUUID } from "node:crypto";
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl)
  throw new Error(
    "TEST_DATABASE_URL is required; integration tests never fall back to DATABASE_URL",
  );
const target = new URL(testUrl);
if (
  !["127.0.0.1", "localhost", "[::1]"].includes(target.hostname) ||
  !/^\/[a-zA-Z0-9_]+_test$/.test(target.pathname)
)
  throw new Error(
    "Integration tests require a localhost database ending in _test",
  );
if (
  process.env.DATABASE_URL &&
  new URL(process.env.DATABASE_URL).pathname === target.pathname
)
  throw new Error("Development and test databases must be separate");
process.env.DATABASE_URL = testUrl;
export const db = new PrismaClient({ datasourceUrl: testUrl });
export async function setupDatabase() {
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { env: { ...process.env, DATABASE_URL: testUrl }, stdio: "pipe" },
  );
}
export async function clearDatabase() {
  // Fixed allowlist; called only after the URL guard, in this dedicated test DB.
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "InventoryEvent", "InventoryReservation", "InventoryBalance", "ReplenishmentOrder", "KanbanRule", "ProductionOrder", "SimulationEvent", "SimulationRun", "SimulationScenario", "BillOfMaterial", "Material", "RackModel", "InventoryLocation", "DataProvenance", "ImportBatch", "DataSource", "DataAssumption", "Workstation" RESTART IDENTITY CASCADE',
  );
}
export async function fixture() {
  await seedFoundation(db);
  const material = await db.material.create({
    data: {
      catalogNamespace: "test",
      partNumber: randomUUID(),
      description: "Test only",
      category: "test",
      unitOfMeasure: "EA",
      sourceReference: "integration fixture",
      datasetKind: "ACTUAL",
    },
  });
  const source = await db.inventoryLocation.create({
    data: {
      code: randomUUID(),
      name: "Test warehouse",
      locationType: "WAREHOUSE",
    },
  });
  const destination = await db.inventoryLocation.create({
    data: {
      code: randomUUID(),
      name: "Test station",
      locationType: "POINT_OF_USE",
    },
  });
  const model = await db.rackModel.create({
    data: {
      modelCode: randomUUID(),
      modelName: "Test model",
      datasetKind: "ACTUAL",
    },
  });
  const order = await db.productionOrder.create({
    data: {
      rackModelId: model.id,
      rackSerialNumber: randomUUID(),
      scheduledStart: new Date("2026-01-01T00:00:00Z"),
    },
  });
  const event = (extra: Record<string, unknown> = {}) => ({
    materialId: material.id,
    destinationLocationId: source.id,
    eventType: "RECEIPT",
    quantity: "10",
    occurredAt: "2026-01-01T00:00:00Z",
    sourceSystem: "integration-test",
    externalEventId: randomUUID(),
    correlationId: "test",
    sourceReference: "test",
    ...extra,
  });
  return { material, source, destination, model, order, event };
}
