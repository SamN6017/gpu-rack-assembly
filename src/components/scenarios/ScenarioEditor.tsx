"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/components/navigation/OperationsShell";
import {
  demoConfig,
  applyPreset,
  presetNames,
} from "@/domain/manufacturing/scenarioPresets";
import {
  simulationConfigSchema,
  SimulationConfig,
} from "@/simulation/core/types";
import type { RunDetail, RunList } from "@/components/operations/RunWorkspace";
export function ScenarioEditor() {
  const [config, setConfig] = useState<SimulationConfig>(demoConfig),
    [base, setBase] = useState<SimulationConfig>(demoConfig),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [runs, setRuns] = useState<RunList[]>([]),
    [compare, setCompare] = useState<RunDetail[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [message, setMessage] = useState(""),
    [advanced, setAdvanced] = useState("");
  useEffect(() => {
    api<RunList[]>("/api/simulation-runs?limit=100")
      .then(setRuns)
      .catch((e) => setError(e.message));
  }, []);
  const number = (
    key:
      | "durationMonths"
      | "dailyDemand"
      | "shiftStartHour"
      | "shiftHours"
      | "handlers"
      | "seed",
    label: string,
    min: number,
    max: number,
  ) => (
    <label key={key}>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={config[key]}
        onChange={(e) =>
          setConfig({ ...config, [key]: Number(e.target.value) })
        }
      />
    </label>
  );
  return (
    <>
      <div className="eyebrow">SIMULATION LAB</div>
      <h1>Scenarios</h1>
      <p>
        Explore six calendar months of production with finite inventory and
        reproducible inputs.
      </p>
      <div className="warning">
        Demonstration inputs are synthetic. A baseline using actual factory data
        requires reviewed source records and assumptions.
      </div>
      <section className="panel">
        <h2>Scenario configuration</h2>
        <div className="actions" style={{ margin: "0 0 24px" }}>
          {presetNames.map((name) => (
            <button
              className="secondary"
              key={name}
              onClick={() => {
                try {
                  setConfig(applyPreset(base, name));
                  setError("");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="grid">
          <label>
            Scenario name
            <input
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
            />
          </label>
          <label>
            Rack model
            <input
              value={config.modelCode}
              onChange={(e) =>
                setConfig({ ...config, modelCode: e.target.value })
              }
            />
          </label>
          <label>
            Start date (UTC)
            <input
              type="date"
              value={config.startDate.slice(0, 10)}
              onChange={(e) => {
                if (e.target.value)
                  setConfig({
                    ...config,
                    startDate: e.target.value + "T00:00:00.000Z",
                  });
              }}
            />
          </label>
          {number("durationMonths", "Duration in calendar months", 1, 6)}
          {number("dailyDemand", "Daily demand (racks)", 0, 200)}
          {number("shiftStartHour", "Shift start (UTC hour)", 0, 23)}
          {number("shiftHours", "Shift duration (hours)", 1, 24)}
          {number("handlers", "Material handlers", 1, 20)}
          {number("seed", "Simulation seed", 0, 2147483647)}
        </div>
        <div className="actions">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
            <label
              key={day}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <input
                style={{ width: 18 }}
                type="checkbox"
                checked={config.workingDays.includes(i)}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    workingDays: e.target.checked
                      ? [...config.workingDays, i]
                      : config.workingDays.filter((d) => d !== i),
                  })
                }
              />
              {day}
            </label>
          ))}
        </div>
        <h3 style={{ marginTop: 25 }}>Material and two-bin configuration</h3>
        <p>
          Per-part units are preserved. Warehouse stock is finite. Point-of-use
          capacity equals bin count × capacity per bin.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Part",
                  "BOM qty",
                  "Warehouse",
                  "Point of use",
                  "Bins",
                  "Capacity / bin",
                  "Reorder",
                  "Safety stock",
                  "Lead minutes",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.materials.map((m, i) => (
                <tr key={m.id}>
                  <td>
                    {m.partNumber}
                    <br />
                    <small>
                      Station {m.station + 1} · {m.unit}
                    </small>
                  </td>
                  {(
                    [
                      "quantity",
                      "warehouse",
                      "pointOfUse",
                      "bins",
                      "binCapacity",
                      "reorderPoint",
                      "safetyStock",
                      "leadMinutes",
                    ] as const
                  ).map((key) => (
                    <td key={key}>
                      <input
                        aria-label={`${m.partNumber} ${key}`}
                        style={{ width: 105 }}
                        type="number"
                        min="0"
                        step={key === "quantity" ? "0.000001" : "1"}
                        value={m[key]}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            materials: config.materials.map((row, n) =>
                              n === i
                                ? { ...row, [key]: Number(e.target.value) }
                                : row,
                            ),
                          })
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details style={{ marginTop: 22 }}>
          <summary>Advanced configuration and source references</summary>
          <p>
            Edit station cycle times, equipment fault intervals, material
            references and documented assumptions. Apply JSON before starting.
          </p>
          <button
            className="secondary"
            onClick={() => setAdvanced(JSON.stringify(config, null, 2))}
          >
            Load current JSON
          </button>
          <textarea
            aria-label="Advanced scenario JSON"
            rows={14}
            value={advanced}
            onChange={(e) => setAdvanced(e.target.value)}
            style={{ fontFamily: "monospace", marginTop: 12 }}
          />
          <button
            className="secondary"
            onClick={() => {
              try {
                setConfig(simulationConfigSchema.parse(JSON.parse(advanced)));
                setError("");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Apply JSON
          </button>
        </details>
        <div className="actions">
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const validated = simulationConfigSchema.parse(config);
                const scenario = await api<{ id: string }>("/api/scenarios", {
                  method: "POST",
                  body: JSON.stringify(validated),
                });
                const run = await api<{ id: string }>("/api/simulation-runs", {
                  method: "POST",
                  body: JSON.stringify({ scenarioId: scenario.id }),
                });
                localStorage.setItem("rack-active-run", run.id);
                setMessage("Run queued. Open production to follow its status.");
                setRuns(await api("/api/simulation-runs?limit=100"));
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : "Save and run simulation"}
          </button>
          <button
            className="secondary"
            onClick={() => {
              try {
                setBase(simulationConfigSchema.parse(config));
                setMessage(
                  "Current configuration is now the comparison baseline. Presets will change only their named parameters.",
                );
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Use as comparison baseline
          </button>
          <Link className="button" href="/production">
            Open production
          </Link>
        </div>
        {message && (
          <p className="success" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
      <section className="panel">
        <h2>Compare completed runs</h2>
        <p>
          Select up to four runs. The first selected run is the baseline;
          configuration differences are shown with results.
        </p>
        {runs
          .filter((r) => r.status === "COMPLETED")
          .map((r) => (
            <label
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                margin: 10,
              }}
            >
              <input
                style={{ width: 18 }}
                type="checkbox"
                checked={selected.includes(r.id)}
                disabled={!selected.includes(r.id) && selected.length >= 4}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, r.id]
                      : selected.filter((id) => id !== r.id),
                  )
                }
              />
              {r.scenario.name} · {new Date(r.createdAt).toLocaleString()}
            </label>
          ))}
        <button
          className="secondary"
          disabled={selected.length < 2}
          onClick={async () => {
            try {
              setCompare(
                await Promise.all(
                  selected.map((id) =>
                    api<RunDetail>(`/api/simulation-runs/${id}`),
                  ),
                ),
              );
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Compare runs
        </button>
        {compare.length > 0 && (
          <>
            <div className="table-scroll" style={{ marginTop: 22 }}>
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    {compare.map((r) => (
                      <th key={r.id}>{r.scenario.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      "completed",
                      "throughputPerWorkingHour",
                      "stockoutCount",
                      "downtimeSeconds",
                      "replenishmentCount",
                    ] as const
                  ).map((metric) => (
                    <tr key={metric}>
                      <td>{metric}</td>
                      {compare.map((r, i) => {
                        const value = r.summaryJson!.analytics[metric],
                          delta =
                            value - compare[0].summaryJson!.analytics[metric];
                        return (
                          <td key={r.id}>
                            {value.toFixed(2)}
                            {i > 0 && (
                              <small>
                                {" "}
                                ({delta >= 0 ? "+" : ""}
                                {delta.toFixed(2)})
                              </small>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {compare.slice(1).map((r) => (
              <details key={r.id} style={{ marginTop: 16 }}>
                <summary>Configuration differences: {r.scenario.name}</summary>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    fontSize: 11,
                    marginTop: 10,
                  }}
                >
                  {JSON.stringify(
                    Object.fromEntries(
                      Object.entries(r.inputSnapshotJson).filter(
                        ([key, value]) =>
                          JSON.stringify(value) !==
                          JSON.stringify(
                            compare[0].inputSnapshotJson[
                              key as keyof SimulationConfig
                            ],
                          ),
                      ),
                    ),
                    null,
                    2,
                  )}
                </pre>
              </details>
            ))}
          </>
        )}
      </section>
    </>
  );
}
