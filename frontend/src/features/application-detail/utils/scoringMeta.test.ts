import { describe, expect, it } from "vitest";

import { buildScoringMeta } from "./scoringMeta";

describe("scoring meta util", () => {
  it("builds numeric normalized value for numeric strings", () => {
    const meta = buildScoringMeta("vehicle.price", "1,250,000");
    expect(meta.normalized_value).toBe(1250000);
    expect(meta.status).toBe("passed");
    expect(meta.rule_outputs.length).toBeGreaterThan(0);
  });

  it("returns null normalized value for empty strings", () => {
    const meta = buildScoringMeta("applicant.middle_initial", "   ");
    expect(meta.normalized_value).toBeNull();
  });
});
