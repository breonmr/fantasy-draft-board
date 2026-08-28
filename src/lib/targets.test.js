import { describe, expect, it } from "vitest";
import { actionableTargets } from "./targets.js";

describe("actionable targets", () => {
  it("includes favorites or target-round players once, sorts them, and omits drafted players", () => {
    const targets = actionableTargets([
      { id: "later", name: "Later", starred: true, drafted: false, rank: 1, targetRound: 8 },
      { id: "starred-first", name: "Starred First", starred: true, drafted: false, rank: 0 },
      { id: "starred-later", name: "Starred Later", starred: true, drafted: false, rank: 9 },
      { id: "target-only", name: "Target Only", starred: false, drafted: false, rank: 4, targetRound: 3 },
      { id: "both", name: "Both", starred: true, drafted: false, rank: 2, targetRound: 3 },
      { id: "drafted", name: "Drafted", starred: true, drafted: true, rank: 2, targetRound: 1 },
      { id: "unmarked", name: "Unmarked", starred: false, drafted: false, rank: 3 },
    ]);

    expect(targets.map((player) => player.id)).toEqual([
      "both",
      "target-only",
      "later",
      "starred-first",
      "starred-later",
    ]);
    expect(targets.filter((player) => player.id === "both")).toHaveLength(1);
  });
});
