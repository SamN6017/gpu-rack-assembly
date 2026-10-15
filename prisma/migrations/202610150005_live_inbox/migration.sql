CREATE TABLE "ManufacturingInboxEvent" (
 "id" UUID PRIMARY KEY, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "sourceSystem" TEXT NOT NULL, "eventId" TEXT NOT NULL, "sourceTimestamp" TIMESTAMPTZ(3) NOT NULL,
 "payloadHash" TEXT NOT NULL, "normalizedJson" JSONB NOT NULL,
 UNIQUE("sourceSystem", "eventId")
);
CREATE INDEX "ManufacturingInboxEvent_sourceSystem_sourceTimestamp_idx" ON "ManufacturingInboxEvent"("sourceSystem","sourceTimestamp");
CREATE TRIGGER inbox_immutable BEFORE UPDATE OR DELETE ON "ManufacturingInboxEvent" FOR EACH ROW EXECUTE FUNCTION reject_immutable_mutation();
