export type Task = {
  time: number;
  priority: number;
  sequence: number;
  kind:
    | "SHIFT_START"
    | "SHIFT_END"
    | "ARRIVAL"
    | "FINISH"
    | "PICK"
    | "DELIVERY"
    | "FAULT_START"
    | "FAULT_END";
  rackId?: string;
  station?: number;
  orderId?: string;
};
const before = (a: Task, b: Task) =>
  a.time < b.time ||
  (a.time === b.time &&
    (a.priority < b.priority ||
      (a.priority === b.priority && a.sequence < b.sequence)));
export class EventQueue {
  private heap: Task[] = [];
  get size() {
    return this.heap.length;
  }
  peek() {
    return this.heap[0];
  }
  push(task: Task) {
    const h = this.heap;
    h.push(task);
    let i = h.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!before(h[i], h[p])) break;
      [h[i], h[p]] = [h[p], h[i]];
      i = p;
    }
  }
  pop() {
    const h = this.heap;
    if (!h.length) return undefined;
    const first = h[0],
      last = h.pop()!;
    if (h.length) {
      h[0] = last;
      let i = 0;
      while (true) {
        let child = i * 2 + 1;
        if (child >= h.length) break;
        if (child + 1 < h.length && before(h[child + 1], h[child])) child++;
        if (!before(h[child], h[i])) break;
        [h[i], h[child]] = [h[child], h[i]];
        i = child;
      }
    }
    return first;
  }
}
