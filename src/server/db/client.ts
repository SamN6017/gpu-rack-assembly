import "server-only";
import { PrismaClient } from "@prisma/client";
import { databaseUrl } from "../config/env";
const globalDb = globalThis as unknown as { rackDb?: PrismaClient };
export function getDb(): PrismaClient {
  if (!globalDb.rackDb)
    globalDb.rackDb = new PrismaClient({ datasourceUrl: databaseUrl() });
  return globalDb.rackDb;
}
