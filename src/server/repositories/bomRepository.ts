import "server-only";
import { PrismaClient } from "@prisma/client";
import { bomSchema, idSchema } from "@/domain/manufacturing/schemas";
import { assertUnitQuantity } from "@/domain/manufacturing/quantities";
import { DomainError, serializable } from "../services/transaction";
export function createBom(db: PrismaClient, input: unknown) {
  const data = bomSchema.parse(input);
  return serializable(db, async (tx) => {
    const material = await tx.material.findUniqueOrThrow({
      where: { id: data.materialId },
    });
    const model = await tx.rackModel.findUniqueOrThrow({
      where: { id: data.rackModelId },
    });
    if (model.datasetKind !== material.datasetKind)
      throw new DomainError(
        "DATASET_MISMATCH",
        "BOM model and material must belong to the same dataset kind",
      );
    assertUnitQuantity(material.unitOfMeasure, data.quantityPerRack);
    return tx.billOfMaterial.create({
      data: {
        ...data,
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
      },
    });
  });
}
export function effectiveBom(db: PrismaClient, rackModelId: string, at: Date) {
  idSchema.parse(rackModelId);
  if (!Number.isFinite(at.getTime()))
    throw new DomainError(
      "INVALID_DATE",
      "A valid BOM effective date is required",
      400,
    );
  return db.billOfMaterial.findMany({
    where: {
      rackModelId,
      effectiveFrom: { lte: at },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
    },
    orderBy: [{ workstationId: "asc" }, { materialId: "asc" }],
  });
}
