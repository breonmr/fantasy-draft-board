import { describe, expect, it } from "vitest";
import { addDraft, reorderAvailablePlayers, setPlayerDrafted, undoLastDraft } from "./draft.js";

const players = [
  { id: "a", name: "A", rank: 0, drafted: false },
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
});
