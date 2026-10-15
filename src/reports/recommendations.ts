import type { RunAnalytics } from "@/analytics/runAnalytics";

export interface Recommendation {
  category: "SUPPLY_CHAIN" | "KANBAN_TUNING" | "BOTTLENECK" | "INVENTORY_RIGHTSIZING";
  evidence: string;
  suggestedAction: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
}

/**
 * Generates evidence-based operational recommendations from simulation analytics.
 */
export function generateRecommendations(analytics: RunAnalytics): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // 1. Upstream warehouse exhaustion vs Point-of-Use replenishment tuning
  for (const m of analytics.materials) {
    if (m.upstreamShortage) {
      recommendations.push({
        category: "SUPPLY_CHAIN",
        evidence: `${m.partNumber} (${m.description}): ${m.stockouts} stockout episodes with upstream warehouse stock depleted.`,
        suggestedAction:
          "Review external supplier replenishment schedules and opening warehouse stock. Increasing Kanban bin capacity alone cannot resolve finite upstream source exhaustion.",
        impact: "HIGH",
      });
    } else if (m.stockouts > 0) {
      recommendations.push({
        category: "KANBAN_TUNING",
        evidence: `${m.partNumber} (${m.description}): ${m.stockouts} stockout episodes while warehouse stock remained available.`,
        suggestedAction:
          "Evaluate increasing safety stock, adding an extra Kanban bin, or reducing handler transit/replenishment lead time. Compare this adjusted scenario against baseline to verify stockout mitigation.",
        impact: "HIGH",
      });
    }
  }

  // 2. Workstation Starvation / Material Wait
  const starvedStations = analytics.stations
    .filter((s) => s.shortageSeconds > 1800) // > 30 minutes of material wait
    .sort((a, b) => b.shortageSeconds - a.shortageSeconds);

  for (const s of starvedStations) {
    recommendations.push({
      category: "BOTTLENECK",
      evidence: `Station ${s.station} accumulated ${(s.shortageSeconds / 3600).toFixed(1)} hours of material starvation downtime.`,
      suggestedAction:
        "Prioritize material handler dispatch or increase buffer stock for components consumed at this station to eliminate line starvation.",
      impact: "HIGH",
    });
  }

  // 3. Workstation Bottleneck & Blocking
  const blockedStations = analytics.stations
    .filter((s) => s.blockedSeconds > 1800)
    .sort((a, b) => b.blockedSeconds - a.blockedSeconds);

  for (const s of blockedStations) {
    recommendations.push({
      category: "BOTTLENECK",
      evidence: `Station ${s.station} experienced ${(s.blockedSeconds / 3600).toFixed(1)} hours of downstream blockage.`,
      suggestedAction:
        "Downstream workstations are operating slower than this station. Review cycle times at subsequent stations or implement an intermediate buffer to balance line throughput.",
      impact: "MEDIUM",
    });
  }

  // 4. Excess Coverage / Lean Right-sizing
  const excessMaterials = analytics.materials.filter(
    (m) =>
      m.stockouts === 0 &&
      m.coverageWorkingDays !== null &&
      m.coverageWorkingDays > 40 &&
      m.consumed > 0,
  );

  for (const m of excessMaterials) {
    recommendations.push({
      category: "INVENTORY_RIGHTSIZING",
      evidence: `${m.partNumber}: Zero stockouts with ${m.coverageWorkingDays?.toFixed(1)} working days of forward inventory coverage.`,
      suggestedAction:
        "Consider right-sizing reorder points or bin sizes to reduce working capital and floor footprint without compromising availability.",
      impact: "LOW",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      category: "KANBAN_TUNING",
      evidence: "Smooth flow observed with zero stockouts and balanced line utilization.",
      suggestedAction:
        "Maintain current Kanban thresholds. Consider running an increased-demand sensitivity scenario to identify future operational limits.",
      impact: "LOW",
    });
  }

  return recommendations;
}
