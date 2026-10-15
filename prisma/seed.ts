import "dotenv/config";
import { getDb } from "../src/server/db/client";
import { seedFoundation } from "../src/server/services/seedService";
const db = getDb();
seedFoundation(db)
  .then((count) =>
    console.log(
      `Foundation seeded: ${count} stations. No operational inventory created.`,
    ),
  )
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Seed failed");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
