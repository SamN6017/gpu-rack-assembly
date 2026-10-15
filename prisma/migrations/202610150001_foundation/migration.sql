-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DatasetKind" AS ENUM ('ACTUAL', 'SYNTHETIC');

-- CreateEnum
CREATE TYPE "EvidenceClass" AS ENUM ('OBSERVED', 'DERIVED', 'ASSUMED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('WAREHOUSE', 'KANBAN_STORAGE', 'POINT_OF_USE', 'IN_TRANSIT');

-- CreateEnum
CREATE TYPE "InventoryEventType" AS ENUM ('RECEIPT', 'TRANSFER', 'CONSUMPTION', 'ADJUSTMENT', 'RETURN');

-- CreateEnum
CREATE TYPE "ReplenishmentStatus" AS ENUM ('REQUESTED', 'PICKING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('PLANNED', 'QUEUED', 'RUNNING', 'BLOCKED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('EXCEL', 'CSV', 'MANUAL', 'SIMULATION', 'ERP', 'MES', 'WMS', 'IOT');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('DISCONNECTED', 'CONNECTING', 'CONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PREVIEW', 'VALIDATED', 'IMPORTED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED');

-- CreateTable
CREATE TABLE "Material" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "catalogNamespace" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "datasetKind" "DatasetKind" NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RackModel" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "modelCode" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "datasetKind" "DatasetKind" NOT NULL,

    CONSTRAINT "RackModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workstation" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "stationCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "cycleTimeSeconds" INTEGER NOT NULL DEFAULT 720,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Workstation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillOfMaterial" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "rackModelId" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "workstationId" UUID NOT NULL,
    "quantityPerRack" DECIMAL(20,6) NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(3) NOT NULL,
    "effectiveTo" TIMESTAMPTZ(3),
    "sourceReference" TEXT NOT NULL,

    CONSTRAINT "BillOfMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLocation" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationType" "LocationType" NOT NULL,
    "parentLocationId" UUID,

    CONSTRAINT "InventoryLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryBalance" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "materialId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "quantityOnHand" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "quantityReserved" DECIMAL(20,6) NOT NULL DEFAULT 0,

    CONSTRAINT "InventoryBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryEvent" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "materialId" UUID NOT NULL,
    "sourceLocationId" UUID,
    "destinationLocationId" UUID,
    "quantity" DECIMAL(20,6) NOT NULL,
    "eventType" "InventoryEventType" NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "reason" TEXT,
    "reservationId" UUID,

    CONSTRAINT "InventoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanbanRule" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "materialId" UUID NOT NULL,
    "sourceLocationId" UUID NOT NULL,
    "destinationLocationId" UUID NOT NULL,
    "numberOfBins" INTEGER NOT NULL DEFAULT 2,
    "unitsPerBin" DECIMAL(20,6) NOT NULL,
    "reorderPoint" DECIMAL(20,6) NOT NULL,
    "targetStock" DECIMAL(20,6) NOT NULL,
    "replenishmentLeadMinutes" INTEGER NOT NULL,
    "safetyStock" DECIMAL(20,6) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "KanbanRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplenishmentOrder" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "materialId" UUID NOT NULL,
    "sourceLocationId" UUID NOT NULL,
    "destinationLocationId" UUID NOT NULL,
    "ruleId" UUID,
    "idempotencyKey" TEXT NOT NULL,
    "requestedQuantity" DECIMAL(20,6) NOT NULL,
    "deliveredQuantity" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "status" "ReplenishmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMPTZ(3) NOT NULL,
    "dispatchedAt" TIMESTAMPTZ(3),
    "deliveredAt" TIMESTAMPTZ(3),

    CONSTRAINT "ReplenishmentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "rackModelId" UUID NOT NULL,
    "rackSerialNumber" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "ProductionStatus" NOT NULL DEFAULT 'PLANNED',
    "scheduledStart" TIMESTAMPTZ(3) NOT NULL,
    "actualStart" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationScenario" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationDays" INTEGER NOT NULL,
    "startDate" TIMESTAMPTZ(3) NOT NULL,
    "durationMonths" INTEGER,
    "calendarTimezone" TEXT NOT NULL,
    "productionScheduleJson" JSONB NOT NULL,
    "initialInventoryJson" JSONB NOT NULL,
    "kanbanOverridesJson" JSONB NOT NULL,
    "simulationSeed" INTEGER NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "datasetKind" "DatasetKind" NOT NULL,

    CONSTRAINT "SimulationScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationRun" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "scenarioId" UUID NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMPTZ(3),
    "finishedAt" TIMESTAMPTZ(3),
    "simulatedStart" TIMESTAMPTZ(3) NOT NULL,
    "simulatedEnd" TIMESTAMPTZ(3) NOT NULL,
    "inputSnapshotJson" JSONB NOT NULL,
    "configurationVersion" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "simulationSeed" INTEGER NOT NULL,
    "inputHash" TEXT NOT NULL,
    "summaryJson" JSONB,

    CONSTRAINT "SimulationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationEvent" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runId" UUID NOT NULL,
    "sequenceNumber" BIGINT NOT NULL,
    "virtualTimestamp" TIMESTAMPTZ(3) NOT NULL,
    "eventType" TEXT NOT NULL,
    "materialId" UUID,
    "rackId" TEXT,
    "workstationId" UUID,
    "payloadJson" JSONB NOT NULL,

    CONSTRAINT "SimulationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "connectionStatus" "ConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "configurationJson" JSONB NOT NULL,
    "lastSyncAt" TIMESTAMPTZ(3),

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "sourceId" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "importedAt" TIMESTAMPTZ(3),
    "status" "ImportStatus" NOT NULL DEFAULT 'PREVIEW',
    "rowCount" INTEGER NOT NULL,
    "acceptedRows" INTEGER NOT NULL DEFAULT 0,
    "rejectedRows" INTEGER NOT NULL DEFAULT 0,
    "validationReportJson" JSONB NOT NULL,
    "mappingVersion" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataProvenance" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "classification" "EvidenceClass" NOT NULL,
    "datasetKind" "DatasetKind" NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "rawValue" JSONB NOT NULL,
    "sourceId" UUID,
    "importBatchId" UUID,

    CONSTRAINT "DataProvenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataAssumption" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "parameter" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "unit" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "datasetKind" "DatasetKind" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PROPOSED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "contentHash" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMPTZ(3),

    CONSTRAINT "DataAssumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReservation" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "materialId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "productionOrderId" UUID NOT NULL,
    "operationKey" TEXT NOT NULL,
    "quantity" DECIMAL(20,6) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Material_catalogNamespace_partNumber_key" ON "Material"("catalogNamespace", "partNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RackModel_modelCode_key" ON "RackModel"("modelCode");

-- CreateIndex
CREATE UNIQUE INDEX "Workstation_stationCode_key" ON "Workstation"("stationCode");

-- CreateIndex
CREATE UNIQUE INDEX "Workstation_sequence_key" ON "Workstation"("sequence");

-- CreateIndex
CREATE INDEX "BillOfMaterial_rackModelId_workstationId_idx" ON "BillOfMaterial"("rackModelId", "workstationId");

-- CreateIndex
CREATE INDEX "BillOfMaterial_materialId_idx" ON "BillOfMaterial"("materialId");

-- CreateIndex
CREATE INDEX "BillOfMaterial_workstationId_idx" ON "BillOfMaterial"("workstationId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLocation_code_key" ON "InventoryLocation"("code");

-- CreateIndex
CREATE INDEX "InventoryLocation_parentLocationId_idx" ON "InventoryLocation"("parentLocationId");

-- CreateIndex
CREATE INDEX "InventoryBalance_locationId_idx" ON "InventoryBalance"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryBalance_materialId_locationId_key" ON "InventoryBalance"("materialId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryEvent_reservationId_key" ON "InventoryEvent"("reservationId");

-- CreateIndex
CREATE INDEX "InventoryEvent_materialId_occurredAt_idx" ON "InventoryEvent"("materialId", "occurredAt");

-- CreateIndex
CREATE INDEX "InventoryEvent_sourceLocationId_occurredAt_idx" ON "InventoryEvent"("sourceLocationId", "occurredAt");

-- CreateIndex
CREATE INDEX "InventoryEvent_destinationLocationId_occurredAt_idx" ON "InventoryEvent"("destinationLocationId", "occurredAt");

-- CreateIndex
CREATE INDEX "InventoryEvent_correlationId_idx" ON "InventoryEvent"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryEvent_sourceSystem_externalEventId_key" ON "InventoryEvent"("sourceSystem", "externalEventId");

-- CreateIndex
CREATE INDEX "KanbanRule_sourceLocationId_idx" ON "KanbanRule"("sourceLocationId");

-- CreateIndex
CREATE INDEX "KanbanRule_destinationLocationId_idx" ON "KanbanRule"("destinationLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "KanbanRule_materialId_sourceLocationId_destinationLocationI_key" ON "KanbanRule"("materialId", "sourceLocationId", "destinationLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReplenishmentOrder_idempotencyKey_key" ON "ReplenishmentOrder"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ReplenishmentOrder_status_requestedAt_idx" ON "ReplenishmentOrder"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "ReplenishmentOrder_materialId_destinationLocationId_idx" ON "ReplenishmentOrder"("materialId", "destinationLocationId");

-- CreateIndex
CREATE INDEX "ReplenishmentOrder_sourceLocationId_idx" ON "ReplenishmentOrder"("sourceLocationId");

-- CreateIndex
CREATE INDEX "ReplenishmentOrder_destinationLocationId_idx" ON "ReplenishmentOrder"("destinationLocationId");

-- CreateIndex
CREATE INDEX "ReplenishmentOrder_ruleId_idx" ON "ReplenishmentOrder"("ruleId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrder_rackSerialNumber_key" ON "ProductionOrder"("rackSerialNumber");

-- CreateIndex
CREATE INDEX "ProductionOrder_rackModelId_idx" ON "ProductionOrder"("rackModelId");

-- CreateIndex
CREATE INDEX "ProductionOrder_status_priority_scheduledStart_idx" ON "ProductionOrder"("status", "priority", "scheduledStart");

-- CreateIndex
CREATE INDEX "SimulationRun_scenarioId_createdAt_idx" ON "SimulationRun"("scenarioId", "createdAt");

-- CreateIndex
CREATE INDEX "SimulationRun_status_idx" ON "SimulationRun"("status");

-- CreateIndex
CREATE INDEX "SimulationEvent_runId_virtualTimestamp_idx" ON "SimulationEvent"("runId", "virtualTimestamp");

-- CreateIndex
CREATE INDEX "SimulationEvent_virtualTimestamp_idx" ON "SimulationEvent"("virtualTimestamp");

-- CreateIndex
CREATE INDEX "SimulationEvent_eventType_idx" ON "SimulationEvent"("eventType");

-- CreateIndex
CREATE INDEX "SimulationEvent_runId_eventType_virtualTimestamp_idx" ON "SimulationEvent"("runId", "eventType", "virtualTimestamp");

-- CreateIndex
CREATE INDEX "SimulationEvent_materialId_idx" ON "SimulationEvent"("materialId");

-- CreateIndex
CREATE INDEX "SimulationEvent_workstationId_idx" ON "SimulationEvent"("workstationId");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationEvent_runId_sequenceNumber_key" ON "SimulationEvent"("runId", "sequenceNumber");

-- CreateIndex
CREATE INDEX "ImportBatch_sourceId_checksum_mappingVersion_idx" ON "ImportBatch"("sourceId", "checksum", "mappingVersion");

-- CreateIndex
CREATE INDEX "DataProvenance_entityType_entityId_idx" ON "DataProvenance"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "DataProvenance_sourceId_idx" ON "DataProvenance"("sourceId");

-- CreateIndex
CREATE INDEX "DataProvenance_importBatchId_idx" ON "DataProvenance"("importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "DataAssumption_parameter_version_key" ON "DataAssumption"("parameter", "version");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryReservation_idempotencyKey_key" ON "InventoryReservation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "InventoryReservation_materialId_locationId_status_idx" ON "InventoryReservation"("materialId", "locationId", "status");

-- CreateIndex
CREATE INDEX "InventoryReservation_locationId_idx" ON "InventoryReservation"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryReservation_productionOrderId_operationKey_materia_key" ON "InventoryReservation"("productionOrderId", "operationKey", "materialId");

-- AddForeignKey
ALTER TABLE "BillOfMaterial" ADD CONSTRAINT "BillOfMaterial_rackModelId_fkey" FOREIGN KEY ("rackModelId") REFERENCES "RackModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillOfMaterial" ADD CONSTRAINT "BillOfMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillOfMaterial" ADD CONSTRAINT "BillOfMaterial_workstationId_fkey" FOREIGN KEY ("workstationId") REFERENCES "Workstation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLocation" ADD CONSTRAINT "InventoryLocation_parentLocationId_fkey" FOREIGN KEY ("parentLocationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEvent" ADD CONSTRAINT "InventoryEvent_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEvent" ADD CONSTRAINT "InventoryEvent_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEvent" ADD CONSTRAINT "InventoryEvent_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEvent" ADD CONSTRAINT "InventoryEvent_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "InventoryReservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanRule" ADD CONSTRAINT "KanbanRule_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanRule" ADD CONSTRAINT "KanbanRule_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanRule" ADD CONSTRAINT "KanbanRule_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplenishmentOrder" ADD CONSTRAINT "ReplenishmentOrder_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplenishmentOrder" ADD CONSTRAINT "ReplenishmentOrder_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplenishmentOrder" ADD CONSTRAINT "ReplenishmentOrder_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplenishmentOrder" ADD CONSTRAINT "ReplenishmentOrder_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "KanbanRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_rackModelId_fkey" FOREIGN KEY ("rackModelId") REFERENCES "RackModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationRun" ADD CONSTRAINT "SimulationRun_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "SimulationScenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationEvent" ADD CONSTRAINT "SimulationEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SimulationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationEvent" ADD CONSTRAINT "SimulationEvent_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationEvent" ADD CONSTRAINT "SimulationEvent_workstationId_fkey" FOREIGN KEY ("workstationId") REFERENCES "Workstation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataProvenance" ADD CONSTRAINT "DataProvenance_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataProvenance" ADD CONSTRAINT "DataProvenance_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Hand-reviewed invariants which are not expressible in Prisma's schema DSL.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Workstation" ADD CONSTRAINT "station_positive" CHECK ("sequence" > 0 AND "cycleTimeSeconds" > 0);
ALTER TABLE "BillOfMaterial" ADD CONSTRAINT "bom_valid" CHECK ("quantityPerRack" > 0 AND ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"));
ALTER TABLE "BillOfMaterial" ADD CONSTRAINT "bom_no_overlap" EXCLUDE USING gist ("rackModelId" WITH =, "materialId" WITH =, "workstationId" WITH =, tstzrange("effectiveFrom", "effectiveTo", '[)') WITH &&);
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "balance_nonnegative" CHECK ("quantityOnHand" >= 0 AND "quantityReserved" >= 0 AND "quantityReserved" <= "quantityOnHand");
ALTER TABLE "InventoryEvent" ADD CONSTRAINT "event_shape" CHECK (
  ("eventType" IN ('RECEIPT','RETURN') AND "quantity" > 0 AND "sourceLocationId" IS NULL AND "destinationLocationId" IS NOT NULL AND "reservationId" IS NULL) OR
  ("eventType" = 'TRANSFER' AND "quantity" > 0 AND "sourceLocationId" IS NOT NULL AND "destinationLocationId" IS NOT NULL AND "sourceLocationId" <> "destinationLocationId" AND "reservationId" IS NULL) OR
  ("eventType" = 'CONSUMPTION' AND "quantity" > 0 AND "sourceLocationId" IS NOT NULL AND "destinationLocationId" IS NULL AND "reservationId" IS NOT NULL) OR
  ("eventType" = 'ADJUSTMENT' AND "quantity" <> 0 AND "sourceLocationId" IS NULL AND "destinationLocationId" IS NOT NULL AND "reservationId" IS NULL AND length(trim("reason")) > 0 AND "reason" IS NOT NULL)
);
ALTER TABLE "KanbanRule" ADD CONSTRAINT "kanban_valid" CHECK ("sourceLocationId" <> "destinationLocationId" AND "numberOfBins" >= 2 AND "unitsPerBin" > 0 AND "replenishmentLeadMinutes" >= 0 AND "safetyStock" >= 0 AND "reorderPoint" >= "safetyStock" AND "targetStock" >= "reorderPoint" AND "targetStock" <= "numberOfBins" * "unitsPerBin");
ALTER TABLE "ReplenishmentOrder" ADD CONSTRAINT "replenishment_valid" CHECK ("sourceLocationId" <> "destinationLocationId" AND "requestedQuantity" > 0 AND "deliveredQuantity" >= 0 AND "deliveredQuantity" <= "requestedQuantity" AND ("dispatchedAt" IS NULL OR "dispatchedAt" >= "requestedAt") AND ("deliveredAt" IS NULL OR ("dispatchedAt" IS NOT NULL AND "deliveredAt" >= "dispatchedAt")) AND ("status" <> 'DELIVERED' OR ("deliveredQuantity" = "requestedQuantity" AND "deliveredAt" IS NOT NULL)));
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "production_valid" CHECK ("priority" BETWEEN 0 AND 100 AND ("completedAt" IS NULL OR ("actualStart" IS NOT NULL AND "completedAt" >= "actualStart")) AND ("status" <> 'COMPLETED' OR "completedAt" IS NOT NULL));
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "reservation_positive" CHECK ("quantity" > 0);
ALTER TABLE "SimulationScenario" ADD CONSTRAINT "scenario_duration" CHECK ("durationDays" > 0 AND ("durationMonths" IS NULL OR "durationMonths" > 0));
ALTER TABLE "SimulationRun" ADD CONSTRAINT "run_dates" CHECK ("simulatedEnd" > "simulatedStart" AND ("finishedAt" IS NULL OR ("startedAt" IS NOT NULL AND "finishedAt" >= "startedAt")));
ALTER TABLE "SimulationEvent" ADD CONSTRAINT "event_sequence" CHECK ("sequenceNumber" >= 0);
ALTER TABLE "ImportBatch" ADD CONSTRAINT "import_counts" CHECK ("rowCount" >= 0 AND "acceptedRows" >= 0 AND "rejectedRows" >= 0 AND "acceptedRows" + "rejectedRows" <= "rowCount" AND ("status" NOT IN ('IMPORTED','REJECTED','FAILED') OR "acceptedRows" + "rejectedRows" = "rowCount"));
ALTER TABLE "DataAssumption" ADD CONSTRAINT "assumption_approval" CHECK ("version" > 0 AND ("status" <> 'APPROVED' OR ("approvedAt" IS NOT NULL AND "approvedBy" IS NOT NULL AND length(trim("approvedBy")) > 0)));

CREATE FUNCTION reject_immutable_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Immutable records require a compensating event' USING ERRCODE = '23514'; END;
$$;
CREATE TRIGGER inventory_event_immutable BEFORE UPDATE OR DELETE ON "InventoryEvent" FOR EACH ROW EXECUTE FUNCTION reject_immutable_mutation();
CREATE TRIGGER simulation_event_immutable BEFORE UPDATE OR DELETE ON "SimulationEvent" FOR EACH ROW EXECUTE FUNCTION reject_immutable_mutation();
CREATE TRIGGER provenance_immutable BEFORE UPDATE OR DELETE ON "DataProvenance" FOR EACH ROW EXECUTE FUNCTION reject_immutable_mutation();

CREATE FUNCTION protect_run_inputs() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(NEW."scenarioId",NEW."simulatedStart",NEW."simulatedEnd",NEW."inputSnapshotJson",NEW."configurationVersion",NEW."engineVersion",NEW."simulationSeed",NEW."inputHash") IS DISTINCT FROM ROW(OLD."scenarioId",OLD."simulatedStart",OLD."simulatedEnd",OLD."inputSnapshotJson",OLD."configurationVersion",OLD."engineVersion",OLD."simulationSeed",OLD."inputHash") THEN
  RAISE EXCEPTION 'Run input is immutable; create a new run' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER run_inputs_immutable BEFORE UPDATE ON "SimulationRun" FOR EACH ROW EXECUTE FUNCTION protect_run_inputs();

CREATE FUNCTION protect_approved_assumption() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status <> 'PROPOSED' THEN RAISE EXCEPTION 'Reviewed assumptions require a new version' USING ERRCODE='23514'; END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 IF NEW.status = 'APPROVED' AND ROW(NEW.parameter,NEW."valueJson",NEW.unit,NEW.rationale,NEW."sourceReference",NEW."datasetKind",NEW.version,NEW."contentHash") IS DISTINCT FROM ROW(OLD.parameter,OLD."valueJson",OLD.unit,OLD.rationale,OLD."sourceReference",OLD."datasetKind",OLD.version,OLD."contentHash") THEN RAISE EXCEPTION 'Approval cannot change reviewed content' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER assumption_review BEFORE UPDATE OR DELETE ON "DataAssumption" FOR EACH ROW EXECUTE FUNCTION protect_approved_assumption();

CREATE FUNCTION operational_material_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (SELECT "datasetKind" FROM "Material" WHERE id=NEW."materialId") <> 'ACTUAL' THEN RAISE EXCEPTION 'Synthetic material is excluded from operational inventory' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER actual_balance BEFORE INSERT OR UPDATE ON "InventoryBalance" FOR EACH ROW EXECUTE FUNCTION operational_material_only();
CREATE TRIGGER actual_event BEFORE INSERT ON "InventoryEvent" FOR EACH ROW EXECUTE FUNCTION operational_material_only();
CREATE TRIGGER actual_reservation BEFORE INSERT OR UPDATE ON "InventoryReservation" FOR EACH ROW EXECUTE FUNCTION operational_material_only();
CREATE TRIGGER actual_replenishment BEFORE INSERT OR UPDATE ON "ReplenishmentOrder" FOR EACH ROW EXECUTE FUNCTION operational_material_only();
CREATE TRIGGER actual_rule BEFORE INSERT OR UPDATE ON "KanbanRule" FOR EACH ROW EXECUTE FUNCTION operational_material_only();
CREATE FUNCTION protect_material_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(NEW."unitOfMeasure",NEW."datasetKind",NEW."catalogNamespace",NEW."partNumber") IS DISTINCT FROM ROW(OLD."unitOfMeasure",OLD."datasetKind",OLD."catalogNamespace",OLD."partNumber") AND (EXISTS(SELECT 1 FROM "InventoryBalance" WHERE "materialId"=OLD.id) OR EXISTS(SELECT 1 FROM "BillOfMaterial" WHERE "materialId"=OLD.id) OR EXISTS(SELECT 1 FROM "InventoryEvent" WHERE "materialId"=OLD.id)) THEN
  RAISE EXCEPTION 'Referenced material identity and units are immutable' USING ERRCODE='23514';
 END IF; RETURN NEW;
END; $$;
CREATE TRIGGER material_identity BEFORE UPDATE ON "Material" FOR EACH ROW EXECUTE FUNCTION protect_material_identity();

CREATE FUNCTION prevent_location_cycle() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 -- Serialize hierarchy edits; production transactions also use SERIALIZABLE isolation.
 PERFORM pg_advisory_xact_lock(810401);
 IF NEW."parentLocationId"=NEW.id OR EXISTS (
 WITH RECURSIVE ancestors AS (
 SELECT id,"parentLocationId" FROM "InventoryLocation" WHERE id=NEW."parentLocationId"
 UNION SELECT p.id,p."parentLocationId" FROM "InventoryLocation" p JOIN ancestors a ON p.id=a."parentLocationId"
 ) SELECT 1 FROM ancestors WHERE id=NEW.id
 ) THEN RAISE EXCEPTION 'Location hierarchy cannot contain cycles' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER location_tree BEFORE INSERT OR UPDATE OF "parentLocationId" ON "InventoryLocation" FOR EACH ROW EXECUTE FUNCTION prevent_location_cycle();
