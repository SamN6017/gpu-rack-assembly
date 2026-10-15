ALTER TABLE "InventoryEvent" ADD CONSTRAINT "operational_source_only" CHECK (upper("sourceSystem") NOT IN ('SIMULATION','REPLAY'));
