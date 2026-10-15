"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/components/navigation/OperationsShell";
import { workstationDefaults } from "@/domain/manufacturing/workstationDefaults";
import type {
  SimulationConfig,
  Snapshot,
  SimEvent,
} from "@/simulation/core/types";
import type { RunAnalytics } from "@/analytics/runAnalytics";
export type RunList = {
  id: string;
  status: string;
  createdAt: string;
  scenario: { name: string; datasetKind: string };
};
export type RunDetail = RunList & {
  simulatedStart: string;
  simulatedEnd: string;
  inputHash: string;
  engineVersion: string;
  simulationSeed: number;
  inputSnapshotJson: SimulationConfig;
  summaryJson: {
    final: Snapshot;
    snapshots: Snapshot[];
    analytics: RunAnalytics;
    elapsedMs: number;
    eventCount: number;
    error?: string;
  } | null;
};
function BarChart({
  title,
  values,
  suffix = "",
}: {
  title: string;
  values: { label: string; value: number }[];
  suffix?: string;
}) {
  const max = Math.max(1, ...values.map((v) => v.value));
  return (
    <section className="panel">
      <h2>{title}</h2>
      {!values.length ? (
        <p>No events in this period.</p>
      ) : (
        <div style={{ maxHeight: 300, overflow: "auto" }}>
          {values.map((v, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "130px 1fr 75px",
                gap: 12,
                alignItems: "center",
                margin: "12px 0",
              }}
            >
              <small
                title={v.label}
                style={{ overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {v.label}
              </small>
              <div
                style={{ height: 9, background: "#1b2d43", borderRadius: 4 }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${(v.value / max) * 100}%`,
                    minWidth: v.value ? 2 : 0,
                    background: "#65d7e9",
                    borderRadius: 4,
                  }}
                />
              </div>
              <span style={{ textAlign: "right", fontSize: 12 }}>
                {Number(v.value.toFixed(2))}
                {suffix}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
export function RunWorkspace({ view }: { view: string }) {
  const [runs, setRuns] = useState<RunList[]>([]),
    [selected, setSelected] = useState(""),
    [run, setRun] = useState<RunDetail | null>(null),
    [error, setError] = useState(""),
    [filter, setFilter] = useState(""),
    [station, setStation] = useState(""),
    [status, setStatus] = useState(""),
    [events, setEvents] = useState<SimEvent[]>([]),
    [after, setAfter] = useState(0);
  useEffect(() => {
    api<RunList[]>("/api/simulation-runs?limit=100")
      .then((rows) => {
        setRuns(rows);
        const stored = localStorage.getItem("rack-active-run");
        setSelected(rows.find((r) => r.id === stored)?.id || rows[0]?.id || "");
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!selected) return;
    localStorage.setItem("rack-active-run", selected);
    setRun(null);
    setEvents([]);
    setAfter(0);
    let alive = true;
    const load = () =>
      api<RunDetail>(`/api/simulation-runs/${selected}`)
        .then((r) => {
          if (alive) setRun(r);
        })
        .catch((e) => {
          if (alive) setError(e.message);
        });
    void load();
    const timer = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [selected]);
  const data = run?.summaryJson,
    analytics = data?.analytics;
  const materials =
    analytics?.materials.filter(
      (m) =>
        (!filter ||
          `${m.partNumber} ${m.description}`
            .toLowerCase()
            .includes(filter.toLowerCase())) &&
        (!station || m.station === Number(station)) &&
        (!status ||
          (status === "shortage"
            ? m.onHand < m.quantity
            : status === "replenishing"
              ? m.onOrder > 0
              : m.onHand >= m.quantity)),
    ) || [];
  const title =
    view === "kanban"
      ? "Material Kanban"
      : view === "analytics"
        ? "Production analytics"
        : view === "inventory"
          ? "Inventory"
          : view === "production"
            ? "Production"
            : view === "replenishment"
              ? "Replenishment"
              : "Simulation reports";
  return (
    <>
      <div className="eyebrow">SIMULATED OPERATIONS</div>
      <h1>{title}</h1>
      <p>
        Results from isolated simulation runs. No actual historical factory
        performance is shown.
      </p>
      <section className="panel">
        <div className="grid">
          <label>
            Simulation run
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Select a run</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.scenario.name} · {r.status} ·{" "}
                  {new Date(r.createdAt).toLocaleString()}
                </option>
              ))}
            </select>
          </label>
          <div>
            <small>RUN STATUS</small>
            <h2 style={{ marginTop: 8 }}>{run?.status || "No run selected"}</h2>
            {run && (
              <small>
                {run.inputSnapshotJson.datasetKind} · Seed {run.simulationSeed}{" "}
                · Engine {run.engineVersion}
              </small>
            )}
          </div>
        </div>
        <div className="actions">
          <Link className="button" href="/scenarios">
            Configure scenario
          </Link>
          {run && (
            <Link className="button" href={`/?run=${run.id}`}>
              View in factory
            </Link>
          )}
          {run &&
            ["QUEUED", "RUNNING", "PAUSED"].includes(run.status) &&
            ["pause", "resume", "cancel"]
              .filter((a) =>
                a === "resume"
                  ? run.status === "PAUSED"
                  : run.status !== "PAUSED" || a === "cancel",
              )
              .map((action) => (
                <button
                  className="secondary"
                  key={action}
                  onClick={async () => {
                    try {
                      setRun(
                        await api(`/api/simulation-runs/${run.id}`, {
                          method: "POST",
                          body: JSON.stringify({ action }),
                        }),
                      );
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  {action}
                </button>
              ))}
        </div>
        {run && (
          <p>
            {new Date(run.simulatedStart).toLocaleDateString()} –{" "}
            {new Date(run.simulatedEnd).toLocaleDateString()} · UTC · Input{" "}
            {run.inputHash.slice(0, 12)}
          </p>
        )}
        {run?.status === "QUEUED" && (
          <p>The run is waiting for the local simulation worker.</p>
        )}
        {data?.error && <p className="error">{data.error}</p>}
      </section>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {analytics && run && data && (
        <>
          <div className="grid">
            {[
              ["Completed racks", analytics.completed],
              ["Work in progress", analytics.wip],
              ["Waiting for materials", analytics.waiting],
              [
                "Throughput / work hour",
                analytics.throughputPerWorkingHour.toFixed(2),
              ],
            ].map(([label, value]) => (
              <div className="panel" key={label} style={{ margin: "0" }}>
                <small>{label}</small>
                <div className="metric">{value}</div>
              </div>
            ))}
          </div>
          {["kanban", "inventory"].includes(view) && (
            <>
              <section className="panel">
                <div className="grid">
                  <label>
                    Material
                    <input
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      placeholder="Search part or description"
                    />
                  </label>
                  <label>
                    Workstation
                    <select
                      value={station}
                      onChange={(e) => setStation(e.target.value)}
                    >
                      <option value="">All stations</option>
                      {workstationDefaults.map((s, i) => (
                        <option key={s.id} value={i}>
                          {s.stationCode}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Stock status
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="">All statuses</option>
                      <option value="shortage">Shortage</option>
                      <option value="replenishing">Replenishing</option>
                      <option value="available">Available</option>
                    </select>
                  </label>
                  <label>
                    Rack model
                    <input readOnly value={run.inputSnapshotJson.modelCode} />
                  </label>
                </div>
                <div className="table-scroll" style={{ marginTop: 20 }}>
                  <table>
                    <thead>
                      <tr>
                        {[
                          "Part / description",
                          "Station",
                          "Unit",
                          "Available",
                          "Reserved",
                          "Consumed",
                          "Warehouse",
                          "In transit",
                          "On order",
                          "Reorder",
                          "Coverage (work days)",
                          "Status",
                        ].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((m) => (
                        <tr key={m.id}>
                          <td>
                            <details>
                              <summary>{m.partNumber}</summary>
                              <p>
                                {m.description}
                                <br />
                                {m.sourceReference}
                              </p>
                              <p>
                                Bins: {m.bins} × {m.binCapacity}. Opening:{" "}
                                {m.opening}. Closing: {m.closing}. Average POU:{" "}
                                {m.averagePointOfUse.toFixed(2)}.
                              </p>
                            </details>
                          </td>
                          <td>STATION-{m.station + 1}</td>
                          <td>{m.unit}</td>
                          <td>{m.onHand - m.reserved}</td>
                          <td>{m.reserved}</td>
                          <td>{m.consumed}</td>
                          <td>{m.warehouse}</td>
                          <td>{m.inTransit}</td>
                          <td>{m.onOrder}</td>
                          <td>{m.reorderPoint}</td>
                          <td>
                            {m.coverageWorkingDays === null
                              ? "No demand"
                              : m.coverageWorkingDays.toFixed(2)}
                          </td>
                          <td
                            className={
                              m.onHand < m.quantity ? "error" : "success"
                            }
                          >
                            {m.onHand < m.quantity
                              ? "SHORTAGE"
                              : m.onOrder
                                ? "REPLENISHING"
                                : "AVAILABLE"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              {view === "kanban" && (
                <div className="grid">
                  {materials.map((m) => (
                    <section className="panel" key={m.id}>
                      <h3>{m.partNumber}</h3>
                      <p>Point-of-use bins · {m.unit}</p>
                      <div style={{ display: "flex", gap: 12 }}>
                        {Array.from({ length: m.bins }, (_, i) => {
                          const quantity = Math.max(
                            0,
                            Math.min(
                              m.binCapacity,
                              m.onHand - i * m.binCapacity,
                            ),
                          );
                          return (
                            <div
                              key={i}
                              style={{
                                flex: 1,
                                border: "1px solid #39536b",
                                padding: 12,
                                borderRadius: 7,
                                background: quantity ? "#173b43" : "#291f29",
                              }}
                            >
                              <strong>
                                {quantity}/{m.binCapacity}
                              </strong>
                              <br />
                              <small>
                                {quantity === m.binCapacity
                                  ? "FULL"
                                  : quantity
                                    ? "ACTIVE"
                                    : m.onOrder
                                      ? "REPLENISHING"
                                      : "EMPTY"}
                              </small>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
          {view === "production" && (
            <>
              <div className="grid">
                <BarChart
                  title="Daily rack production"
                  values={Object.entries(analytics.daily).map(
                    ([label, value]) => ({ label, value }),
                  )}
                />
                <BarChart
                  title="Monthly rack production"
                  values={Object.entries(analytics.monthly).map(
                    ([label, value]) => ({ label, value }),
                  )}
                />
              </div>
              <section className="panel">
                <h2>Station performance</h2>
                <p>
                  Average completed rack cycle:{" "}
                  {analytics.averageCycleMinutes.toFixed(1)} minutes. Queue at
                  horizon: {analytics.queued}. Downtime is summed station time.
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>Station</th>
                      <th>Utilization</th>
                      <th>Busy hours</th>
                      <th>Blocked hours</th>
                      <th>Material wait hours</th>
                      <th>Equipment hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.stations.map((s) => (
                      <tr key={s.station}>
                        <td>{workstationDefaults[s.station - 1].name}</td>
                        <td>{(s.utilization * 100).toFixed(1)}%</td>
                        <td>{(s.busySeconds / 3600).toFixed(2)}</td>
                        <td>{(s.blockedSeconds / 3600).toFixed(2)}</td>
                        <td>{(s.shortageSeconds / 3600).toFixed(2)}</td>
                        <td>{(s.equipmentSeconds / 3600).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}
          {view === "analytics" && (
            <div
              className="grid"
              style={{
                gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))",
              }}
            >
              <BarChart
                title="Daily rack production"
                values={Object.entries(analytics.daily).map(
                  ([label, value]) => ({ label, value }),
                )}
              />
              <BarChart
                title="Monthly rack production"
                values={Object.entries(analytics.monthly).map(
                  ([label, value]) => ({ label, value }),
                )}
              />
              <BarChart
                title="Consumption by part"
                values={analytics.materials.map((m) => ({
                  label: `${m.partNumber} (${m.unit})`,
                  value: m.consumed,
                }))}
              />
              <BarChart
                title="Point-of-use inventory over time"
                values={data.snapshots.map((s) => ({
                  label: new Date(s.time).toISOString().slice(0, 10),
                  value: s.stocks[0]?.onHand || 0,
                }))}
              />
              <BarChart
                title="Replenishment frequency"
                values={analytics.materials.map((m) => ({
                  label: m.partNumber,
                  value: m.replenishments,
                }))}
              />
              <BarChart
                title="Stockout frequency"
                values={analytics.materials.map((m) => ({
                  label: m.partNumber,
                  value: m.stockouts,
                }))}
              />
              <BarChart
                title="Station utilization"
                suffix="%"
                values={analytics.stations.map((s) => ({
                  label: `Station ${s.station}`,
                  value: s.utilization * 100,
                }))}
              />
              <BarChart
                title="Downtime by cause (station hours)"
                values={[
                  "blockedSeconds",
                  "shortageSeconds",
                  "equipmentSeconds",
                ].map((key) => ({
                  label: key.replace("Seconds", ""),
                  value:
                    analytics.stations.reduce(
                      (n, s) => n + s[key as "blockedSeconds"],
                      0,
                    ) / 3600,
                }))}
              />
              <BarChart
                title="Warehouse trend · first material"
                values={data.snapshots.map((s) => ({
                  label: new Date(s.time).toISOString().slice(0, 10),
                  value: s.stocks[0]?.warehouse || 0,
                }))}
              />
              <BarChart
                title="Coverage in working days · zero demand excluded"
                values={analytics.materials
                  .filter((m) => m.coverageWorkingDays !== null)
                  .map((m) => ({
                    label: m.partNumber,
                    value: m.coverageWorkingDays!,
                  }))}
              />
            </div>
          )}
          {view === "replenishment" && (
            <section className="panel">
              <h2>Replenishment activity</h2>
              <p>
                {analytics.replenishmentCount} requests ·{" "}
                {data.final.orders.length} outstanding at horizon. Material
                handlers reserve finite warehouse stock before dispatch.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Requests</th>
                    <th>Lead minutes</th>
                    <th>Warehouse remaining</th>
                    <th>Source shortage</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.materials.map((m) => (
                    <tr key={m.id}>
                      <td>{m.partNumber}</td>
                      <td>{m.replenishments}</td>
                      <td>{m.leadMinutes}</td>
                      <td>{m.warehouse}</td>
                      <td>{m.upstreamShortage ? "YES" : "NO"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          {["production", "replenishment", "kanban"].includes(view) && (
            <section className="panel">
              <h2>Event timeline</h2>
              <p>
                Authoritative events in virtual time. Pages contain up to 100
                events.
              </p>
              <button
                className="secondary"
                onClick={async () => {
                  try {
                    const rows = await api<{ payloadJson: SimEvent }[]>(
                      `/api/simulation-runs/${run.id}/events?after=${after}&limit=100`,
                    );
                    setEvents(rows.map((r) => r.payloadJson));
                    if (rows.length)
                      setAfter(rows[rows.length - 1].payloadJson.sequence);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                {after ? "Next events" : "Load events"}
              </button>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Virtual time</th>
                      <th>Event</th>
                      <th>Rack</th>
                      <th>Part</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e) => (
                      <tr key={e.sequence}>
                        <td>{new Date(e.time).toISOString()}</td>
                        <td>{e.type}</td>
                        <td>{e.rackId || "—"}</td>
                        <td>{e.materialId || "—"}</td>
                        <td>{e.quantity ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {view === "reports" && (
            <section className="panel">
              <h2>Download simulation report</h2>
              <p>
                Includes production, inventory, Kanban, assumptions, source
                references, configuration, seed and engine version.
              </p>
              <div className="actions">
                {["csv", "xlsx", "pdf"].map((format) => (
                  <a
                    className="button"
                    key={format}
                    href={`/api/simulation-runs/${run.id}/reports?format=${format}`}
                  >
                    {format.toUpperCase()}
                  </a>
                ))}
              </div>
            </section>
          )}
          <section className="panel">
            <h2>Data quality and assumptions</h2>
            <ul style={{ paddingLeft: 20, listStyle: "disc" }}>
              {run.inputSnapshotJson.assumptions.map((a, i) => (
                <li key={i} style={{ color: "#9aaec5", margin: "8px 0" }}>
                  {a}
                </li>
              ))}
            </ul>
            <p>
              Computed in {data.elapsedMs} ms ·{" "}
              {data.eventCount.toLocaleString()} events · stock and utilization
              at the exclusive simulation end.
            </p>
          </section>
        </>
      )}
      {!runs.length && (
        <section className="panel">
          <h2>Create your first simulation</h2>
          <p>
            Configure a synthetic demonstration or provide reviewed
            manufacturing inputs.
          </p>
          <Link className="button" href="/scenarios">
            Open scenarios
          </Link>
        </section>
      )}
    </>
  );
}
