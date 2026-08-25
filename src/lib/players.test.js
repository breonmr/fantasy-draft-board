import { describe, expect, it } from "vitest";
import { filterAvailablePlayers, togglePlayerStar } from "./players.js";

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

  it("accepts DEF data under the DST/DEF filter", () => {
    expect(filterAvailablePlayers(players, "DST", "").map((player) => player.id)).toEqual(["dst"]);
  });

  it("toggles a watchlist star without changing other players", () => {
    const starred = togglePlayerStar(players, "wr");

    expect(starred.find((player) => player.id === "wr").starred).toBe(true);
    expect(starred.find((player) => player.id === "rb")).toBe(players[1]);
    expect(togglePlayerStar(starred, "wr").find((player) => player.id === "wr").starred).toBe(false);
  });
});
