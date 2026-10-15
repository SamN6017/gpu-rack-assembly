import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import { db, setupDatabase, clearDatabase, fixture } from "./databaseHarness";
import { postInventoryEvent } from "@/server/services/inventoryService";
import {
  reserveInventory,
  releaseReservation,
} from "@/server/services/reservationService";
beforeAll(setupDatabase);
beforeEach(clearDatabase);
afterAll(() => db.$disconnect());
describe("operational inventory transactions", () => {
  it("reconciles receipt, transfer, consumption, return and adjustment", async () => {
    const f = await fixture();
    await postInventoryEvent(db, f.event());
    await postInventoryEvent(
      db,
      f.event({
        eventType: "TRANSFER",
        sourceLocationId: f.source.id,
        destinationLocationId: f.destination.id,
        quantity: "4",
      }),
    );
    const reservation = await reserveInventory(db, {
      materialId: f.material.id,
      locationId: f.destination.id,
      productionOrderId: f.order.id,
      operationKey: "station-1",
      quantity: "3",
      idempotencyKey: "reserve-1",
    });
    const consume = f.event({
      eventType: "CONSUMPTION",
      sourceLocationId: f.destination.id,
      destinationLocationId: null,
      quantity: "3",
      reservationId: reservation.id,
    });
    await postInventoryEvent(db, consume);
    await postInventoryEvent(db, consume);
    await postInventoryEvent(
      db,
      f.event({
        eventType: "RETURN",
        destinationLocationId: f.source.id,
        quantity: "2",
      }),
    );
    await postInventoryEvent(
      db,
      f.event({
        eventType: "ADJUSTMENT",
        destinationLocationId: f.source.id,
        quantity: "-1",
        reason: "Count correction",
      }),
    );
    const balances = await db.inventoryBalance.findMany();
    expect(
      balances
        .find((b) => b.locationId === f.source.id)
        ?.quantityOnHand.toString(),
    ).toBe("7");
    expect(
      balances
        .find((b) => b.locationId === f.destination.id)
        ?.quantityOnHand.toString(),
    ).toBe("1");
    expect(balances.every((b) => b.quantityReserved.isZero())).toBe(true);
    expect(await db.inventoryEvent.count()).toBe(5);
  });
  it("makes identical retries idempotent and rejects changed payload", async () => {
    const f = await fixture();
    const e = f.event();
    const results = await Promise.all([
      postInventoryEvent(db, e),
      postInventoryEvent(db, e),
    ]);
    expect(results[0].id).toBe(results[1].id);
    await expect(
      postInventoryEvent(db, { ...e, quantity: "11" }),
    ).rejects.toThrow("different content");
    expect(await db.inventoryEvent.count()).toBe(1);
  });
  it("allows only one of two competing withdrawals and conserves stock", async () => {
    const f = await fixture();
    await postInventoryEvent(db, f.event());
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        postInventoryEvent(
          db,
          f.event({
            eventType: "TRANSFER",
            sourceLocationId: f.source.id,
            destinationLocationId: f.destination.id,
            quantity: "7",
          }),
        ),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const b = await db.inventoryBalance.findMany();
    expect(b.reduce((s, x) => s + Number(x.quantityOnHand), 0)).toBe(10);
    expect(b.every((x) => x.quantityOnHand.gte(0))).toBe(true);
  });
  it("rolls back debit when destination does not exist", async () => {
    const f = await fixture();
    await postInventoryEvent(db, f.event());
    await expect(
      postInventoryEvent(
        db,
        f.event({
          eventType: "TRANSFER",
          sourceLocationId: f.source.id,
          destinationLocationId: "00000000-0000-4000-8000-999999999999",
          quantity: "4",
        }),
      ),
    ).rejects.toThrow();
    expect(
      (await db.inventoryBalance.findFirstOrThrow()).quantityOnHand.toString(),
    ).toBe("10");
    expect(await db.inventoryEvent.count()).toBe(1);
  });
  it("protects reserved stock and releases exactly once", async () => {
    const f = await fixture();
    await postInventoryEvent(db, f.event());
    const input = {
      materialId: f.material.id,
      locationId: f.source.id,
      productionOrderId: f.order.id,
      operationKey: "one",
      quantity: "8",
      idempotencyKey: "key",
    };
    const a = await reserveInventory(db, input);
    expect((await reserveInventory(db, input)).id).toBe(a.id);
    await expect(
      postInventoryEvent(
        db,
        f.event({
          eventType: "TRANSFER",
          sourceLocationId: f.source.id,
          destinationLocationId: f.destination.id,
          quantity: "3",
        }),
      ),
    ).rejects.toThrow();
    await expect(
      postInventoryEvent(
        db,
        f.event({ eventType: "ADJUSTMENT", quantity: "-3", reason: "Count" }),
      ),
    ).rejects.toThrow();
    await releaseReservation(db, a.id);
    await releaseReservation(db, a.id);
    expect(
      (
        await db.inventoryBalance.findFirstOrThrow()
      ).quantityReserved.toString(),
    ).toBe("0");
  });
  it("prevents duplicate consumption under a different event key", async () => {
    const f = await fixture();
    await postInventoryEvent(db, f.event());
    const r = await reserveInventory(db, {
      materialId: f.material.id,
      locationId: f.source.id,
      productionOrderId: f.order.id,
      operationKey: "one",
      quantity: "2",
      idempotencyKey: "key",
    });
    const e = f.event({
      eventType: "CONSUMPTION",
      sourceLocationId: f.source.id,
      destinationLocationId: null,
      quantity: "2",
      reservationId: r.id,
    });
    await postInventoryEvent(db, e);
    await expect(
      postInventoryEvent(db, { ...e, externalEventId: "different" }),
    ).rejects.toThrow();
    expect(
      (await db.inventoryBalance.findFirstOrThrow()).quantityOnHand.toString(),
    ).toBe("8");
  });
  it("does not put synthetic scenario stock in operational balances", async () => {
    const f = await fixture();
    await db.material.update({
      where: { id: f.material.id },
      data: { datasetKind: "SYNTHETIC" },
    });
    await expect(postInventoryEvent(db, f.event())).rejects.toThrow(
      "Synthetic",
    );
    await expect(
      db.inventoryBalance.create({
        data: {
          materialId: f.material.id,
          locationId: f.source.id,
          quantityOnHand: 10,
        },
      }),
    ).rejects.toThrow();
    expect(await db.inventoryBalance.count()).toBe(0);
  });
});
it("concurrent reservations never oversubscribe available inventory", async () => {
  const f = await fixture();
  await postInventoryEvent(db, f.event());
  const results = await Promise.allSettled(
    ["a", "b"].map((key) =>
      reserveInventory(db, {
        materialId: f.material.id,
        locationId: f.source.id,
        productionOrderId: f.order.id,
        operationKey: key,
        quantity: "7",
        idempotencyKey: key,
      }),
    ),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(
    (await db.inventoryBalance.findFirstOrThrow()).quantityReserved.toString(),
  ).toBe("7");
});
it("preserves exact decimal accounting for divisible units", async () => {
  const f = await fixture();
  await db.material.update({
    where: { id: f.material.id },
    data: { unitOfMeasure: "KG" },
  });
  await postInventoryEvent(db, f.event({ quantity: "0.3" }));
  await postInventoryEvent(
    db,
    f.event({
      eventType: "TRANSFER",
      sourceLocationId: f.source.id,
      destinationLocationId: f.destination.id,
      quantity: "0.1",
    }),
  );
  expect(
    (
      await db.inventoryBalance.findUniqueOrThrow({
        where: {
          materialId_locationId: {
            materialId: f.material.id,
            locationId: f.source.id,
          },
        },
      })
    ).quantityOnHand.toString(),
  ).toBe("0.2");
});
it("rejects simulation and replay writes even with actual material IDs", async () => {
  const f = await fixture();
  for (const sourceSystem of ["SIMULATION", "REPLAY"])
    await expect(
      postInventoryEvent(db, f.event({ sourceSystem })),
    ).rejects.toThrow();
  expect(await db.inventoryEvent.count()).toBe(0);
});
