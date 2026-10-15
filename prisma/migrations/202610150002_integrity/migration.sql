ALTER TABLE "Material" ADD CONSTRAINT "material_required" CHECK (length(trim("catalogNamespace"))>0 AND length(trim("partNumber"))>0 AND length(trim("sourceReference"))>0 AND "unitOfMeasure" IN ('EA','KIT','M','KG','L'));
CREATE FUNCTION validate_bom_material() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE material_kind "DatasetKind"; material_unit text;
BEGIN
 SELECT "datasetKind","unitOfMeasure" INTO material_kind,material_unit FROM "Material" WHERE id=NEW."materialId";
 IF material_kind <> (SELECT "datasetKind" FROM "RackModel" WHERE id=NEW."rackModelId") THEN RAISE EXCEPTION 'BOM dataset kinds must match' USING ERRCODE='23514'; END IF;
 IF material_unit IN ('EA','KIT') AND NEW."quantityPerRack" <> trunc(NEW."quantityPerRack") THEN RAISE EXCEPTION 'Indivisible material requires whole BOM quantity' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER bom_material BEFORE INSERT OR UPDATE ON "BillOfMaterial" FOR EACH ROW EXECUTE FUNCTION validate_bom_material();
CREATE FUNCTION operational_model_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (SELECT "datasetKind" FROM "RackModel" WHERE id=NEW."rackModelId") <> 'ACTUAL' THEN RAISE EXCEPTION 'Synthetic model cannot create operational production orders' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER actual_production BEFORE INSERT OR UPDATE ON "ProductionOrder" FOR EACH ROW EXECUTE FUNCTION operational_model_only();
CREATE FUNCTION protect_model_kind() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."datasetKind" <> OLD."datasetKind" AND (EXISTS(SELECT 1 FROM "ProductionOrder" WHERE "rackModelId"=OLD.id) OR EXISTS(SELECT 1 FROM "BillOfMaterial" WHERE "rackModelId"=OLD.id)) THEN RAISE EXCEPTION 'Referenced model dataset kind is immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER model_kind BEFORE UPDATE ON "RackModel" FOR EACH ROW EXECUTE FUNCTION protect_model_kind();
CREATE FUNCTION validate_reservation_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status <> 'ACTIVE' OR ROW(NEW."materialId",NEW."locationId",NEW."productionOrderId",NEW."operationKey",NEW.quantity,NEW."idempotencyKey",NEW."payloadHash") IS DISTINCT FROM ROW(OLD."materialId",OLD."locationId",OLD."productionOrderId",OLD."operationKey",OLD.quantity,OLD."idempotencyKey",OLD."payloadHash") THEN
 RAISE EXCEPTION 'Reservation content is immutable and closed reservations cannot change' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER reservation_transition BEFORE UPDATE ON "InventoryReservation" FOR EACH ROW EXECUTE FUNCTION validate_reservation_transition();
CREATE FUNCTION validate_consumption_reservation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."eventType"='CONSUMPTION' AND NOT EXISTS(SELECT 1 FROM "InventoryReservation" r WHERE r.id=NEW."reservationId" AND r.status='CONSUMED' AND r."materialId"=NEW."materialId" AND r."locationId"=NEW."sourceLocationId" AND r.quantity=NEW.quantity) THEN RAISE EXCEPTION 'Consumption must match its consumed reservation' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER consumption_reservation BEFORE INSERT ON "InventoryEvent" FOR EACH ROW EXECUTE FUNCTION validate_consumption_reservation();
CREATE FUNCTION validate_indivisible_quantity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (SELECT "unitOfMeasure" FROM "Material" WHERE id=NEW."materialId") IN ('EA','KIT') THEN
  IF TG_TABLE_NAME='InventoryBalance' THEN
   IF NEW."quantityOnHand" <> trunc(NEW."quantityOnHand") OR NEW."quantityReserved" <> trunc(NEW."quantityReserved") THEN RAISE EXCEPTION 'Indivisible balance must be whole' USING ERRCODE='23514'; END IF;
  ELSE
   IF NEW.quantity <> trunc(NEW.quantity) THEN RAISE EXCEPTION 'Indivisible quantity must be whole' USING ERRCODE='23514'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER whole_balance BEFORE INSERT OR UPDATE ON "InventoryBalance" FOR EACH ROW EXECUTE FUNCTION validate_indivisible_quantity();
CREATE TRIGGER whole_event BEFORE INSERT ON "InventoryEvent" FOR EACH ROW EXECUTE FUNCTION validate_indivisible_quantity();
CREATE TRIGGER whole_reservation BEFORE INSERT OR UPDATE ON "InventoryReservation" FOR EACH ROW EXECUTE FUNCTION validate_indivisible_quantity();
