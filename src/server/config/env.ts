import "server-only";
import { z } from "zod";
export function databaseUrl(): string {
  return z
    .string()
    .url()
    .refine((v) => /^postgres(ql)?:/.test(v), "PostgreSQL URL required")
    .parse(process.env.DATABASE_URL);
}
