# Security Architecture & Boundary Verification

## 1. Security Overview

The digital twin isolates operational manufacturing data, guards against code and formula injection, and enforces strict boundary authorization across all API routes and data transports.

## 2. Key Security Mitigations

### 2.1 Formula Injection Prevention (CWE-1236)
- **Vulnerability**: Spreadsheets (Excel, Google Sheets, LibreOffice) treat cell strings beginning with `=`, `+`, `-`, `@`, `\t`, `\r`, or `%` as formulas or shell execute commands.
- **Mitigation**: All user-supplied and analytical text exported to CSV or Excel passes through `safeCell()` in `src/reports/exportSafety.ts`. Trigger characters (even if preceded by leading whitespace) are prepended with an apostrophe (`'`), neutralizing executable execution.

### 2.2 Operational Inventory Isolation
- **Vulnerability**: Synthetic simulation events or unverified telemetry corrupting production inventory ledgers (`InventoryEvent`, `InventoryBalance`).
- **Mitigation**:
  - Schema constraints reject `SIMULATION` or `REPLAY` as valid `sourceSystem` values in operational inventory tables.
  - Simulation runs write exclusively to `SimulationEvent` and `SimulationRun`.
  - Ingested live telemetry writes exclusively to `ManufacturingInboxEvent`.
  - Operational inventory tables remain 100% pristine throughout simulation and telemetry testing.

### 2.3 Read-Only Capability Enforcement
- **Vulnerability**: Telemetry connections (WebSockets, SSE, MQTT, REST) accidentally sending equipment start, stop, or queue commands to physical factory equipment.
- **Mitigation**:
  - Transport interfaces (`ReadOnlyEventAdapter`) expose only subscription and connection methods.
  - `RealtimeAssemblyProvider` and `ReplayAssemblyProvider` explicitly throw errors on all mutating methods (`addRackToQueue`, `advanceStation`, `toggleStationBlock`, `resetSimulation`).

### 2.4 API Token Authorization & Timing-Attack Resistance
- **Vulnerability**: Unauthorized access to master data or simulation endpoints, and timing attacks on token verification.
- **Mitigation**:
  - `authorize(request)` validates the `MANUFACTURING_API_TOKEN` using `crypto.timingSafeEqual` over fixed-length buffer comparisons.
  - Browser sessions require valid same-origin headers for state-mutating requests (`POST`, `PUT`, `DELETE`).
  - Secret credentials and tokens are referenced in environment variables and never logged or serialized into client responses.
