import { describe, expect, it } from "vitest";
import { createPlayers, filterAvailablePlayers, positionFilterCount, setPlayerTargetRound, setPlayerTier, togglePlayerStar } from "./players.js";

const players = [
  { id: "qb", name: "Quarterback", pos: "QB", drafted: false, rank: 0 },
  { id: "rb", name: "Running Back", pos: "RB", drafted: false, rank: 1 },
  { id: "wr", name: "Wide Receiver", pos: "WR", drafted: false, rank: 2 },
  { id: "te", name: "Tight End", pos: "TE", drafted: false, rank: 3 },
  { id: "dst", name: "Defense", pos: "DEF", drafted: false, rank: 4 },
];

describe("available-player helpers", () => {
  it("groups running backs, receivers, and tight ends in the FLEX filter", () => {
    expect(filterAvailablePlayers(players, "FLEX", "").map((player) => player.id)).toEqual(["rb", "wr", "te"]);
  });

  it("accepts DEF data under the DEF filter", () => {
    expect(filterAvailablePlayers(players, "DEF", "").map((player) => player.id)).toEqual(["dst"]);
  });

  it("reports drafted and total counts for a filter segment", () => {
    const drafted = players.map((player) => (player.id === "rb" ? { ...player, drafted: true } : player));

    expect(positionFilterCount(drafted, "ALL")).toEqual({ drafted: 1, total: 5 });
    expect(positionFilterCount(drafted, "FLEX")).toEqual({ drafted: 1, total: 3 });
  });

  it("toggles a watchlist star without changing other players", () => {
    const starred = togglePlayerStar(players, "wr");

    expect(starred.find((player) => player.id === "wr").starred).toBe(true);
    expect(starred.find((player) => player.id === "rb")).toBe(players[1]);
    expect(togglePlayerStar(starred, "wr").find((player) => player.id === "wr").starred).toBe(false);
  });

  it("sets and clears a bounded target round without changing other players", () => {
    const targeted = setPlayerTargetRound(players, "wr", 7);
    expect(targeted.find((player) => player.id === "wr").targetRound).toBe(7);
    expect(targeted.find((player) => player.id === "rb")).toBe(players[1]);

    expect(setPlayerTargetRound(targeted, "wr", null).find((player) => player.id === "wr").targetRound).toBeNull();
    expect(setPlayerTargetRound(targeted, "wr", 17).find((player) => player.id === "wr").targetRound).toBeNull();
  });

  it("keeps tier membership optional and explicitly editable", () => {
    const created = createPlayers([
      { name: "Tiered", pos: "RB", team: "DET", tier: "2" },
      { name: "Untiered", pos: "WR", team: "MIN" },
      { name: "Invalid", pos: "QB", team: "BUF", tier: 0 },
    ]);
    expect(created.map((player) => player.tier)).toEqual([2, undefined, undefined]);

    const tiered = setPlayerTier(players, "wr", 3);
    expect(tiered.find((player) => player.id === "wr").tier).toBe(3);
    expect(setPlayerTier(tiered, "wr", null).find((player) => player.id === "wr").tier).toBeUndefined();
  });
});
