import { describe, it, expect } from "vitest";
import { generateRecommendations } from "@/reports/recommendations";
import type { RunAnalytics } from "@/analytics/runAnalytics";

function createMockAnalytics(overrides?: Record<string, unknown>): RunAnalytics {
  return {
    completed: 100,
    wip: 2,
    queued: 5,
    waiting: 1,
    consumptionTransactions: 500,
    stockoutCount: 0,
    replenishmentCount: 20,
    downtimeSeconds: 120,
    scheduledSeconds: 3600 * 8 * 20,
    throughputPerWorkingHour: 1.25,
    averageCycleMinutes: 12.0,
    bottleneckStation: "WS1",
    daily: { "2026-01-01": 5 },
    monthly: { "2026-01": 100 },
    stations: [
      {
        station: 1,
        busySeconds: 10000,
        blockedSeconds: 0,
        shortageSeconds: 0,
        equipmentSeconds: 0,
        utilization: 0.8,
      },
    ],
    materials: [
      {
        id: "MAT-01",
        partNumber: "PN-01",
        description: "GPU Module",
        unit: "EA",
        station: 1,
        opening: 100,
        warehouse: 50,
        onHand: 10,
        inTransit: 0,
        consumed: 40,
        closing: 60,
        replenishments: 5,
        stockouts: 0,
        upstreamShortage: false,
        averageWarehouse: 60,
        averagePointOfUse: 15,
        coverageWorkingDays: 20,
      },
    ],
    ...overrides,
  } as unknown as RunAnalytics;
}

describe("Evidence-Based Recommendations Engine", () => {
  it("recommends supply chain review when upstream warehouse is depleted", () => {
    const analytics = createMockAnalytics({
      stockoutCount: 3,
      materials: [
        {
          id: "MAT-01",
          partNumber: "PN-01",
          description: "GPU Module",
          unit: "EA",
          station: 1,
          opening: 100,
          warehouse: 0,
          onHand: 0,
          inTransit: 0,
          consumed: 100,
          closing: 0,
          replenishments: 5,
          stockouts: 3,
          upstreamShortage: true,
          averageWarehouse: 10,
          averagePointOfUse: 2,
          coverageWorkingDays: 0,
        },
      ],
    });

    const recs = generateRecommendations(analytics);
    expect(recs.some((r) => r.category === "SUPPLY_CHAIN")).toBe(true);
    const supplyRec = recs.find((r) => r.category === "SUPPLY_CHAIN");
    expect(supplyRec?.suggestedAction).toContain("Review external supplier replenishment");
    expect(supplyRec?.impact).toBe("HIGH");
  });

  it("recommends Kanban parameter tuning when stockouts happen with warehouse stock present", () => {
    const analytics = createMockAnalytics({
      stockoutCount: 2,
      materials: [
        {
          id: "MAT-02",
          partNumber: "PN-02",
          description: "NVLink Bridge",
          unit: "EA",
          station: 2,
          opening: 200,
          warehouse: 150,
          onHand: 0,
          inTransit: 20,
          consumed: 50,
          closing: 150,
          replenishments: 8,
          stockouts: 2,
          upstreamShortage: false,
          averageWarehouse: 160,
          averagePointOfUse: 5,
          coverageWorkingDays: 15,
        },
      ],
    });

    const recs = generateRecommendations(analytics);
    expect(recs.some((r) => r.category === "KANBAN_TUNING")).toBe(true);
    const kanbanRec = recs.find((r) => r.category === "KANBAN_TUNING");
    expect(kanbanRec?.suggestedAction).toContain("Evaluate increasing safety stock");
    expect(kanbanRec?.impact).toBe("HIGH");
  });

  it("identifies station material starvation bottleneck when material wait exceeds threshold", () => {
    const analytics = createMockAnalytics({
      stations: [
        {
          station: 2,
          busySeconds: 5000,
          blockedSeconds: 0,
          shortageSeconds: 3600, // 1 hour starvation
          equipmentSeconds: 0,
          utilization: 0.5,
        },
      ],
    });

    const recs = generateRecommendations(analytics);
    const starveRec = recs.find(
      (r) => r.category === "BOTTLENECK" && r.evidence.includes("starvation"),
    );
    expect(starveRec).toBeDefined();
    expect(starveRec?.suggestedAction).toContain("Prioritize material handler dispatch");
  });

  it("recommends Lean right-sizing for high excess coverage with zero stockouts", () => {
    const analytics = createMockAnalytics({
      materials: [
        {
          id: "MAT-03",
          partNumber: "PN-03",
          description: "M4 Chassis Screws",
          unit: "EA",
          station: 1,
          opening: 5000,
          warehouse: 4000,
          onHand: 800,
          inTransit: 0,
          consumed: 200,
          closing: 4800,
          replenishments: 2,
          stockouts: 0,
          upstreamShortage: false,
          averageWarehouse: 4500,
          averagePointOfUse: 750,
          coverageWorkingDays: 65, // > 40 days
        },
      ],
    });

    const recs = generateRecommendations(analytics);
    const leanRec = recs.find((r) => r.category === "INVENTORY_RIGHTSIZING");
    expect(leanRec).toBeDefined();
    expect(leanRec?.suggestedAction).toContain("right-sizing reorder points");
  });

  it("provides positive confirmation when production flow is optimal", () => {
    const analytics = createMockAnalytics();
    const recs = generateRecommendations(analytics);
    expect(recs.length).toBe(1);
    expect(recs[0].evidence).toContain("Smooth flow observed");
  });
});
