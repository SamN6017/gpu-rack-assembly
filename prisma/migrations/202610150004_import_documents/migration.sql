CREATE TABLE "ImportDocument" (
 "id" UUID PRIMARY KEY, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "filename" TEXT NOT NULL, "checksum" TEXT NOT NULL UNIQUE,
 "content" BYTEA NOT NULL CHECK(octet_length("content") <= 10485760), "mediaType" TEXT NOT NULL
);
CREATE TABLE "ImportRow" (
 "id" UUID PRIMARY KEY, "batchId" UUID NOT NULL REFERENCES "ImportBatch"("id") ON DELETE RESTRICT,
 "worksheet" TEXT NOT NULL, "rowNumber" INTEGER NOT NULL CHECK("rowNumber">1),
 "entityType" TEXT NOT NULL, "normalizedJson" JSONB NOT NULL, "rawJson" JSONB NOT NULL,
 UNIQUE("batchId", "worksheet", "rowNumber")
);
CREATE INDEX "ImportRow_batchId_idx" ON "ImportRow"("batchId");
CREATE TRIGGER import_row_immutable BEFORE UPDATE OR DELETE ON "ImportRow" FOR EACH ROW EXECUTE FUNCTION reject_immutable_mutation();
