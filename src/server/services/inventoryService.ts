import "server-only";
import { Prisma, PrismaClient } from "@prisma/client";
import { inventoryEventSchema } from "@/domain/manufacturing/schemas";
import { assertUnitQuantity } from "@/domain/manufacturing/quantities";
import { contentHash } from "./contentHash";
import { DomainError, serializable } from "./transaction";

export async function postInventoryEvent(db: PrismaClient, input: unknown) {
  const parsed = inventoryEventSchema.parse(input);
  const data = {
    ...parsed,
    quantity: new Prisma.Decimal(parsed.quantity).toString(),
    occurredAt: new Date(parsed.occurredAt).toISOString(),
  };
  const payloadHash = contentHash(data);
  return serializable(db, async (tx) => {
    const prior = await tx.inventoryEvent.findUnique({
      where: {
        sourceSystem_externalEventId: {
          sourceSystem: data.sourceSystem,
          externalEventId: data.externalEventId,
        },
      },
    });
    if (prior) {
      if (prior.payloadHash !== payloadHash)
        throw new DomainError(
          "IDEMPOTENCY_CONFLICT",
          "Event key was already used with different content",
        );
      return prior;
    }
    const material = await tx.material.findUniqueOrThrow({
      where: { id: data.materialId },
    });
    if (material.datasetKind !== "ACTUAL")
      throw new DomainError(
        "SIMULATION_ISOLATION",
        "Synthetic material cannot change operational inventory",
      );
    assertUnitQuantity(material.unitOfMeasure, data.quantity);
    const quantity = new Prisma.Decimal(data.quantity);
    // Serializable transactions protect reads, upserts and conditional debits together.
    for (const locationId of [data.sourceLocationId, data.destinationLocationId]
      .filter((id): id is string => Boolean(id))
      .sort()) {
      await tx.inventoryBalance.upsert({
        where: {
          materialId_locationId: { materialId: data.materialId, locationId },
        },
        create: { materialId: data.materialId, locationId },
        update: {},
      });
    }
    if (data.sourceLocationId) {
      const where = {
        materialId_locationId: {
          materialId: data.materialId,
          locationId: data.sourceLocationId,
        },
      };
      const balance = await tx.inventoryBalance.findUniqueOrThrow({ where });
      let reservedDebit = new Prisma.Decimal(0);
      if (data.eventType === "CONSUMPTION") {
        const reservation = await tx.inventoryReservation.findUniqueOrThrow({
          where: { id: data.reservationId! },
        });
        if (
          reservation.status !== "ACTIVE" ||
          reservation.materialId !== data.materialId ||
          reservation.locationId !== data.sourceLocationId ||
          !reservation.quantity.equals(quantity)
        ) {
          throw new DomainError(
            "INVALID_RESERVATION",
            "Consumption must match an active reservation exactly",
          );
        }
        reservedDebit = quantity;
        await tx.inventoryReservation.update({
          where: { id: reservation.id },
          data: { status: "CONSUMED" },
        });
      }
      if (
        balance.quantityOnHand
          .minus(balance.quantityReserved)
          .plus(reservedDebit)
          .lessThan(quantity)
      )
        throw new DomainError(
          "INSUFFICIENT_STOCK",
          "Available source inventory is insufficient",
        );
      await tx.inventoryBalance.update({
        where,
        data: {
          quantityOnHand: { decrement: quantity },
          quantityReserved: { decrement: reservedDebit },
        },
      });
    }
    if (data.destinationLocationId) {
      const where = {
        materialId_locationId: {
          materialId: data.materialId,
          locationId: data.destinationLocationId,
        },
      };
      const balance = await tx.inventoryBalance.findUniqueOrThrow({ where });
      if (
        balance.quantityOnHand.plus(quantity).lessThan(balance.quantityReserved)
      )
        throw new DomainError(
          "INSUFFICIENT_STOCK",
          "Adjustment would reduce stock below reservations",
        );
      await tx.inventoryBalance.update({
        where,
        data: { quantityOnHand: { increment: quantity } },
      });
    }
    return tx.inventoryEvent.create({
      data: { ...data, occurredAt: new Date(data.occurredAt), payloadHash },
    });
  });
}
