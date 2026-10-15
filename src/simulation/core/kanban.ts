export interface StockPosition {
  onHand: number;
  onOrder: number;
  reserved: number;
}

export interface ReorderThresholds {
  reorderPoint: number;
  safetyStock: number;
}

export interface BinState {
  binIndex: number;
  quantity: number;
  capacity: number;
  status: "FULL" | "ACTIVE" | "REPLENISHING" | "EMPTY";
}

export function round(value: number, decimals: number = 6): number {
  return Number(Math.round(Number(value + "e" + decimals)) + "e-" + decimals);
}

/**
 * Calculates net inventory position: (On-hand + On-order) - Reserved
 * Net inventory position subtracts outstanding allocated demand.
 */
export function calculateInventoryPosition(stock: StockPosition): number {
  return round(stock.onHand + stock.onOrder - stock.reserved);
}

/**
 * Determines if replenishment should trigger based on reorder threshold and single-order guard.
 * Prevents duplicate orders if replenishment is already in flight (onOrder > 0).
 */
export function shouldReorder(
  stock: StockPosition,
  thresholds: ReorderThresholds,
): boolean {
  if (stock.onOrder > 0) return false;
  const position = calculateInventoryPosition(stock);
  const triggerPoint = Math.max(thresholds.reorderPoint, thresholds.safetyStock);
  return position <= triggerPoint;
}

/**
 * Calculates the required replenishment quantity up to target bin capacity,
 * bounded by available warehouse stock.
 */
export function calculateReplenishmentQuantity(
  position: number,
  bins: number,
  binCapacity: number,
  availableWarehouse: number,
): number {
  const targetStock = round(bins * binCapacity);
  const need = round(targetStock - position);
  if (need <= 0 || availableWarehouse <= 0) return 0;
  return Math.min(need, availableWarehouse);
}

/**
 * Evaluates the status of physical point-of-use bins.
 * Each bin holds up to binCapacity. Bins are consumed sequentially.
 */
export function evaluateBinStates(
  onHand: number,
  bins: number,
  binCapacity: number,
  onOrder: number = 0,
): BinState[] {
  const result: BinState[] = [];
  for (let i = 0; i < bins; i++) {
    const quantity = Math.max(0, Math.min(binCapacity, onHand - i * binCapacity));
    let status: BinState["status"];
    if (quantity === binCapacity) {
      status = "FULL";
    } else if (quantity > 0) {
      status = "ACTIVE";
    } else if (onOrder > 0) {
      status = "REPLENISHING";
    } else {
      status = "EMPTY";
    }
    result.push({
      binIndex: i + 1,
      quantity,
      capacity: binCapacity,
      status,
    });
  }
  return result;
}

/**
 * Calculates material coverage in working days: onHand / dailyConsumption.
 * Returns null if daily demand or quantity per rack is zero.
 */
export function calculateCoverageWorkingDays(
  onHand: number,
  dailyDemand: number,
  quantityPerRack: number,
): number | null {
  const dailyConsumption = dailyDemand * quantityPerRack;
  if (dailyConsumption <= 0) return null;
  return round(onHand / dailyConsumption, 2);
}

/**
 * Determines handler scheduling based on earliest available handler and lead time.
 */
export function scheduleHandler(
  currentTime: number,
  handlerAvailableTimes: number[],
  leadMinutes: number,
): { handlerIndex: number; dispatchTime: number; deliveryTime: number } {
  if (!handlerAvailableTimes.length) {
    throw new Error("At least one material handler is required");
  }
  const minTime = Math.min(...handlerAvailableTimes);
  const handlerIndex = handlerAvailableTimes.indexOf(minTime);
  const dispatchTime = Math.max(currentTime, minTime);
  const deliveryTime = dispatchTime + leadMinutes * 60000;
  return { handlerIndex, dispatchTime, deliveryTime };
}
