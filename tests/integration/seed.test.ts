import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { db, setupDatabase, clearDatabase } from "./databaseHarness";
import { seedFoundation } from "@/server/services/seedService";
beforeAll(setupDatabase);
beforeEach(clearDatabase);
afterAll(() => db.$disconnect());
it("seeds five stable stations without fabricating stock or overwriting edits", async () => {
  await seedFoundation(db);
  const first = await db.workstation.findMany({ orderBy: { sequence: "asc" } });
  await seedFoundation(db);
  expect(await db.workstation.count()).toBe(5);
  expect(first.map((x) => x.stationCode)).toEqual(
    [1, 2, 3, 4, 5].map((n) => `STATION-${n}`),
  );
  expect(first.every((x) => x.cycleTimeSeconds === 720)).toBe(true);
  await db.workstation.update({
    where: { id: first[0].id },
    data: { cycleTimeSeconds: 800 },
  });
  await seedFoundation(db);
  expect(
    (await db.workstation.findUniqueOrThrow({ where: { id: first[0].id } }))
      .cycleTimeSeconds,
  ).toBe(800);
  expect(await db.material.count()).toBe(0);
  expect(await db.inventoryEvent.count()).toBe(0);
  expect(await db.inventoryBalance.count()).toBe(0);
});
