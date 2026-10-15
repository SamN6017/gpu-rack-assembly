import type { SimulationConfig } from "./types";
export const DAY = 86400000;
export function addMonths(time: number, months: number) {
  const date = new Date(time),
    day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const max = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, max));
  return date.getTime();
}
export function shiftAt(time: number, c: SimulationConfig) {
  const d = new Date(time);
  const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return {
    start: day + c.shiftStartHour * 3600000,
    end: day + (c.shiftStartHour + c.shiftHours) * 3600000,
    working: c.workingDays.includes(d.getUTCDay()),
  };
}
export function isWorking(time: number, c: SimulationConfig) {
  const s = shiftAt(time, c);
  return s.working && time >= s.start && time < s.end;
}
export function nextWorking(
  time: number,
  c: SimulationConfig,
  station?: number,
): number {
  let t = time;
  for (let i = 0; i < 20000; i++) {
    const s = shiftAt(t, c);
    if (!s.working || t >= s.end) {
      t = s.start - c.shiftStartHour * 3600000 + DAY;
      continue;
    }
    if (t < s.start) t = s.start;
    const fault =
      station === undefined
        ? undefined
        : c.faults.find(
            (f) =>
              f.station === station &&
              Date.parse(f.start) <= t &&
              Date.parse(f.end) > t,
          );
    if (fault) {
      t = Date.parse(fault.end);
      continue;
    }
    return t;
  }
  throw new Error("Calendar cannot find available work time");
}
export function addWork(
  time: number,
  seconds: number,
  c: SimulationConfig,
  station: number,
) {
  let t = nextWorking(time, c, station),
    remaining = seconds * 1000;
  while (remaining > 0) {
    const shift = shiftAt(t, c);
    const nextFault = c.faults
      .filter((f) => f.station === station && Date.parse(f.start) > t)
      .reduce((n, f) => Math.min(n, Date.parse(f.start)), Infinity);
    const limit = Math.min(shift.end, nextFault);
    const usable = Math.min(remaining, limit - t);
    remaining -= usable;
    t += usable;
    if (remaining > 0) t = nextWorking(t, c, station);
  }
  return t;
}
export function workingSeconds(
  from: number,
  to: number,
  c: SimulationConfig,
  station?: number,
) {
  let t = from,
    total = 0;
  while (t < to) {
    t = nextWorking(t, c, station);
    if (t >= to) break;
    const end = Math.min(
      to,
      shiftAt(t, c).end,
      station === undefined
        ? Infinity
        : c.faults
            .filter((f) => f.station === station && Date.parse(f.start) > t)
            .reduce((n, f) => Math.min(n, Date.parse(f.start)), Infinity),
    );
    total += (end - t) / 1000;
    t = end;
  }
  return total;
}
