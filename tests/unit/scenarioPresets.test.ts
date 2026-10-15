import { describe, it, expect } from "vitest";
import {
  demoConfig,
  presetNames,
  applyPreset,
} from "@/domain/manufacturing/scenarioPresets";
import { simulationConfigSchema } from "@/simulation/core/types";

describe("Scenario Presets Domain", () => {
  it("generates a valid baseline demoConfig conforming to simulationConfigSchema", () => {
    const config = demoConfig();
    expect(config.name).toBe("Synthetic baseline");
    expect(config.dailyDemand).toBe(15);
    expect(config.durationMonths).toBe(6);
    expect(config.materials.length).toBeGreaterThan(0);
    expect(config.seed).toBe(42);

    // Schema validation succeeds without throwing
    const parsed = simulationConfigSchema.parse(config);
    expect(parsed.name).toBe("Synthetic baseline");
  });

  it("lists all required scenario presets", () => {
    expect(presetNames).toEqual([
      "Baseline",
      "Increased demand",
      "Delayed replenishment",
      "Reduced inventory",
      "Optimized Kanban",
      "Custom",
    ]);
  });

  it("applies 'Baseline' preset without altering base values", () => {
    const base = demoConfig();
    const result = applyPreset(base, "Baseline");

    expect(result.name).toBe(base.name);
    expect(result.dailyDemand).toBe(base.dailyDemand);
    expect(result.materials[0].leadMinutes).toBe(base.materials[0].leadMinutes);
  });

  it("applies 'Increased demand' preset with 25% demand surge", () => {
    const base = demoConfig();
    const result = applyPreset(base, "Increased demand");

    expect(result.name).toBe("Increased demand");
    expect(result.dailyDemand).toBe(Math.ceil(base.dailyDemand * 1.25));
    expect(result.dailyDemand).toBe(19); // 15 * 1.25 = 18.75 -> 19
  });

  it("applies 'Delayed replenishment' preset doubling lead times", () => {
    const base = demoConfig();
    const result = applyPreset(base, "Delayed replenishment");

    expect(result.name).toBe("Delayed replenishment");
    expect(result.materials[0].leadMinutes).toBe(base.materials[0].leadMinutes * 2);
    // Verify base is not mutated
    expect(base.materials[0].leadMinutes).not.toBe(result.materials[0].leadMinutes);
  });

  it("applies 'Reduced inventory' preset halving warehouse and point of use", () => {
    const base = demoConfig();
    const result = applyPreset(base, "Reduced inventory");

    expect(result.name).toBe("Reduced inventory");
    for (let i = 0; i < result.materials.length; i++) {
      expect(result.materials[i].warehouse).toBe(
        Math.floor(base.materials[i].warehouse * 0.5),
      );
      expect(result.materials[i].pointOfUse).toBe(
        Math.floor(base.materials[i].pointOfUse * 0.5),
      );
    }
  });

  it("applies 'Optimized Kanban' preset doubling bin capacity and reorder point", () => {
    const base = demoConfig();
    const result = applyPreset(base, "Optimized Kanban");

    expect(result.name).toBe("Optimized Kanban");
    for (let i = 0; i < result.materials.length; i++) {
      expect(result.materials[i].binCapacity).toBe(
        base.materials[i].binCapacity * 2,
      );
      expect(result.materials[i].reorderPoint).toBe(
        base.materials[i].reorderPoint * 2,
      );
    }
    expect(result.assumptions).toContain(
      "Alternative bin configuration; improvement is unproven until compared.",
    );
  });

  it("does not mutate original config when presets are applied", () => {
    const base = demoConfig();
    const originalDemand = base.dailyDemand;
    const originalLead = base.materials[0].leadMinutes;

    applyPreset(base, "Increased demand");
    applyPreset(base, "Delayed replenishment");
    applyPreset(base, "Reduced inventory");

    expect(base.dailyDemand).toBe(originalDemand);
    expect(base.materials[0].leadMinutes).toBe(originalLead);
  });
});
