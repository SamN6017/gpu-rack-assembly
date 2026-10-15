# Phase 3 — Independent Discrete-Event Simulation Engine

## Implementation

Introduced a pure-TypeScript discrete-event manufacturing simulation engine
with no React or browser imports. The engine is deterministic (same seed/config
yields identical event streams) and runs entirely in a worker process or
in-browser for live playback.

### New modules created

| Path | Purpose |
| :--- | :--- |
| `src/simulation/core/types.ts` | Zod-validated `SimulationConfig`, all event/snapshot/result types |
| `src/simulation/core/eventQueue.ts` | Binary min-heap ordered by `(time, priority, sequence)` |
| `src/simulation/core/calendar.ts` | Calendar helpers: `addMonths`, shift/fault-aware `addWork`, `workingSeconds` |
| `src/simulation/core/engine.ts` | `ManufacturingEngine` — 5-station line, Kanban replenishment, equipment faults, finite warehouse, exactly-once material consumption |
| `src/server/services/simulationService.ts` | `saveScenario`, `enqueueRun`, `controlRun` (pause/resume/cancel) |
| `src/server/repositories/simulationRepository.ts` | Typed query functions: `listRuns`, `getRun`, `listRunEvents`, `getRunSnapshots` |
| `src/server/workers/simulationWorker.ts` | `processNextRun` — optimistic lease, heartbeat, batched event persistence, run isolation |
| `scripts/run-simulation-worker.ts` | Long-running worker process with SIGINT/SIGTERM handling |
| `src/services/simulationAssemblyProvider.ts` | `SimulationAssemblyProvider` (live in-browser) + `SavedRunProvider` (replay) |
| `src/services/assemblySnapshotProjector.ts` | Projects engine `Snapshot` → `AssemblySnapshot` for the existing 3D scene |
| `src/services/providerFactory.ts` | `createProvider(mode, payload?)` — typed overloads for all three provider modes |
| `src/analytics/runAnalytics.ts` | Post-run analytics: daily/monthly production, material utilization, station utilization, stockouts, throughput |
| `src/three/factoryLayout.ts` | Authoritative coordinate constants shared by camera, collision, projector |
| `src/domain/manufacturing/scenarioPresets.ts` | `demoConfig()` from synthetic data; `applyPreset` for 5 named variants |
| `src/app/api/scenarios/route.ts` | `GET` list / `POST` create scenario |
| `src/app/api/simulation-runs/route.ts` | `GET` list / `POST` enqueue run |
| `src/app/api/simulation-runs/[id]/route.ts` | `GET` run detail / `POST` control (pause/resume/cancel) |
| `src/app/api/simulation-runs/[id]/events/route.ts` | `GET` paginated events (after/limit) |
| `src/app/api/simulation-runs/[id]/snapshots/route.ts` | `GET` paginated snapshots from run summary |
| `tests/unit/manufacturingEngine.test.ts` | 6 engine unit tests (queue ordering, calendar, determinism, replenishment, controls, faults) |
| `tests/integration/simulationRunPersistence.test.ts` | End-to-end: queue → process → COMPLETED; events persisted; operational inventory unchanged |

### Modified modules

`src/store/assemblyStore.ts` — `useProvider`/`dispose`/`stepEvent`/`stepMinute`/`jumpTo` wired through `IAssemblyDataProvider`; legacy demo provider retained and selectable. Mode, `virtualTime`, `readOnly` tracked in store state.

`src/types/assembly.ts` — `mode`, `virtualTime`, `readOnly`, `manufacturing`, `manufacturingConfig` added to `AssemblySnapshot`.

## Verification

- **6/6** engine unit tests passed (event queue, calendar, determinism with stock conservation, replenishment, controls, equipment faults).
- **1/1** simulation run persistence integration test passed against the local test database. Run completes with >100 events; no operational `InventoryEvent` or `InventoryBalance` records created.
- **25/25** unit tests total (all phases). **25/25** integration tests total (all phases).
- Typecheck clean. Production build passed.

## Gate checklist

| Requirement | Status |
| :--- | :---: |
| 5 sequential stations with all event types | ✅ |
| Priority queue ordering by time, priority, insertion | ✅ |
| Shift/weekend calendar respects UTC timezone | ✅ |
| Equipment fault windows delay but preserve work | ✅ |
| Finite warehouse with material reservation and exactly-once consumption | ✅ |
| Blocked/resumed behavior on material shortage | ✅ |
| Same seed + config → identical event stream and totals | ✅ |
| No React imports in engine or calendar | ✅ |
| Worker runs to completion; heartbeat keeps lease alive | ✅ |
| Restart-safe: stale worker replaced by a new lease | ✅ |
| Simulation cannot write operational `InventoryEvent` or `InventoryBalance` | ✅ |
| Simulation snapshots API route with bounded pagination | ✅ |
| Provider factory decouples mode selection from store | ✅ |
| Legacy mock provider still selectable (parity regression) | ✅ |

## Assumptions and known limits

- Six-month deterministic run completes in ~250 ms (1-month demo in ~30 ms) on the local machine. Performance budget recorded before setting a supported upper demand limit.
- Events are persisted in a single `$transaction` up to ~10,000 per run in 1,000-row batches; very large runs may require chunked commit or streaming in a later phase.
- Snapshots are stored in `summaryJson` for this phase; a dedicated `SimulationSnapshot` table is reserved in the target architecture and will be migrated in Phase 5 or 10 if snapshot volume justifies it.
- `providerFactory` exports `SAVED_RUN` mode; the UI entrypoint (loading a completed run into the 3D scene) is wired in Phase 5.

## Setup

No additional setup beyond Phase 1 (`DATABASE_URL`, `TEST_DATABASE_URL`, `npm run db:migrate`). The worker can be started with `npm run worker`.
