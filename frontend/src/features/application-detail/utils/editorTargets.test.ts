import { describe, expect, it } from "vitest";

import {
  buildEditorTargets,
  startsWithSectionLabel
} from "./editorTargets";

describe("editor target utils", () => {
  it("builds repeatable and non-repeatable targets", () => {
    const payload = {
      applicant: { first_name: "Ana", age: 33 },
      coborrowers: [{ first_name: "Ben" }, { first_name: "Cara" }]
    };

    const targets = buildEditorTargets(payload);
    expect(targets.length).toBe(3);
    expect(targets[0].sectionKey).toBe("applicant");
    expect(targets[1].sectionKey).toBe("coborrowers");
    expect(targets[2].itemLabel).toBe("#2");
  });

  it("detects if item already starts with section label", () => {
    expect(startsWithSectionLabel("Bank Credit References (0)", "Bank Credit References")).toBe(true);
    expect(startsWithSectionLabel("#1", "Co Borrower")).toBe(false);
  });
});
