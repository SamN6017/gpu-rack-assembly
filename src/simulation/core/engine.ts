import { EventQueue, Task } from "./eventQueue";
import {
  addMonths,
  addWork,
  DAY,
  isWorking,
  nextWorking,
  shiftAt,
  workingSeconds,
} from "./calendar";
import {
  simulationConfigSchema,
  SimulationConfig,
  Stock,
  Rack,
  Replenishment,
  SimEvent,
  Snapshot,
  SimulationResult,
  EventType,
} from "./types";
export const ENGINE_VERSION = "1.0.0";
const round = (n: number) => Math.round(n * 1e6) / 1e6;
export class ManufacturingEngine {
  readonly config: SimulationConfig;
  readonly start: number;
  readonly end: number;
  time: number;
  paused = true;
  complete = false;
  readonly events: SimEvent[] = [];
  readonly snapshots: Snapshot[] = [];
  readonly racks = new Map<string, Rack>();
  readonly stocks = new Map<string, Stock>();
  readonly orders = new Map<string, Replenishment>();
  private queue = new EventQueue();
  private sequence = 0;
  private stations: (Rack | null)[] = Array(5).fill(null);
  private handlers: number[];
  private completed = 0;
  private cycleTotal = 0;
  private busy = Array(5).fill(0) as number[];
  private blocked = Array(5).fill(0) as number[];
  private shortage = Array(5).fill(0) as number[];
  private lastSnapshotDay = "";
  private waiting: Rack[] = [];
  constructor(input: unknown) {
    this.config = simulationConfigSchema.parse(input);
    this.start = Date.parse(this.config.startDate);
    this.end = addMonths(this.start, this.config.durationMonths);
    this.time = this.start;
    this.handlers = Array(this.config.handlers).fill(this.start);
    for (const m of this.config.materials)
      this.stocks.set(m.id, {
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
        lastTime: this.start,
      });
    let rack = 0;
    const initial =
      shiftAt(this.start, this.config).start -
      this.config.shiftStartHour * 3600000;
    for (let day = initial; day < this.end; day += DAY) {
      const shift = shiftAt(day, this.config);
      if (!shift.working || shift.end <= this.start) continue;
      const start = Math.max(this.start, shift.start);
      this.schedule({ time: start, priority: 0, kind: "SHIFT_START" });
      if (shift.end < this.end)
        this.schedule({ time: shift.end, priority: 9, kind: "SHIFT_END" });
      for (let n = 0; n < this.config.dailyDemand; n++) {
        const time =
          shift.start +
          (n * (shift.end - shift.start)) / this.config.dailyDemand;
        if (time < this.start || time >= this.end) continue;
        const id = `RACK-${String(++rack).padStart(6, "0")}`;
        this.racks.set(id, {
          id,
          priority: 0,
          created: time,
          station: -1,
          status: "QUEUED",
          ready: false,
        });
        this.schedule({ time, priority: 5, kind: "ARRIVAL", rackId: id });
      }
    }
    for (const fault of this.config.faults) {
      const start = Math.max(this.start, Date.parse(fault.start)),
        end = Date.parse(fault.end);
      if (start < this.end && end > this.start) {
        this.schedule({
          time: start,
          priority: 1,
          kind: "FAULT_START",
          station: fault.station,
        });
        if (end < this.end)
          this.schedule({
            time: end,
            priority: 1,
            kind: "FAULT_END",
            station: fault.station,
          });
      }
    }
  }
  private schedule(task: Omit<Task, "sequence">) {
    this.queue.push({ ...task, sequence: ++this.sequence });
  }
  private emit(
    type: EventType,
    details: Omit<SimEvent, "type" | "time" | "sequence"> = {},
  ) {
    this.events.push({
      sequence: this.events.length + 1,
      time: this.time,
      type,
      ...details,
    });
  }
  private advance(time: number) {
    for (let s = 0; s < 5; s++) {
      const rack = this.stations[s];
      if (!rack) continue;
      const seconds = workingSeconds(this.time, time, this.config, s);
      if (rack.status === "RUNNING") this.busy[s] += seconds;
      else if (rack.reason === "MATERIAL") this.shortage[s] += seconds;
      else if (rack.status === "BLOCKED") this.blocked[s] += seconds;
    }
    for (const stock of this.stocks.values()) {
      stock.stockArea += (stock.onHand * (time - this.time)) / 1000;
      stock.warehouseArea += (stock.warehouse * (time - this.time)) / 1000;
      stock.lastTime = time;
    }
    this.time = time;
  }
  private replenish(id: string) {
    const m = this.config.materials.find((x) => x.id === id)!,
      s = this.stocks.get(id)!;
    const position = round(s.onHand + s.onOrder - s.reserved);
    if (position > Math.max(m.reorderPoint, m.safetyStock) || s.onOrder > 0)
      return;
    const need = round(m.bins * m.binCapacity - position);
    if (need <= 0) return;
    const available = round(s.warehouse - s.warehouseReserved);
    if (available <= 0) {
      if (!s.upstreamShortage) {
        s.upstreamShortage = true;
        this.emit("UPSTREAM_SHORTAGE", {
          materialId: id,
          station: m.station,
          quantity: need,
          reason: "Finite warehouse exhausted",
        });
      }
      return;
    }
    const quantity = Math.min(need, available);
    const handler = this.handlers.indexOf(Math.min(...this.handlers));
    const pick = Math.max(this.time, this.handlers[handler]);
    const delivery = pick + m.leadMinutes * 60000;
    this.handlers[handler] = delivery;
    s.warehouseReserved = round(s.warehouseReserved + quantity);
    s.onOrder = round(s.onOrder + quantity);
    const order: Replenishment = {
      id: `REPL-${this.orders.size + 1}`,
      materialId: id,
      quantity,
      requested: this.time,
      dispatch: pick,
      delivery,
      handler,
      status: "REQUESTED",
    };
    this.orders.set(order.id, order);
    this.emit("REPLENISHMENT_REQUESTED", {
      materialId: id,
      quantity,
      orderId: order.id,
      station: m.station,
    });
    this.schedule({ time: pick, priority: 2, kind: "PICK", orderId: order.id });
    this.schedule({
      time: delivery,
      priority: 2,
      kind: "DELIVERY",
      orderId: order.id,
    });
  }
  private blockedRack(rack: Rack, station: number, reason: string) {
    if (rack.status === "BLOCKED" && rack.reason === reason) return;
    rack.status = "BLOCKED";
    rack.reason = reason;
    this.emit("RACK_BLOCKED", { rackId: rack.id, station, reason });
  }
  private startRack(rack: Rack, station: number): boolean {
    if (
      !isWorking(this.time, this.config) ||
      nextWorking(this.time, this.config, station) !== this.time
    ) {
      if (rack.station >= 0)
        this.blockedRack(rack, rack.station, "CALENDAR_OR_EQUIPMENT");
      return false;
    }
    const materials = this.config.materials.filter(
      (m) => m.station === station,
    );
    const missing = materials.filter(
      (m) =>
        round(this.stocks.get(m.id)!.onHand - this.stocks.get(m.id)!.reserved) <
        m.quantity,
    );
    if (missing.length) {
      const newly = rack.status !== "BLOCKED" || rack.reason !== "MATERIAL";
      this.blockedRack(rack, station, "MATERIAL");
      if (newly)
        for (const m of missing) {
          this.stocks.get(m.id)!.shortages++;
          this.emit("MATERIAL_SHORTAGE", {
            rackId: rack.id,
            station,
            materialId: m.id,
            quantity: m.quantity,
          });
        }
      for (const m of missing) this.replenish(m.id);
      return false;
    }
    if (rack.status === "BLOCKED")
      this.emit("STATION_RESUMED", {
        rackId: rack.id,
        station,
        reason: rack.reason,
      });
    if (rack.station >= 0) {
      this.stations[rack.station] = null;
      this.emit("RACK_MOVED", { rackId: rack.id, station });
    }
    rack.station = station;
    rack.status = "RUNNING";
    rack.reason = undefined;
    rack.ready = false;
    rack.started ??= this.time;
    rack.operationStarted = this.time;
    this.stations[station] = rack;
    for (const m of materials) {
      const s = this.stocks.get(m.id)!;
      s.reserved = round(s.reserved + m.quantity);
      this.emit("MATERIAL_RESERVED", {
        rackId: rack.id,
        station,
        materialId: m.id,
        quantity: m.quantity,
      });
      s.onHand = round(s.onHand - m.quantity);
      s.reserved = round(s.reserved - m.quantity);
      s.consumed = round(s.consumed + m.quantity);
      this.emit("MATERIAL_CONSUMED", {
        rackId: rack.id,
        station,
        materialId: m.id,
        quantity: m.quantity,
      });
      this.replenish(m.id);
    }
    this.emit("STATION_STARTED", { rackId: rack.id, station });
    this.schedule({
      time: addWork(
        this.time,
        this.config.cycleSeconds[station],
        this.config,
        station,
      ),
      priority: 3,
      kind: "FINISH",
      rackId: rack.id,
      station,
    });
    return true;
  }
  private pump() {
    for (let station = 4; station >= 0; station--) {
      const rack = this.stations[station];
      if (!rack?.ready) continue;
      if (station === 4) {
        rack.status = "COMPLETED";
        rack.completed = this.time;
        this.completed++;
        this.cycleTotal += (this.time - rack.created) / 1000;
        this.stations[station] = null;
        this.emit("RACK_COMPLETED", { rackId: rack.id, station });
      } else if (this.stations[station + 1])
        this.blockedRack(rack, station, "DOWNSTREAM");
      else this.startRack(rack, station + 1);
    }
    if (!this.stations[0] && this.waiting.length) {
      this.waiting.sort(
        (a, b) =>
          b.priority - a.priority ||
          a.created - b.created ||
          a.id.localeCompare(b.id),
      );
      if (this.startRack(this.waiting[0], 0)) this.waiting.shift();
    }
  }
  stepEvent() {
    if (this.complete) return false;
    const task = this.queue.peek();
    if (!task || task.time >= this.end) {
      this.advance(this.end);
      this.complete = true;
      this.paused = true;
      this.emit("SIMULATION_COMPLETED");
      this.snapshots.push(this.snapshot());
      return false;
    }
    this.queue.pop();
    this.advance(task.time);
    switch (task.kind) {
      case "SHIFT_START":
        this.emit("SHIFT_STARTED");
        for (const m of this.config.materials) this.replenish(m.id);
        break;
      case "SHIFT_END":
        this.emit("SHIFT_ENDED");
        break;
      case "ARRIVAL": {
        const rack = this.racks.get(task.rackId!)!;
        this.waiting.push(rack);
        this.emit("PRODUCTION_ORDER_CREATED", { rackId: rack.id });
        this.emit("RACK_QUEUED", { rackId: rack.id });
        break;
      }
      case "FINISH": {
        const rack = this.racks.get(task.rackId!)!;
        rack.ready = true;
        this.emit("STATION_COMPLETED", {
          rackId: rack.id,
          station: task.station,
        });
        break;
      }
      case "PICK": {
        const o = this.orders.get(task.orderId!)!,
          s = this.stocks.get(o.materialId)!;
        s.warehouse = round(s.warehouse - o.quantity);
        s.warehouseReserved = round(s.warehouseReserved - o.quantity);
        s.inTransit = round(s.inTransit + o.quantity);
        o.status = "IN_TRANSIT";
        this.emit("REPLENISHMENT_PICKED", {
          materialId: o.materialId,
          quantity: o.quantity,
          orderId: o.id,
        });
        this.emit("REPLENISHMENT_DISPATCHED", {
          materialId: o.materialId,
          quantity: o.quantity,
          orderId: o.id,
        });
        break;
      }
      case "DELIVERY": {
        const o = this.orders.get(task.orderId!)!,
          s = this.stocks.get(o.materialId)!;
        s.inTransit = round(s.inTransit - o.quantity);
        s.onOrder = round(s.onOrder - o.quantity);
        s.onHand = round(s.onHand + o.quantity);
        o.status = "DELIVERED";
        this.emit("REPLENISHMENT_DELIVERED", {
          materialId: o.materialId,
          quantity: o.quantity,
          orderId: o.id,
        });
        break;
      }
      case "FAULT_START":
        this.emit("EQUIPMENT_DOWN", { station: task.station });
        break;
      case "FAULT_END":
        this.emit("EQUIPMENT_UP", { station: task.station });
        break;
    }
    this.pump();
    const day = new Date(this.time).toISOString().slice(0, 10);
    if (day !== this.lastSnapshotDay || task.kind === "SHIFT_END") {
      this.snapshots.push(this.snapshot());
      this.lastSnapshotDay = day;
    }
    return true;
  }
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
  }
  stepMinute() {
    this.jumpTo(Math.min(this.end, this.time + 60000));
  }
  jumpTo(time: number) {
    if (time < this.time) throw new Error("Reset before seeking backward");
    const target = Math.min(time, this.end);
    while (
      !this.complete &&
      this.queue.peek() &&
      this.queue.peek().time <= target
    )
      this.stepEvent();
    if (!this.complete) this.advance(target);
    if (target === this.end && !this.complete) this.stepEvent();
  }
  runToCompletion() {
    this.resume();
    while (!this.complete) this.stepEvent();
    return this.result();
  }
  setPriority(id: string, priority: number) {
    const rack = this.racks.get(id);
    if (!rack || !Number.isInteger(priority) || rack.station !== -1)
      throw new Error("Priority can only be changed for queued racks");
    rack.priority = priority;
  }
  snapshot(): Snapshot {
    return structuredClone({
      time: this.time,
      completed: this.completed,
      queued: this.waiting.length,
      waiting:
        this.waiting.filter((r) => r.reason === "MATERIAL").length +
        this.stations.filter((r) => r?.reason === "MATERIAL").length,
      stations: this.stations,
      stocks: [...this.stocks.values()],
      orders: [...this.orders.values()].filter((o) => o.status !== "DELIVERED"),
      busySeconds: this.busy,
      blockedSeconds: this.blocked,
      shortageSeconds: this.shortage,
      completedCycleSeconds: this.cycleTotal,
      eventSequence: this.events.length,
    });
  }
  result(): SimulationResult {
    return {
      config: this.config,
      engineVersion: ENGINE_VERSION,
      end: this.end,
      events: this.events,
      snapshots: this.snapshots,
      final: this.snapshot(),
    };
  }
  reset() {
    return new ManufacturingEngine(this.config);
  }
}
