import { describe, it, expect } from "vitest";
import {
  calculateInventoryPosition,
  shouldReorder,
  calculateReplenishmentQuantity,
  evaluateBinStates,
  calculateCoverageWorkingDays,
  scheduleHandler,
} from "@/simulation/core/kanban";

describe("Two-Bin Kanban Replenishment Core", () => {
  it("calculates inventory position subtracting outstanding demand/reservations", () => {
    // onHand: 15, onOrder: 20, reserved: 5 => position = 15 + 20 - 5 = 30
    const position = calculateInventoryPosition({
      onHand: 15,
      onOrder: 20,
      reserved: 5,
    });
    expect(position).toBe(30);
  });

  it("triggers reorder only when position is below or at reorder point, preventing duplicate orders", () => {
    const thresholds = { reorderPoint: 20, safetyStock: 10 };

    // Position is 25 (> 20), no order in flight -> should NOT reorder
    expect(
      shouldReorder(
        { onHand: 25, onOrder: 0, reserved: 0 },
        thresholds,
      ),
    ).toBe(false);

    // Position is 20 (<= 20), no order in flight -> SHOULD reorder
    expect(
      shouldReorder(
        { onHand: 20, onOrder: 0, reserved: 0 },
        thresholds,
      ),
    ).toBe(true);

    // Position is 10 (<= 20), but order is ALREADY in flight (onOrder > 0) -> should NOT reorder (guard against duplicate orders)
    expect(
      shouldReorder(
        { onHand: 10, onOrder: 20, reserved: 0 },
        thresholds,
      ),
    ).toBe(false);
  });

  it("calculates order quantity bounded by target bin capacity and available warehouse stock", () => {
    // 2 bins of 40 = 80 capacity. Current position = 20. Need = 60.
    // Warehouse has 100 available -> order 60.
    expect(calculateReplenishmentQuantity(20, 2, 40, 100)).toBe(60);

    // Warehouse only has 30 available -> constrained to 30.
    expect(calculateReplenishmentQuantity(20, 2, 40, 30)).toBe(30);

    // Warehouse has 0 available -> 0.
    expect(calculateReplenishmentQuantity(20, 2, 40, 0)).toBe(0);

    // Position already exceeds target -> 0.
    expect(calculateReplenishmentQuantity(85, 2, 40, 100)).toBe(0);
  });

  it("evaluates bin states accurately across FULL, ACTIVE, REPLENISHING, and EMPTY", () => {
    // 2 bins, 10 capacity each (total 20).
    // onHand = 20 -> both FULL
    const bothFull = evaluateBinStates(20, 2, 10, 0);
    expect(bothFull).toEqual([
      { binIndex: 1, quantity: 10, capacity: 10, status: "FULL" },
      { binIndex: 2, quantity: 10, capacity: 10, status: "FULL" },
    ]);

    // onHand = 15 -> bin 1 is FULL (10), bin 2 is ACTIVE (5)
    const oneFullOneActive = evaluateBinStates(15, 2, 10, 0);
    expect(oneFullOneActive).toEqual([
      { binIndex: 1, quantity: 10, capacity: 10, status: "FULL" },
      { binIndex: 2, quantity: 5, capacity: 10, status: "ACTIVE" },
    ]);

    // onHand = 0, onOrder = 10 -> both REPLENISHING
    const replenishing = evaluateBinStates(0, 2, 10, 10);
    expect(replenishing).toEqual([
      { binIndex: 1, quantity: 0, capacity: 10, status: "REPLENISHING" },
      { binIndex: 2, quantity: 0, capacity: 10, status: "REPLENISHING" },
    ]);

    // onHand = 0, onOrder = 0 -> both EMPTY
    const empty = evaluateBinStates(0, 2, 10, 0);
    expect(empty).toEqual([
      { binIndex: 1, quantity: 0, capacity: 10, status: "EMPTY" },
      { binIndex: 2, quantity: 0, capacity: 10, status: "EMPTY" },
    ]);
  });

  it("computes coverage in working days and handles zero demand gracefully", () => {
    // onHand: 60, dailyDemand: 15, quantityPerRack: 2 -> daily = 30 -> coverage = 2 working days
    expect(calculateCoverageWorkingDays(60, 15, 2)).toBe(2);

    // Zero demand -> null (no demand)
    expect(calculateCoverageWorkingDays(60, 0, 2)).toBeNull();

    // Zero quantity per rack -> null
    expect(calculateCoverageWorkingDays(60, 15, 0)).toBeNull();
  });

  it("schedules material handlers based on availability and lead time", () => {
    const handlers = [1000, 2500]; // Handler 0 free at 1000, Handler 1 free at 2500
    const now = 500;
    const leadMinutes = 30; // 30 * 60,000 = 1,800,000 ms

    const assignment = scheduleHandler(now, handlers, leadMinutes);
    expect(assignment.handlerIndex).toBe(0);
    expect(assignment.dispatchTime).toBe(1000); // Wait until handler is free
    expect(assignment.deliveryTime).toBe(1000 + 30 * 60000);

    // If both handlers are already free earlier than now:
    const handlersFree = [100, 200];
    const assignmentImmediate = scheduleHandler(1000, handlersFree, leadMinutes);
    expect(assignmentImmediate.handlerIndex).toBe(0);
    expect(assignmentImmediate.dispatchTime).toBe(1000); // Immediate dispatch
    expect(assignmentImmediate.deliveryTime).toBe(1000 + 30 * 60000);
  });
});
