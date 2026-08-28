import { describe, expect, it } from "vitest";
import {
  detectPositionRuns,
  estimateSurvivalRisk,
  nextPickContext,
  positionDemand,
  comparableDepth,
  recommendAvailablePlayers,
} from "./recommendations.js";

const twoTeamSettings = { numTeams: 2, myTeam: 0 };

describe("snake-draft look-ahead", () => {
  it("finds the next turn and every snake pick between selections", () => {
    const context = nextPickContext(2, { numTeams: 4, myTeam: 1 });

    expect(context.currentPick).toBe(3);
    expect(context.nextPick).toBe(7);
    expect(context.interveningPicks).toEqual([
      { pick: 3, team: 2 },
      { pick: 4, team: 3 },
      { pick: 5, team: 3 },
      { pick: 6, team: 2 },
    ]);
  });

  it("reduces QB demand sharply after a team has drafted one or two QBs", () => {
    expect(positionDemand([]).QB).toBeGreaterThan(positionDemand([{ pos: "QB" }]).QB);
    expect(positionDemand([{ pos: "QB" }]).QB).toBeGreaterThan(positionDemand([{ pos: "QB" }, { pos: "QB" }]).QB);
    expect(positionDemand([{ pos: "QB" }, { pos: "QB" }]).QB).toBe(0);
  });

  it("raises RB demand for a RB-light, WR-heavy roster and WR demand for the opposite build", () => {
    const rbLight = positionDemand([{ pos: "RB" }, { pos: "WR" }, { pos: "WR" }, { pos: "WR" }, { pos: "WR" }]);
    const wrLight = positionDemand([{ pos: "RB" }, { pos: "RB" }]);

    expect(rbLight.RB).toBeGreaterThan(rbLight.WR);
    expect(wrLight.WR).toBeGreaterThan(wrLight.RB);
  });
});

