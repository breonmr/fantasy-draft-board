import { describe, expect, it } from "vitest";
import { actionableTargets } from "./targets.js";

describe("actionable targets", () => {
  it("sorts target rounds before unassigned favorites and omits drafted players", () => {
    const targets = actionableTargets([
      { id: "later", name: "Later", starred: true, drafted: false, rank: 1, targetRound: 8 },
      { id: "none", name: "None", starred: true, drafted: false, rank: 0 },
      { id: "early", name: "Early", starred: true, drafted: false, rank: 4, targetRound: 3 },
      { id: "drafted", name: "Drafted", starred: true, drafted: true, rank: 2, targetRound: 1 },
    ]);

    expect(targets.map((player) => player.id)).toEqual(["early", "later", "none"]);
  });
});
