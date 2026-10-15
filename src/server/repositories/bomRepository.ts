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

export function getBomById(db: PrismaClient, id: string) {
  idSchema.parse(id);
  return db.billOfMaterial.findUniqueOrThrow({
    where: { id },
    include: {
      material: true,
      workstation: true,
      rackModel: true,
    },
  });
}

export function updateBomWorkstationMapping(
  db: PrismaClient,
  id: string,
  input: {
    workstationId?: string;
    quantityPerRack?: string;
    effectiveTo?: string | null;
    sourceReference?: string;
  },
) {
  idSchema.parse(id);
  return serializable(db, async (tx) => {
    const existing = await tx.billOfMaterial.findUniqueOrThrow({
      where: { id },
      include: { material: true },
    });

    if (input.workstationId) {
      idSchema.parse(input.workstationId);
      await tx.workstation.findUniqueOrThrow({
        where: { id: input.workstationId },
      });
    }

    if (input.quantityPerRack) {
      assertUnitQuantity(existing.material.unitOfMeasure, input.quantityPerRack);
    }

    return tx.billOfMaterial.update({
      where: { id },
      data: {
        ...(input.workstationId ? { workstationId: input.workstationId } : {}),
        ...(input.quantityPerRack ? { quantityPerRack: input.quantityPerRack } : {}),
        ...(input.effectiveTo !== undefined ? { effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null } : {}),
        sourceReference: input.sourceReference || "ADMIN_WORKSTATION_REASSIGNMENT",
      },
      include: {
        material: true,
        workstation: true,
        rackModel: true,
      },
    });
  });
}

