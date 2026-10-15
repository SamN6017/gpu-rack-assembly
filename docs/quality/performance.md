# Performance Benchmarks & Resource Budgets

## 1. Performance Overview

The discrete-event simulation engine and projection architecture are optimized for high-throughput calculation, low memory overhead, and responsive 60 FPS 3D rendering.

Automated benchmarks are codified in `tests/performance/` and executed via `npm run test:performance`.

## 2. Resource Budgets vs. Measured Performance

| Benchmark Dimension | Measured Result | Budget Target | Status |
| :--- | :--- | :--- | :--- |
| **6-Month Simulation Runtime** | **157 ms** | $< 3,000\text{ ms}$ | **PASSED** (19x margin) |
| **Simulation Heap Memory Growth** | **~24 MB** | $< 150\text{ MB}$ | **PASSED** (6x margin) |
| **Full Analytics Aggregation Time** | **14 ms** | $< 250\text{ ms}$ | **PASSED** (17x margin) |
| **Concurrent Execution (4 Runs)** | **187 ms** | $< 2,500\text{ ms}$ | **PASSED** (13x margin) |
| **3D Playback Projection Latency** | **0.023 ms / frame** | $< 0.25\text{ ms / frame}$ | **PASSED** (10x margin) |
| **Frame Rate Capacity** | **> 40,000 FPS** (CPU projection) | $> 60\text{ FPS}$ | **PASSED** |

## 3. Scalability Limits & Supported Capacities

1. **Simulation Horizon**:
   - Supported default: 6 calendar months (130 working days, 1,040 working hours).
   - Maximum validated duration: 24 continuous calendar months.
2. **Event History Storage**:
   - Typical 6-month synthetic run: ~1,500 to ~4,500 discrete events.
   - Database persistence size: ~1.2 MB JSON payload per completed run.
   - Timeline pagination: 100 events per page loaded in $< 15\text{ ms}$.
3. **Database Performance**:
   - Connection pool: Min 2, Max 10 connections.
   - Transaction timeout: 10 seconds.
   - PostgreSQL composite indexes ensure $O(\log N)$ event sequence lookups.
