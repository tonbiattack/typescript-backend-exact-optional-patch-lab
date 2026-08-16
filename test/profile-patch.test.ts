import { describe, expect, it } from "vitest";
import { applyPatch, mapFormToPatch } from "../src/profile-patch.js";

describe("PATCH /profile の最小再現", () => {
  it("does not call an omitted field clear", () => {
    const patch = mapFormToPatch({});

    expect(applyPatch(patch)).toBe("NO_CHANGE");
  });

  it("sets a supplied nickname", () => {
    expect(applyPatch(mapFormToPatch({ nickname: "tonbi" }))).toBe("SET:tonbi");
  });
});
