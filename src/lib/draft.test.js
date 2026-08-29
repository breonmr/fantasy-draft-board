import { describe, expect, it } from "vitest";
import { addDraft, nextDraftStatus, reorderAvailablePlayers, setPlayerDrafted, undoLastDraft } from "./draft.js";

const players = [
  { id: "a", name: "A", rank: 0, drafted: false, starred: true, tier: 3 },
  { id: "b", name: "B", rank: 1, drafted: true },
  { id: "c", name: "C", rank: 2, drafted: false },
  { id: "d", name: "D", rank: 3, drafted: false },
];

describe("draft state transitions", () => {
  it("drafts a player and records its draft history entry", () => {
    const drafted = setPlayerDrafted(players, "a", true);

    expect(drafted.find((player) => player.id === "a").drafted).toBe(true);
    expect(addDraft(["b"], "a")).toEqual(["b", "a"]);
  });

  it("undoes the most recent draft without changing earlier history", () => {
    expect(undoLastDraft(["a", "c"])).toEqual({ history: ["a"], lastId: "c" });
    expect(undoLastDraft([])).toEqual({ history: [], lastId: null });
  });

  it("reorders available players while preserving drafted-player slots", () => {
    const reordered = reorderAvailablePlayers(players, 1, 0);

    expect(reordered.map((player) => player.id)).toEqual(["c", "b", "a", "d"]);
    expect(reordered.map((player) => player.rank)).toEqual([0, 1, 2, 3]);
    expect(reordered.find((player) => player.id === "b").drafted).toBe(true);
    expect(reordered.find((player) => player.id === "a").starred).toBe(true);
    expect(reordered.find((player) => player.id === "a").tier).toBe(3);
  });

  it("keeps the dragged player at the shown downward insertion position", () => {
    // Moving A before D removes it before insertion, so the underlying target index is 1.
    const reordered = reorderAvailablePlayers(players, 0, 1);

    expect(reordered.map((player) => player.id)).toEqual(["c", "b", "a", "d"]);
  });

  it("moves a player to the end of the available rankings", () => {
    const reordered = reorderAvailablePlayers(players, 0, 2);

    expect(reordered.map((player) => player.id)).toEqual(["c", "b", "d", "a"]);
  });

  it("preserves a tier when a player is dropped within its current tier section", () => {
    const tieredPlayers = [
      { id: "a", rank: 0, drafted: false, tier: 2 },
      { id: "b", rank: 1, drafted: false, tier: 2 },
      { id: "c", rank: 2, drafted: false, tier: 3 },
    ];

    const reordered = reorderAvailablePlayers(tieredPlayers, 1, 0, 2);
    expect(reordered.map((player) => player.id)).toEqual(["b", "a", "c"]);
    expect(reordered.find((player) => player.id === "b").tier).toBe(2);
  });

  it("assigns the destination tier when a player crosses a tier divider", () => {
    const tieredPlayers = [
      { id: "a", rank: 0, drafted: false, tier: 2 },
      { id: "b", rank: 1, drafted: false, tier: 2 },
      { id: "c", rank: 2, drafted: false, tier: 3 },
      { id: "d", rank: 3, drafted: false, tier: 3 },
    ];

    const reordered = reorderAvailablePlayers(tieredPlayers, 3, 2, 2);
    expect(reordered.map((player) => player.id)).toEqual(["a", "b", "d", "c"]);
    expect(reordered.find((player) => player.id === "d").tier).toBe(2);
  });

  it("assigns an untiered player to the explicit tier it is dropped into", () => {
    const tieredPlayers = [
      { id: "a", rank: 0, drafted: false, tier: 2 },
      { id: "b", rank: 1, drafted: false, tier: 2 },
      { id: "untiered", rank: 2, drafted: false },
      { id: "c", rank: 3, drafted: false, tier: 3 },
    ];

    const reordered = reorderAvailablePlayers(tieredPlayers, 2, 1, 2);
    expect(reordered.map((player) => player.id)).toEqual(["a", "untiered", "b", "c"]);
    expect(reordered.find((player) => player.id === "untiered").tier).toBe(2);
  });

  it("does not assign a tier when an untiered destination has no explicit tier section", () => {
    const reordered = reorderAvailablePlayers([
      { id: "a", rank: 0, drafted: false, tier: 2 },
      { id: "untiered", rank: 1, drafted: false },
      { id: "b", rank: 2, drafted: false },
    ], 2, 1);

    expect(reordered.find((player) => player.id === "b").tier).toBeUndefined();
  });
});

describe("nextDraftStatus", () => {
  const settings = { numTeams: 12, numRounds: 14 };

  it("reports the next overall pick and round", () => {
    expect(nextDraftStatus(0, settings)).toEqual({ complete: false, round: 1, pick: 1 });
    expect(nextDraftStatus(12, settings)).toEqual({ complete: false, round: 2, pick: 13 });
    expect(nextDraftStatus(24, settings)).toEqual({ complete: false, round: 3, pick: 25 });
  });

  it("reports completion after the final draft slot", () => {
    expect(nextDraftStatus(168, settings)).toEqual({ complete: true });
  });
});
