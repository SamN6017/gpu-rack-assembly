import "dotenv/config";
import { getDb } from "../src/server/db/client";
import { processNextRun } from "../src/server/workers/simulationWorker";
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
async function main() {
  const db = getDb();
  console.log("Simulation worker ready");
  while (!stopping) {
    const worked = await processNextRun(db);
    if (!worked) await new Promise((r) => setTimeout(r, 1000));
  }
  await db.$disconnect();
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Worker failed");
  process.exitCode = 1;
});
