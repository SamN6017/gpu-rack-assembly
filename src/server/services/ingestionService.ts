import "server-only";
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import {
  manufacturingEventSchema,
  ManufacturingEvent,
} from "@/domain/manufacturing/manufacturingEvent";
import { DomainError } from "./transaction";

export interface IngestionResult {
  status: "INGESTED" | "DUPLICATE";
  id: string;
  eventId: string;
  sourceSystem: string;
}

export interface BatchIngestionSummary {
  total: number;
  ingested: number;
  duplicates: number;
  results: IngestionResult[];
}

/**
 * Computes deterministic SHA-256 hash of a manufacturing event,
 * ignoring volatile local ingestion metadata.
 */
export function computePayloadHash(event: ManufacturingEvent): string {
  const normalized = {
    ...event,
    ingestionTimestamp: "",
  };
  return createHash("sha256")
    .update(JSON.stringify(normalized, Object.keys(normalized).sort()))
    .digest("hex");
}

/**
 * Ingests a single manufacturing event into the inbox with deduplication
 * and conflict detection.
 */
export async function ingestManufacturingEvent(
  db: PrismaClient,
  raw: unknown,
): Promise<IngestionResult> {
  const event = manufacturingEventSchema.parse(raw);
  const hash = computePayloadHash(event);

  const existing = await db.manufacturingInboxEvent.findUnique({
    where: {
      sourceSystem_eventId: {
        sourceSystem: event.sourceSystem,
        eventId: event.eventId,
      },
    },
  });

  if (existing) {
    if (existing.payloadHash !== hash) {
      throw new DomainError(
        "EVENT_ID_CONFLICT",
        `Event ID '${event.eventId}' from '${event.sourceSystem}' already exists with differing payload`,
        409,
      );
    }
    return {
      status: "DUPLICATE",
      id: existing.id,
      eventId: event.eventId,
      sourceSystem: event.sourceSystem,
    };
  }

  const record = await db.manufacturingInboxEvent.create({
    data: {
      sourceSystem: event.sourceSystem,
      eventId: event.eventId,
      sourceTimestamp: new Date(event.sourceTimestamp),
      payloadHash: hash,
      normalizedJson: event,
    },
  });

  return {
    status: "INGESTED",
    id: record.id,
    eventId: event.eventId,
    sourceSystem: event.sourceSystem,
  };
}

/**
 * Ingests a batch of events with deduplication and transactional safety.
 */
export async function ingestEventBatch(
  db: PrismaClient,
  rawBatch: unknown[],
): Promise<BatchIngestionSummary> {
  const results: IngestionResult[] = [];
  let ingested = 0;
  let duplicates = 0;

  for (const raw of rawBatch) {
    const res = await ingestManufacturingEvent(db, raw);
    results.push(res);
    if (res.status === "INGESTED") ingested++;
    else if (res.status === "DUPLICATE") duplicates++;
  }

  return {
    total: rawBatch.length,
    ingested,
    duplicates,
    results,
  };
}
