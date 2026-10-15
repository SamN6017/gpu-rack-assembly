import "server-only";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { handle } from "@/server/http/responses";
import {
  calculateInventoryPosition,
  evaluateBinStates,
  calculateCoverageWorkingDays,
} from "@/simulation/core/kanban";
import type {
  SimulationConfig,
  Snapshot,
  Replenishment,
} from "@/simulation/core/types";
import type { RunAnalytics } from "@/analytics/runAnalytics";

export const dynamic = "force-dynamic";

export function GET(
  request: Request,
  c: { params: Promise<{ id: string }> },
) {
  return handle(request, async () => {
    const id = z.string().uuid().parse((await c.params).id);
    const run = await getDb().simulationRun.findUniqueOrThrow({
      where: { id },
      include: { scenario: { select: { name: true, datasetKind: true } } },
    });

    const config = run.inputSnapshotJson as unknown as SimulationConfig;
    const summary = run.summaryJson as {
      final?: Snapshot;
      analytics?: RunAnalytics;
      error?: string;
    } | null;

    const final = summary?.final;
    const analytics = summary?.analytics;

    const materials = config.materials.map((m) => {
      const stock = final?.stocks.find((s) => s.id === m.id) || {
        id: m.id,
        warehouse: m.warehouse,
        warehouseReserved: 0,
        onHand: m.pointOfUse,
        reserved: 0,
        inTransit: 0,
        onOrder: 0,
        consumed: 0,
        shortages: 0,
        upstreamShortage: false,
        stockArea: 0,
        warehouseArea: 0,
        lastTime: 0,
      };

      const netPosition = calculateInventoryPosition(stock);
      const bins = evaluateBinStates(
        stock.onHand,
        m.bins,
        m.binCapacity,
        stock.onOrder,
      );
      const coverageDays = calculateCoverageWorkingDays(
        stock.onHand,
        config.dailyDemand,
        m.quantity,
      );

      return {
        id: m.id,
        partNumber: m.partNumber,
        description: m.description,
        station: m.station,
        unit: m.unit,
        quantityPerRack: m.quantity,
        binsCount: m.bins,
        binCapacity: m.binCapacity,
        reorderPoint: m.reorderPoint,
        safetyStock: m.safetyStock,
        leadMinutes: m.leadMinutes,
        sourceReference: m.sourceReference,
        warehouse: stock.warehouse,
        warehouseReserved: stock.warehouseReserved,
        onHand: stock.onHand,
        reserved: stock.reserved,
        inTransit: stock.inTransit,
        onOrder: stock.onOrder,
        consumed: stock.consumed,
        shortages: stock.shortages,
        upstreamShortage: stock.upstreamShortage,
        netPosition,
        bins,
        coverageWorkingDays: coverageDays,
        status:
          stock.onHand < m.quantity
            ? ("SHORTAGE" as const)
            : stock.onOrder > 0
              ? ("REPLENISHING" as const)
              : ("AVAILABLE" as const),
      };
    });

    const orders: Replenishment[] = final?.orders || [];

    return {
      runId: run.id,
      status: run.status,
      scenarioName: run.scenario.name,
      datasetKind: run.scenario.datasetKind,
      modelCode: config.modelCode,
      handlersCount: config.handlers,
      dailyDemand: config.dailyDemand,
      materials,
      activeOrders: orders,
      metrics: {
        totalMaterials: materials.length,
        shortageCount: materials.filter((m) => m.status === "SHORTAGE").length,
        replenishingCount: materials.filter((m) => m.status === "REPLENISHING")
          .length,
        availableCount: materials.filter((m) => m.status === "AVAILABLE").length,
        totalReplenishmentRequests: analytics?.replenishmentCount || 0,
        activeOrdersCount: orders.length,
      },
    };
  });
}
