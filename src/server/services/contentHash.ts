import "server-only";
import { createHash } from "node:crypto";
export function contentHash(value: unknown): string {
  function stable(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(stable);
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.entries(v)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, x]) => [k, stable(x)]),
      );
    return v;
  }
  return createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex");
}
