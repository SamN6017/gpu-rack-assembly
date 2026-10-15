import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { db, setupDatabase, clearDatabase, fixture } from "./databaseHarness";
import { createBom } from "@/server/repositories/bomRepository";
import { postInventoryEvent } from "@/server/services/inventoryService";
import {
  proposeAssumption,
  approveAssumption,
} from "@/server/services/assumptionService";
beforeAll(setupDatabase);
beforeEach(clearDatabase);
afterAll(() => db.$disconnect());
it("enforces namespace uniqueness, foreign keys and nonnegative balances", async () => {
  const f = await fixture();
  const { id, createdAt, updatedAt, ...copy } = f.material;
  await expect(db.material.create({ data: copy })).rejects.toThrow();
  await expect(
    db.material.create({ data: { ...copy, catalogNamespace: "another" } }),
  ).resolves.toBeTruthy();
  await expect(
    db.inventoryBalance.create({
      data: { materialId: id, locationId: f.source.id, quantityOnHand: -1 },
    }),
  ).rejects.toThrow();
  await expect(
    db.inventoryBalance.create({
      data: {
        materialId: id,
        locationId: f.source.id,
        quantityOnHand: 1,
        quantityReserved: 2,
      },
    }),
  ).rejects.toThrow();
  await expect(
    db.inventoryBalance.create({
      data: {
        materialId: id,
        locationId: "00000000-0000-4000-8000-999999999999",
      },
    }),
  ).rejects.toThrow();
});
it("rejects overlapping BOM intervals but allows adjacent versions", async () => {
  const f = await fixture();
  const b = {
    rackModelId: f.model.id,
    materialId: f.material.id,
    workstationId: "00000000-0000-4000-8000-000000000001",
    quantityPerRack: "2",
    effectiveFrom: "2026-01-01T00:00:00Z",
    effectiveTo: "2026-02-01T00:00:00Z",
    sourceReference: "test",
  };
  await createBom(db, b);
  await expect(createBom(db, b)).rejects.toThrow();
  await expect(
    createBom(db, { ...b, effectiveFrom: b.effectiveTo, effectiveTo: null }),
  ).resolves.toBeTruthy();
});
it("makes events immutable and material units stable once referenced", async () => {
  const f = await fixture();
  const e = await postInventoryEvent(db, f.event());
  await expect(
    db.inventoryEvent.update({ where: { id: e.id }, data: { quantity: 1 } }),
  ).rejects.toThrow();
  await expect(
    db.inventoryEvent.delete({ where: { id: e.id } }),
  ).rejects.toThrow();
  await expect(
    db.material.update({
      where: { id: f.material.id },
      data: { unitOfMeasure: "KG" },
    }),
  ).rejects.toThrow();
});
it("rejects cyclic locations and invalid Kanban capacities", async () => {
  const f = await fixture();
  await db.inventoryLocation.update({
    where: { id: f.destination.id },
    data: { parentLocationId: f.source.id },
  });
  await expect(
    db.inventoryLocation.update({
      where: { id: f.source.id },
      data: { parentLocationId: f.destination.id },
    }),
  ).rejects.toThrow();
  await expect(
    db.kanbanRule.create({
      data: {
        materialId: f.material.id,
        sourceLocationId: f.source.id,
        destinationLocationId: f.destination.id,
        numberOfBins: 2,
        unitsPerBin: 5,
        reorderPoint: 5,
        targetStock: 11,
        safetyStock: 1,
        replenishmentLeadMinutes: 60,
      },
    }),
  ).rejects.toThrow();
});
it("approval binds to reviewed content and preserves synthetic classification", async () => {
  const a = await proposeAssumption(db, {
    parameter: "Demo lead time",
    valueJson: 60,
    unit: "minutes",
    rationale: "Demo only",
    sourceReference: "fixture",
    datasetKind: "SYNTHETIC",
    version: 1,
  });
  await expect(
    approveAssumption(db, a.id, "wrong", "reviewer"),
  ).rejects.toThrow();
  const approved = await approveAssumption(db, a.id, a.contentHash, "reviewer");
  expect(approved.datasetKind).toBe("SYNTHETIC");
  await expect(
    db.dataAssumption.update({ where: { id: a.id }, data: { valueJson: 30 } }),
  ).rejects.toThrow();
});
it("freezes run inputs and enforces per-run event sequence", async () => {
  const scenario = await db.simulationScenario.create({
    data: {
      name: "Test",
      durationDays: 1,
      startDate: new Date("2026-01-01Z"),
      calendarTimezone: "UTC",
      productionScheduleJson: {},
      initialInventoryJson: {},
      kanbanOverridesJson: {},
      simulationSeed: 42,
      schemaVersion: "1",
      datasetKind: "SYNTHETIC",
    },
  });
  const run = await db.simulationRun.create({
    data: {
      scenarioId: scenario.id,
      simulatedStart: new Date("2026-01-01Z"),
      simulatedEnd: new Date("2026-01-02Z"),
      inputSnapshotJson: {},
      configurationVersion: "1",
      engineVersion: "test",
      simulationSeed: 42,
      inputHash: "test",
    },
  });
  await expect(
    db.simulationRun.update({
      where: { id: run.id },
      data: { simulationSeed: 43 },
    }),
  ).rejects.toThrow();
  const event = {
    runId: run.id,
    sequenceNumber: 1,
    virtualTimestamp: new Date("2026-01-01Z"),
    eventType: "TEST",
    payloadJson: {},
  };
  await db.simulationEvent.create({ data: event });
  await expect(db.simulationEvent.create({ data: event })).rejects.toThrow();
  expect(await db.inventoryEvent.count()).toBe(0);
});
it("enforces terminal import counts and delivered-order quantities", async () => {
  const f = await fixture();
  const source = await db.dataSource.create({
    data: { name: "Test", sourceType: "CSV", configurationJson: {} },
  });
  await expect(
    db.importBatch.create({
      data: {
        sourceId: source.id,
        filename: "test.csv",
        checksum: "test",
        status: "IMPORTED",
        rowCount: 10,
        acceptedRows: 5,
        rejectedRows: 1,
        validationReportJson: {},
        mappingVersion: "1",
        schemaVersion: "1",
      },
    }),
  ).rejects.toThrow();
  await expect(
    db.replenishmentOrder.create({
      data: {
        materialId: f.material.id,
        sourceLocationId: f.source.id,
        destinationLocationId: f.destination.id,
        idempotencyKey: "bad-delivery",
        requestedQuantity: 10,
        deliveredQuantity: 5,
        status: "DELIVERED",
        requestedAt: new Date(),
      },
    }),
  ).rejects.toThrow();
});
it("rejects synthetic operational orders and fractional each-unit balances", async () => {
  const f = await fixture();
  const model = await db.rackModel.create({
    data: { modelCode: "DEMO", modelName: "Demo", datasetKind: "SYNTHETIC" },
  });
  await expect(
    db.productionOrder.create({
      data: {
        rackModelId: model.id,
        rackSerialNumber: "DEMO-1",
        scheduledStart: new Date(),
      },
    }),
  ).rejects.toThrow();
  await expect(
    db.inventoryBalance.create({
      data: {
        materialId: f.material.id,
        locationId: f.source.id,
        quantityOnHand: "0.5",
      },
    }),
  ).rejects.toThrow();
});
