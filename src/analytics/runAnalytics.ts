import { SimulationResult } from "@/simulation/core/types";
import { workingSeconds } from "@/simulation/core/calendar";
export function runAnalytics(result: SimulationResult) {
  const { config, events, final } = result;
  const daily: Record<string, number> = {},
    monthly: Record<string, number> = {},
    replenishments: Record<string, number> = {},
    shortages: Record<string, number> = {};
  for (const event of events) {
    const date = new Date(event.time).toISOString();
    if (event.type === "RACK_COMPLETED") {
      daily[date.slice(0, 10)] = (daily[date.slice(0, 10)] || 0) + 1;
      monthly[date.slice(0, 7)] = (monthly[date.slice(0, 7)] || 0) + 1;
    }
    if (event.type === "REPLENISHMENT_REQUESTED" && event.materialId)
      replenishments[event.materialId] =
        (replenishments[event.materialId] || 0) + 1;
    if (event.type === "MATERIAL_SHORTAGE" && event.materialId)
      shortages[event.materialId] = (shortages[event.materialId] || 0) + 1;
  }
  const start = Date.parse(config.startDate),
    elapsed = (final.time - start) / 1000,
    scheduled = workingSeconds(start, final.time, config);
  const stations = config.cycleSeconds.map((_, station) => ({
    station: station + 1,
    busySeconds: final.busySeconds[station],
    blockedSeconds: final.blockedSeconds[station],
    shortageSeconds: final.shortageSeconds[station],
    equipmentSeconds:
      scheduled - workingSeconds(start, final.time, config, station),
    utilization: scheduled ? final.busySeconds[station] / scheduled : 0,
  }));
  const materials = config.materials.map((m) => {
    const stock = final.stocks.find((s) => s.id === m.id)!;
    const opening = m.warehouse + m.pointOfUse;
    return {
      ...m,
      ...stock,
      opening,
      closing: stock.warehouse + stock.onHand + stock.inTransit,
      averagePointOfUse: elapsed ? stock.stockArea / elapsed : m.pointOfUse,
      averageWarehouse: elapsed ? stock.warehouseArea / elapsed : m.warehouse,
      coverageWorkingDays: config.dailyDemand
        ? stock.onHand / (config.dailyDemand * m.quantity)
        : null,
      utilization: opening ? stock.consumed / opening : 0,
      replenishments: replenishments[m.id] || 0,
      stockouts: shortages[m.id] || 0,
    };
  });
  return {
    daily,
    monthly,
    materials,
    stations,
    completed: final.completed,
    wip: final.stations.filter(Boolean).length,
    queued: final.queued,
    waiting: final.waiting,
    consumptionTransactions: events.filter(
      (e) => e.type === "MATERIAL_CONSUMED",
    ).length,
    stockoutCount: Object.values(shortages).reduce((a, b) => a + b, 0),
    replenishmentCount: Object.values(replenishments).reduce(
      (a, b) => a + b,
      0,
    ),
    throughputPerWorkingHour: scheduled
      ? final.completed / (scheduled / 3600)
      : 0,
    averageCycleMinutes: final.completed
      ? final.completedCycleSeconds / final.completed / 60
      : 0,
    downtimeSeconds: stations.reduce(
      (a, s) => a + s.blockedSeconds + s.shortageSeconds + s.equipmentSeconds,
      0,
    ),
    scheduledSeconds: scheduled,
  };
}
export type RunAnalytics = ReturnType<typeof runAnalytics>;
