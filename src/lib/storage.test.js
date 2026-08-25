import { describe, expect, it } from "vitest";
import { STORAGE_KEY } from "../data/draftDefaults.js";
import { loadDraftState, saveDraftState } from "./storage.js";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe("draft storage", () => {
  it("loads the legacy player-array format with default supporting data", () => {
    const legacyPlayers = [{ id: "legacy", name: "Legacy Player", drafted: false, rank: 0 }];
    const state = loadDraftState(createStorage({ [STORAGE_KEY]: JSON.stringify(legacyPlayers) }));

    expect(state.players).toEqual(legacyPlayers);
    expect(state.history).toEqual([]);
    expect(state.settings.numTeams).toBe(12);
    expect(state.adp).toEqual({});
    expect(state.stats).toEqual({});
  });

  it("round-trips the current persisted schema", () => {
    const storage = createStorage();
    const state = {
      players: [{ id: "a", name: "A", drafted: true, rank: 0, starred: true }],
      history: ["a"],
      settings: { numTeams: 10, numRounds: 15, teamNames: ["One"], myTeam: 0 },
      adp: { a: { yahoo: 1 } },
      stats: { a: { "2025": { receptions: 10 } } },
    };

    saveDraftState(state, storage);

    expect(loadDraftState(storage)).toEqual(state);
  });
});
