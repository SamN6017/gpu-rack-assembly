import "server-only";
import { Prisma, PrismaClient } from "@prisma/client";
import { idSchema, reservationSchema } from "@/domain/manufacturing/schemas";
import { assertUnitQuantity } from "@/domain/manufacturing/quantities";
import { contentHash } from "./contentHash";
import { DomainError, serializable } from "./transaction";
export async function reserveInventory(db: PrismaClient, input: unknown) {
  const parsed = reservationSchema.parse(input);
  const data = {
    ...parsed,
    quantity: new Prisma.Decimal(parsed.quantity).toString(),
  };
  const payloadHash = contentHash(data);
  return serializable(db, async (tx) => {
    const prior = await tx.inventoryReservation.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
    });
    if (prior) {
      if (prior.payloadHash !== payloadHash)
        throw new DomainError(
          "IDEMPOTENCY_CONFLICT",
          "Reservation key has different content",
        );
      return prior;
    }
    const material = await tx.material.findUniqueOrThrow({
      where: { id: data.materialId },
    });
    const order = await tx.productionOrder.findUniqueOrThrow({
      where: { id: data.productionOrderId },
      include: { rackModel: true },
    });
    if (
      material.datasetKind !== "ACTUAL" ||
      order.rackModel.datasetKind !== "ACTUAL"
    )
      throw new DomainError(
        "SIMULATION_ISOLATION",
        "Operational reservations require actual master data",
      );
    if (["COMPLETED", "CANCELLED"].includes(order.status))
      throw new DomainError(
        "ORDER_CLOSED",
        "Cannot reserve for a closed production order",
      );
    assertUnitQuantity(material.unitOfMeasure, data.quantity);
    const where = {
      materialId_locationId: {
        materialId: data.materialId,
        locationId: data.locationId,
      },
    };
    const balance = await tx.inventoryBalance.findUnique({ where });
    if (
      !balance ||
      balance.quantityOnHand
        .minus(balance.quantityReserved)
        .lessThan(data.quantity)
    )
      throw new DomainError(
        "INSUFFICIENT_STOCK",
        "Available inventory is insufficient",
      );
    await tx.inventoryBalance.update({
      where,
      data: { quantityReserved: { increment: data.quantity } },
    });
    return tx.inventoryReservation.create({ data: { ...data, payloadHash } });
  });
}
export async function releaseReservation(db: PrismaClient, id: string) {
  idSchema.parse(id);
  return serializable(db, async (tx) => {
    const reservation = await tx.inventoryReservation.findUniqueOrThrow({
      where: { id },
    });
    if (reservation.status === "RELEASED") return reservation;
    if (reservation.status !== "ACTIVE")
      throw new DomainError(
        "RESERVATION_CLOSED",
        "Consumed reservations cannot be released",
      );
    await tx.inventoryBalance.update({
      where: {
        materialId_locationId: {
          materialId: reservation.materialId,
          locationId: reservation.locationId,
        },
      },
      data: { quantityReserved: { decrement: reservation.quantity } },
    });
    return tx.inventoryReservation.update({
      where: { id },
      data: { status: "RELEASED" },
    });
  });
}
