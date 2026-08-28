import { describe, expect, it } from "vitest";
import { filterAvailablePlayers, positionFilterCount, setPlayerTargetRound, togglePlayerStar } from "./players.js";

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
});
