import type { RunAnalytics } from "@/analytics/runAnalytics";
import type { SimulationConfig } from "@/simulation/core/types";
import { generateRecommendations } from "./recommendations";
import { safeCell } from "./exportSafety";

export type ReportInput = {
  name: string;
  runId: string;
  start: string;
  end: string;
  engineVersion: string;
  inputHash: string;
  config: SimulationConfig;
  analytics: RunAnalytics;
};

export type Section = {
  title: string;
  headers: string[];
  rows: (string | number)[][];
};

export function reportSections(r: ReportInput): Section[] {
  const a = r.analytics;
  const recommendations = generateRecommendations(a);

  return [
    {
      title: "SIMULATED RESULTS — Executive summary",
      headers: ["Metric", "Value"],
      rows: [
        ["Scenario", r.name],
        ["Run ID", r.runId],
        ["Start (UTC)", r.start],
        ["End exclusive (UTC)", r.end],
        ["Dataset", r.config.datasetKind],
        ["Completed racks", a.completed],
        ["WIP racks", a.wip],
        ["Queued racks", a.queued],
        ["Waiting for materials", a.waiting],
        ["Consumption transactions", a.consumptionTransactions],
        ["Stockout episodes", a.stockoutCount],
        ["Replenishment requests", a.replenishmentCount],
        ["Downtime (station hours)", Number((a.downtimeSeconds / 3600).toFixed(2))],
        ["Throughput (racks / working hour)", Number(a.throughputPerWorkingHour.toFixed(2))],
        ["Average cycle (minutes)", Number(a.averageCycleMinutes.toFixed(1))],
      ],
    },
    {
      title: "Monthly production",
      headers: ["Month (UTC)", "Completed racks"],
      rows: Object.entries(a.monthly).map(([month, count]) => [month, count]),
    },
    {
      title: "Station analysis",
      headers: [
        "Station",
        "Utilization %",
        "Busy hours",
        "Blocked hours",
        "Material wait hours",
        "Equipment hours",
      ],
      rows: a.stations.map((s) => [
        s.station,
        Number((s.utilization * 100).toFixed(1)),
        Number((s.busySeconds / 3600).toFixed(2)),
        Number((s.blockedSeconds / 3600).toFixed(2)),
        Number((s.shortageSeconds / 3600).toFixed(2)),
        Number((s.equipmentSeconds / 3600).toFixed(2)),
      ]),
    },
    {
      title: "Inventory reconciliation",
      headers: [
        "Part",
        "Unit",
        "Opening total",
        "Opening warehouse",
        "Opening POU",
        "Transferred to POU",
        "Consumed",
        "Closing warehouse",
        "Closing POU",
        "In transit",
        "Closing total",
        "Average POU",
        "Average warehouse",
      ],
      rows: a.materials.map((m) => {
        const opening = r.config.materials.find((x) => x.id === m.id)!;
        const transferred = opening.warehouse - m.warehouse - m.inTransit;
        return [
          m.partNumber,
          m.unit,
          m.opening,
          opening.warehouse,
          opening.pointOfUse,
          transferred,
          m.consumed,
          m.warehouse,
          m.onHand,
          m.inTransit,
          m.closing,
          Number(m.averagePointOfUse.toFixed(1)),
          Number(m.averageWarehouse.toFixed(1)),
        ];
      }),
    },
    {
      title: "Kanban analysis",
      headers: [
        "Part",
        "Requests",
        "Stockouts",
        "Lead minutes (configured)",
        "On order",
        "Reorder point",
        "Capacity",
        "Coverage (working days)",
      ],
      rows: a.materials.map((m) => [
        m.partNumber,
        m.replenishments,
        m.stockouts,
        m.leadMinutes,
        m.onOrder,
        m.reorderPoint,
        m.bins * m.binCapacity,
        m.coverageWorkingDays !== null
          ? Number(m.coverageWorkingDays.toFixed(1))
          : "No demand",
      ]),
    },
    {
      title: "Recommendations",
      headers: ["Category", "Evidence", "Suggested investigation", "Priority"],
      rows: recommendations.map((rec) => [
        rec.category,
        rec.evidence,
        rec.suggestedAction,
        rec.impact,
      ]),
    },
    {
      title: "Data quality and assumptions",
      headers: ["Type", "Details"],
      rows: [
        ...r.config.sourceReferences.map((s) => ["Source", s]),
        ...r.config.assumptions.map((s) => ["Assumption", s]),
        ["Limitation", "Results are simulated, not actual historical factory performance."],
        [
          "Limitation",
          "Fixed processing and transport times; UTC calendar; no holidays unless encoded in configuration.",
        ],
        ["Limitation", "Materials are consumed at station start; incomplete WIP consumption is included."],
        ["Engine", r.engineVersion],
        ["Seed", r.config.seed],
        ["Input SHA-256", r.inputHash],
        ["Configuration", JSON.stringify(r.config)],
      ],
    },
  ];
}

export { safeCell };
export { csvReport } from "./csvReport";
