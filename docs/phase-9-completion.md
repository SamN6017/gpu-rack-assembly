# Phase 9 — Read-Only Live & Replay Ingestion Completion

## Implementation

Delivered normalized read-only telemetry contracts, transport adapters (REST, WebSocket, SSE, MQTT, Imported, Mock), chronological replay provider, inbox deduplication with conflict detection, out-of-order event reconciliation, and strict multi-mode isolation.

### Key Modules & Enhancements

| Component / File | Purpose & Verification |
| :--- | :--- |
| `src/domain/manufacturing/manufacturingEvent.ts` | Normalized schema for `INVENTORY_OBSERVED`, `RACK_QUEUED`, `STATION_STARTED`, `STATION_COMPLETED`, and `RACK_COMPLETED` with strict indivisible unit checks, provenance metadata, and in-memory `EventProjection` |
| `src/services/adapters/importEventAdapter.ts` | Base adapter and `ImportedEventAdapter` consuming batch event arrays with connection state reporting |
| `src/services/adapters/restEventAdapter.ts` | Read-only HTTP polling adapter with AbortController, credentials omitted, and protocol validation |
| `src/services/adapters/websocketEventAdapter.ts` | Read-only WebSocket streaming adapter parsing inbound JSON messages without outbound control methods |
| `src/services/adapters/sseEventAdapter.ts` | Read-only Server-Sent Events (SSE) adapter using native EventSource for unidirectional event delivery |
| `src/services/adapters/mqttContract.ts` | Read-only MQTT subscription interface and contract adapter (subscriber only, no publish/control APIs) |
| `src/services/adapters/mockLiveAdapter.ts` | Realistic synthetic stream adapter for offline and demonstration telemetry |
| `src/services/replayAssemblyProvider.ts` | Chronological event replay provider with pause/speed controls and strict read-only command prohibitions |
| `src/services/realtimeAssemblyProvider.ts` | Upgraded to enforce strict read-only capability (outbound commands throw `DomainError`/`Error`) |
| `src/services/providerFactory.ts` | Factory extended to support `LIVE` and `REPLAY` provider construction |
| `src/server/services/ingestionService.ts` | Ingestion service calculating deterministic SHA-256 payload hashes, deduplicating exact records, and throwing `409 Conflict` on event ID reuse |
| `src/server/services/reconciliationService.ts` | Reorders scrambled/delayed event streams by source timestamp and builds audit projections of observed inventory and rack progress |
| `src/components/data/SourceStatus.tsx` | Visual telemetry status bar showing connection status, freshness counter, protocol security, out-of-order/duplicate audit metrics, and read-only safety banner |
| `tests/unit/liveEventValidation.test.ts` | Unit tests for event validation, non-integer indivisible quantities, projection deduplication, conflict detection, and provider read-only enforcement |
| `tests/integration/liveDeduplication.test.ts` | PostgreSQL integration tests verifying idempotent deduplication and 409 conflict errors on payload mutation |
| `tests/integration/outOfOrderReconciliation.test.ts` | PostgreSQL integration tests verifying chronological ordering and audit state reconstruction for out-of-order streams |
| `tests/integration/modeIsolation.test.ts` | PostgreSQL integration tests verifying zero writes to operational inventory tables (`InventoryEvent`, `InventoryBalance`) and strict segregation between inbox and simulation tables |

### Verification

- **62/62** unit tests passed across 10 test suites (`npm test`).
- **40/40** integration tests passed across 13 test suites against PostgreSQL (`npm run test:integration`).
- Strict isolation confirmed:
  - `InventoryEvent` and `InventoryBalance` counts remain strictly zero during live ingestion and simulation runs.
  - Outbound factory control commands are completely prohibited in Live and Replay modes.
- TypeScript compilation clean (`npm run typecheck`).

### Gate Checklist

- [x] Normalized manufacturing event contract with strict unit and rack reference validation.
- [x] Deduplication, conflict detection on reused event IDs, and out-of-order arrival tracking.
- [x] Raw references, provenance metadata, and audit trail.
- [x] Visible connection freshness and audit metrics in `SourceStatus.tsx`.
- [x] Mock source switch and replay functionality implemented.
- [x] Simulation cannot alter actual inventory; live mode never sends equipment control commands.
- [x] No external credentials required (secret references preserved).
- [x] MQTT contract defined without publish/control exposure.