describe("survival risk and recommendation scoring", () => {
  const qb = { id: "qb", name: "QB", pos: "QB", rank: 5, drafted: false };

  it("increases survival risk when several teams need the same position", () => {
    const risk = estimateSurvivalRisk(qb, [qb, { id: "qb-two", pos: "QB", rank: 8, drafted: false }], {
      nextPick: 18,
      interveningPicks: [{ team: 1 }, { team: 2 }, { team: 3 }, { team: 4 }],
      totalDemand: { QB: 12, RB: 0, WR: 0, TE: 0 },
      teamDemands: Array.from({ length: 4 }, () => ({ demand: { QB: 3, RB: 0, WR: 0, TE: 0 } })),
    });

    expect(risk.level).toBe("high");
    expect(risk.needyTeams).toBe(4);
  });

  it("lowers survival risk when comparable depth is available", () => {
    const available = Array.from({ length: 6 }, (_, index) => ({ id: `qb-${index}`, pos: "QB", rank: 5 + index, drafted: false }));
    const risk = estimateSurvivalRisk(available[0], available, {
      nextPick: 10,
      interveningPicks: [{ team: 1 }],
      totalDemand: { QB: 3, RB: 0, WR: 0, TE: 0 },
      teamDemands: [{ demand: { QB: 3, RB: 0, WR: 0, TE: 0 } }],
    });

    expect(risk.level).toBe("low");
    expect(risk.comparableCount).toBe(6);
  });

  it("uses only available same-position, same-tier players as tier comparables", () => {
    const tiered = { id: "rb-one", pos: "RB", rank: 1, tier: 2, drafted: false };
    const available = [
      tiered,
      { id: "rb-two", pos: "RB", rank: 2, tier: 2, drafted: false },
      { id: "rb-other-tier", pos: "RB", rank: 3, tier: 3, drafted: false },
      { id: "wr-same-tier", pos: "WR", rank: 4, tier: 2, drafted: false },
      { id: "rb-drafted", pos: "RB", rank: 5, tier: 2, drafted: true },
    ];

    expect(comparableDepth(tiered, available).map((player) => player.id)).toEqual(["rb-two"]);
    expect(estimateSurvivalRisk(tiered, available, {
      nextPick: 6,
      interveningPicks: [],
      totalDemand: { QB: 0, RB: 0, WR: 0, TE: 0 },
      teamDemands: [],
    }).comparableCount).toBe(1);
  });

  it("uses the rank-window comparable fallback when a player has no tier", () => {
    const untiered = { id: "wr-one", pos: "WR", rank: 1, drafted: false };
    const available = [untiered, { id: "wr-two", pos: "WR", rank: 4, drafted: false }, { id: "wr-far", pos: "WR", rank: 30, drafted: false }];

    expect(comparableDepth(untiered, available).map((player) => player.id)).toEqual(["wr-one", "wr-two"]);
  });

  it("detects a recent position run without treating every draft as one", () => {
    const players = [
      { id: "wr-1", pos: "WR" }, { id: "wr-2", pos: "WR" }, { id: "wr-3", pos: "WR" }, { id: "rb", pos: "RB" },
    ];
    const runs = detectPositionRuns(["wr-1", "rb", "wr-2", "wr-3"], players, 4);

    expect(runs.WR).toEqual({ count: 3, underway: true });
    expect(runs.RB).toEqual({ count: 1, underway: false });
  });

  it("prefers a thin, high-risk position over a similarly ranked deep position", () => {
    const players = [
      { id: "my-qb", pos: "QB", rank: 0, drafted: true },
      { id: "opp-wr-1", pos: "WR", rank: 1, drafted: true },
      { id: "opp-wr-2", pos: "WR", rank: 2, drafted: true },
      { id: "my-te", pos: "TE", rank: 3, drafted: true },
      { id: "my-rb", pos: "RB", rank: 4, drafted: true },
      { id: "thin-rb", pos: "RB", rank: 5, drafted: false },
      { id: "deep-wr-1", pos: "WR", rank: 6, drafted: false },
      { id: "deep-wr-2", pos: "WR", rank: 7, drafted: false },
      { id: "deep-wr-3", pos: "WR", rank: 8, drafted: false },
      { id: "deep-wr-4", pos: "WR", rank: 9, drafted: false },
      { id: "deep-wr-5", pos: "WR", rank: 10, drafted: false },
    ];
    const history = ["my-qb", "opp-wr-1", "opp-wr-2", "my-te", "my-rb"];

    const recommendations = recommendAvailablePlayers(players, history, twoTeamSettings);
    expect(recommendations[0].player.id).toBe("thin-rb");
    expect(recommendations[0].reason).toBe("RB may not make it back");
  });

  it("keeps a clearly superior overall value ahead of a smaller positional need", () => {
    const players = [
      { id: "top-te", name: "Top TE", pos: "TE", rank: 1, drafted: false },
      { id: "rb-one", name: "RB One", pos: "RB", rank: 2, drafted: true },
      { id: "other", name: "Other", pos: "QB", rank: 3, drafted: true },
      { id: "rb-two", name: "RB Two", pos: "RB", rank: 4, drafted: true },
      { id: "wr-need", name: "WR Need", pos: "WR", rank: 11, drafted: false },
    ];
    const history = Array.from({ length: 24 }, (_, index) => index % 2 ? "other" : "rb-one");

    const recommendations = recommendAvailablePlayers(players, history, twoTeamSettings);
    expect(recommendations[0].player.id).toBe("top-te");
  });

  it("uses a tier cliff to break an otherwise similar recommendation tie", () => {
    const players = [
      { id: "last-rb", name: "Last RB", pos: "RB", rank: 5, tier: 2, drafted: false },
      { id: "next-rb", name: "Next RB", pos: "RB", rank: 9, tier: 3, drafted: false },
      { id: "deep-wr", name: "Deep WR", pos: "WR", rank: 5, tier: 1, drafted: false },
      { id: "wr-two", pos: "WR", rank: 6, tier: 1, drafted: false },
      { id: "wr-three", pos: "WR", rank: 7, tier: 1, drafted: false },
      { id: "wr-four", pos: "WR", rank: 8, tier: 1, drafted: false },
      { id: "wr-five", pos: "WR", rank: 10, tier: 1, drafted: false },
    ];

    const recommendations = recommendAvailablePlayers(players, [], twoTeamSettings);
    expect(recommendations[0].player.id).toBe("last-rb");
    expect(recommendations[0]).toMatchObject({ reason: "Last RB in Tier 2", detail: "Tier cliff ahead" });
  });

  it("works without ADP and treats an earlier optional ADP as additional risk", () => {
    const lookAhead = {
      nextPick: 20,
      interveningPicks: [{ team: 1 }, { team: 2 }],
      totalDemand: { QB: 6, RB: 0, WR: 0, TE: 0 },
      teamDemands: [{ demand: { QB: 3, RB: 0, WR: 0, TE: 0 } }, { demand: { QB: 3, RB: 0, WR: 0, TE: 0 } }],
    };
    const available = [qb, { id: "qb-two", pos: "QB", rank: 9, drafted: false }];
    const withoutAdp = estimateSurvivalRisk(qb, available, lookAhead);
    const withAdp = estimateSurvivalRisk({ ...qb, adp: 8 }, available, lookAhead);

    expect(withoutAdp.riskScore).toBeGreaterThan(0);
    expect(withAdp.riskScore).toBeGreaterThan(withoutAdp.riskScore);
  });
});
