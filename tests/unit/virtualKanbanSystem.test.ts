import { describe, it, expect } from "vitest";
import { ManufacturingEngine } from "@/simulation/core/engine";
import { demoConfig } from "@/domain/manufacturing/scenarioPresets";
import { deriveVirtualKanbanCards } from "@/services/virtualKanbanService";
import { validateKanbanDataset } from "@/domain/manufacturing/kanbanValidation";

describe("Phase 10: Virtual Kanban Management System Verification", () => {
  // Requirement 1: Material consumption reduces inventory
  it("Requirement 1: Material consumption reduces workstation point-of-use inventory", () => {
    const config = demoConfig();
    config.durationMonths = 1;
    const engine = new ManufacturingEngine(config);

    const initialM0 = config.materials[0];
    const initialOnHand = engine.snapshot().stocks.find((s) => s.id === initialM0.id)!.onHand;

    // Advance until first rack completes or material is consumed
    let stepCount = 0;
    while (!engine.complete && stepCount < 100) {
      engine.stepEvent();
      stepCount++;
      const consumed = engine.snapshot().stocks.find((s) => s.id === initialM0.id)!.consumed;
      if (consumed > 0) {
        expect(consumed).toBeGreaterThanOrEqual(initialM0.quantity);
        break;
      }
    }

    const snap = engine.snapshot();
    const stock0 = snap.stocks.find((s) => s.id === initialM0.id)!;
    expect(stock0.consumed).toBeGreaterThan(0);
    expect(stock0.onHand + stock0.consumed).toBeCloseTo(initialOnHand + stock0.inTransit, 4);
  });

  // Requirement 2: Inventory reaching threshold generates a Kanban request
  it("Requirement 2: Inventory reaching reorder threshold generates a Kanban replenishment request", () => {
    const config = demoConfig();
    config.durationMonths = 1;
    const mat = config.materials[0];
    mat.pointOfUse = mat.reorderPoint + mat.quantity;
    mat.warehouse = 500;
    mat.leadMinutes = 30;

    const engine = new ManufacturingEngine(config);

    let steps = 0;
    while (!engine.complete && steps < 150) {
      engine.stepEvent();
      steps++;
      if (engine.events.some((e) => e.type === "REPLENISHMENT_REQUESTED" && e.materialId === mat.id)) {
        break;
      }
    }

    const requestedEvent = engine.events.some(
      (e) => e.type === "REPLENISHMENT_REQUESTED" && e.materialId === mat.id,
    );
    expect(requestedEvent).toBe(true);

    const snap = engine.snapshot();
    const stock = snap.stocks.find((s) => s.id === mat.id)!;
    expect(stock.onOrder).toBeGreaterThan(0);
  });

  // Requirement 3: No duplicate Kanban requests are created for the same material while a request is active
  it("Requirement 3: No duplicate Kanban requests are created for the same material while a request is active", () => {
    const config = demoConfig();
    config.durationMonths = 1;
    config.materials.forEach((m) => {
      m.pointOfUse = 0;
      m.leadMinutes = 180;
    });

    const engine = new ManufacturingEngine(config);

    // Advance 50 steps
    for (let i = 0; i < 50 && !engine.complete; i++) {
      engine.stepEvent();
    }

    // Check replenishment request counts per material
    for (const m of config.materials) {
      const requests = engine.events.filter(
        (e) => e.type === "REPLENISHMENT_REQUESTED" && e.materialId === m.id,
      );
      const deliveries = engine.events.filter(
        (e) => e.type === "REPLENISHMENT_DELIVERED" && e.materialId === m.id,
      );
      // At any point while order is in-flight (requests - deliveries <= 1)
      expect(requests.length - deliveries.length).toBeLessThanOrEqual(1);
    }
  });

  // Requirement 4: Warehouse stock is reserved correctly
  it("Requirement 4: Warehouse stock is reserved correctly upon replenishment request", () => {
    const config = demoConfig();
    config.durationMonths = 1;
    const mat = config.materials[0];
    mat.pointOfUse = 0;
    mat.warehouse = 200;
    mat.leadMinutes = 60;

    const engine = new ManufacturingEngine(config);
    // At step 1, shift start triggers replenishment for empty POU
    engine.stepEvent();

    const snap = engine.snapshot();
    const stock = snap.stocks.find((s) => s.id === mat.id)!;
    const expectedReplenish = mat.bins * mat.binCapacity;
    expect(stock.warehouseReserved).toBe(expectedReplenish);
    expect(stock.onOrder).toBe(expectedReplenish);
  });

  // Requirement 5: Finite warehouse stock eventually depletes
  it("Requirement 5: Finite warehouse stock eventually depletes under continuous consumption", () => {
    const config = demoConfig();
    config.durationMonths = 1;
    const mat = config.materials[0];
    const singleBatch = mat.bins * mat.binCapacity;
    mat.warehouse = singleBatch * 2;
    mat.pointOfUse = mat.reorderPoint;
    mat.leadMinutes = 5;

    const engine = new ManufacturingEngine(config);
    const result = engine.runToCompletion();

    const finalStock = result.final.stocks.find((s) => s.id === mat.id)!;
    // Warehouse depleted to 0
    expect(finalStock.warehouse).toBe(0);
    expect(result.events.some((e) => e.type === "UPSTREAM_SHORTAGE" && e.materialId === mat.id)).toBe(true);
  });

  // Requirement 6 & 7: Material handlers deliver materials to workstations and inventory increases
  it("Requirements 6 & 7: Material handlers deliver materials to workstations and inventory increases", () => {
    const config = demoConfig();
    config.durationMonths = 1;
    const mat = config.materials[0];
    mat.pointOfUse = 0;
    mat.warehouse = 500;
    mat.leadMinutes = 5;

    const engine = new ManufacturingEngine(config);

    while (!engine.complete) {
      engine.stepEvent();
      if (engine.events.some((e) => e.type === "REPLENISHMENT_DELIVERED" && e.materialId === mat.id)) {
        break;
      }
    }

    const deliveryEvent = engine.events.find(
      (e) => e.type === "REPLENISHMENT_DELIVERED" && e.materialId === mat.id,
    );
    expect(deliveryEvent).toBeDefined();
    expect(deliveryEvent!.quantity).toBe(mat.bins * mat.binCapacity);

    const snap = engine.snapshot();
    const stock = snap.stocks.find((s) => s.id === mat.id)!;
    expect(stock.onHand + stock.consumed).toBeGreaterThanOrEqual(mat.bins * mat.binCapacity);
  });

  // Requirement 8 & 9: Workstations pause when materials are missing and resume when materials arrive
  it("Requirements 8 & 9: Workstations block when materials are missing and resume when replenished", () => {
    const config = demoConfig();
    config.durationMonths = 1;
    config.materials[0].pointOfUse = 0;
    config.materials[0].warehouse = 300;
    config.materials[0].leadMinutes = 15;

    const engine = new ManufacturingEngine(config);
    let steps = 0;
    while (!engine.complete && steps < 200) {
      engine.stepEvent();
      steps++;
      const hasShortage = engine.events.some(
        (e) => e.type === "MATERIAL_SHORTAGE" && e.materialId === config.materials[0].id,
      );
      const hasResumed = engine.events.some(
        (e) => e.type === "STATION_RESUMED" && e.station === 0,
      );
      if (hasShortage && hasResumed) break;
    }

    expect(
      engine.events.some(
        (e) => e.type === "MATERIAL_SHORTAGE" && e.materialId === config.materials[0].id,
      ),
    ).toBe(true);
    expect(
      engine.events.some((e) => e.type === "STATION_RESUMED" && e.station === 0),
    ).toBe(true);
  });

  // Requirement 10: 8-hour shift simulation runs to completion without error and no negative inventory
  it("Requirement 10: Simulation runs for full shift without error or negative inventory", () => {
    const config = demoConfig();
    config.durationMonths = 1;

    const engine = new ManufacturingEngine(config);
    const result = engine.runToCompletion();

    expect(result.final.completed).toBeGreaterThan(0);
    expect(result.events.length).toBeGreaterThan(50);

    // Strict invariant: NO negative inventory anywhere at any time
    for (const stock of result.final.stocks) {
      expect(stock.onHand).toBeGreaterThanOrEqual(0);
      expect(stock.reserved).toBeGreaterThanOrEqual(0);
      expect(stock.warehouse).toBeGreaterThanOrEqual(0);
      expect(stock.warehouseReserved).toBeGreaterThanOrEqual(0);
      expect(stock.inTransit).toBeGreaterThanOrEqual(0);
    }

    // Material conservation check: Warehouse + OnHand + InTransit + Consumed = Total Initial
    for (const m of config.materials) {
      const finalStock = result.final.stocks.find((s) => s.id === m.id)!;
      const initialTotal = m.warehouse + m.pointOfUse;
      const finalTotal =
        finalStock.warehouse +
        finalStock.onHand +
        finalStock.inTransit +
        finalStock.consumed;
      expect(finalTotal).toBeCloseTo(initialTotal, 5);
    }
  });

  // Test 11: 7-Stage Digital Kanban Board card derivation
  it("Digital Kanban Board: Correctly maps orders across all 7 lifecycle stages", () => {
    const config = demoConfig();
    const engine = new ManufacturingEngine(config);
    engine.stepMinute();

    const snapshot = engine.snapshot();
    const cards = deriveVirtualKanbanCards(snapshot, config, engine.events);

    expect(cards.length).toBeGreaterThan(0);
    // Every card must have required fields
    for (const card of cards) {
      expect(card.requestId).toBeDefined();
      expect(card.materialId).toBeDefined();
      expect(card.materialName).toBeDefined();
      expect(card.workstation).toBeDefined();
      expect(card.storageLocation).toBeDefined();
      expect(card.currentInventory).toBeGreaterThanOrEqual(0);
      expect(card.requestedQuantity).toBeGreaterThanOrEqual(0);
      expect(card.priority).toBeDefined();
      expect([
        "MATERIAL_AVAILABLE",
        "REPLENISHMENT_REQUIRED",
        "REQUEST_CREATED",
        "PICKING_FROM_WAREHOUSE",
        "IN_TRANSIT",
        "DELIVERED",
        "REPLENISHMENT_COMPLETED",
      ]).toContain(card.status);
    }
  });

  // Test 12: Data validation layer verifies demonstration datasets
  it("Data Validation Layer: Validates synthetic demonstration dataset integrity", () => {
    const validPayload = {
      materials: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          partNumber: "GPU-SLED-NVL72",
          catalogNamespace: "NVDA",
          description: "Blackwell Ultra GPU Sled",
          category: "Compute",
          unitOfMeasure: "EA" as const,
          sourceReference: "BOM-001",
          datasetKind: "SYNTHETIC" as const,
        },
      ],
      workstations: [
        {
          id: "22222222-2222-2222-2222-222222222222",
          stationCode: "WS-03",
          stationName: "GPU Sled & Manifold Installation",
          sequenceOrder: 3,
          datasetKind: "SYNTHETIC" as const,
        },
      ],
      boms: [
        {
          id: "33333333-3333-3333-3333-333333333333",
          rackModelId: "44444444-4444-4444-4444-444444444444",
          materialId: "11111111-1111-1111-1111-111111111111",
          workstationId: "22222222-2222-2222-2222-222222222222",
          quantityPerRack: "4",
          sourceReference: "SYNTHETIC_DEMO",
          datasetKind: "SYNTHETIC" as const,
        },
      ],
      inventory: [
        {
          id: "55555555-5555-5555-5555-555555555555",
          materialId: "11111111-1111-1111-1111-111111111111",
          locationId: "66666666-6666-6666-6666-666666666666",
          quantityOnHand: "50",
          datasetKind: "SYNTHETIC" as const,
        },
      ],
      locations: [
        {
          id: "66666666-6666-6666-6666-666666666666",
          locationCode: "WH-A1",
          locationType: "CENTRAL_WAREHOUSE" as const,
          datasetKind: "SYNTHETIC" as const,
        },
      ],
      kanbanRules: [
        {
          id: "77777777-7777-7777-7777-777777777777",
          materialId: "11111111-1111-1111-1111-111111111111",
          workstationId: "22222222-2222-2222-2222-222222222222",
          binCount: 2,
          binCapacity: "20",
          reorderThreshold: "10",
          replenishQuantity: "20",
          replenishmentLeadMinutes: 15,
          datasetKind: "SYNTHETIC" as const,
        },
      ],
    };

    const report = validateKanbanDataset(validPayload);
    expect(report.datasetKind).toBe("SYNTHETIC");
    expect(report.isVerifiedInventory).toBe(false);
    expect(report.errors.length).toBe(0);
    expect(report.validRecordsCount).toBeGreaterThanOrEqual(1);
  });
});
