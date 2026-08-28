import { describe, expect, it } from "vitest";
import { recommendAvailablePlayers } from "./recommendations.js";

const settings = { numTeams: 2, myTeam: 0 };

describe("recommendation engine", () => {
  it("never recommends drafted players", () => {
    const recommendations = recommendAvailablePlayers([
      { id: "drafted", name: "Drafted", pos: "RB", rank: 0, drafted: true },
      { id: "available", name: "Available", pos: "WR", rank: 1, drafted: false },
    ], ["drafted"], settings);

    expect(recommendations.map(({ player }) => player.id)).toEqual(["available"]);
  });

  it("reacts to a RB-heavy roster by lifting an available WR", () => {
    const players = [
      { id: "rb-one", name: "RB One", pos: "RB", rank: 0, drafted: true },
      { id: "other", name: "Other", pos: "QB", rank: 1, drafted: true },
      { id: "rb-two", name: "RB Two", pos: "RB", rank: 2, drafted: true },
      { id: "next-rb", name: "Next RB", pos: "RB", rank: 3, drafted: false },
      { id: "next-wr", name: "Next WR", pos: "WR", rank: 4, drafted: false },
    ];

    const recommendations = recommendAvailablePlayers(players, ["rb-one", "other", "other", "rb-two"], settings);
    expect(recommendations[0].player.id).toBe("next-wr");
    expect(recommendations[0].reason).toBe("WR need");
  });

  it("keeps a major ranking value fall ahead of a smaller positional need", () => {
    const players = [
      { id: "top-te", name: "Top TE", pos: "TE", rank: 1, drafted: false },
      { id: "rb-one", name: "RB One", pos: "RB", rank: 2, drafted: true },
      { id: "other", name: "Other", pos: "QB", rank: 3, drafted: true },
      { id: "rb-two", name: "RB Two", pos: "RB", rank: 4, drafted: true },
      { id: "wr-need", name: "WR Need", pos: "WR", rank: 11, drafted: false },
    ];
    const history = Array.from({ length: 24 }, (_, index) => index % 2 ? "other" : "rb-one");

    const recommendations = recommendAvailablePlayers(players, history, settings);
    expect(recommendations[0].player.id).toBe("top-te");
    expect(recommendations[0].reason).toBe("Falling value");
  });
});
