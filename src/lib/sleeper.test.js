import { describe, expect, it, vi } from "vitest";
import {
  SLEEPER_CACHE_MAX_AGE_MS,
  enrichPlayersWithSleeper,
  fetchSleeperPlayers,
  isSleeperCacheFresh,
  matchSleeperPlayer,
  normalizeSleeperName,
} from "./sleeper.js";

const sleeperPlayers = {
  "100": {
    player_id: "100",
    first_name: "D.J.",
    last_name: "Moore",
    position: "WR",
    team: "CHI",
    number: 2,
    age: 29,
    height: "5'11\"",
    weight: "210",
    college: "Maryland",
    years_exp: 8,
    active: true,
    status: "Active",
    espn_id: "3126486",
  },
  "200": { player_id: "200", first_name: "Chris", last_name: "Smith", position: "WR", team: "ATL" },
  "201": { player_id: "201", first_name: "Chris", last_name: "Smith", position: "WR", team: "ATL" },
};

describe("Sleeper player enrichment", () => {
  it("normalizes punctuation, whitespace, and common suffixes", () => {
    expect(normalizeSleeperName(" D.J. Moore Jr. ")).toBe("djmoore");
    expect(normalizeSleeperName("Amon-Ra St. Brown")).toBe("amonrastbrown");
  });

  it("matches an imported player by normalized name, position, and team", () => {
    const match = matchSleeperPlayer({ name: "DJ Moore Jr", pos: "WR", team: "CHI" }, sleeperPlayers);

    expect(match?.playerId).toBe("100");
  });

  it("does not guess when a match is ambiguous or details conflict", () => {
    expect(matchSleeperPlayer({ name: "Chris Smith", pos: "WR", team: "ATL" }, sleeperPlayers)).toBeNull();
    expect(matchSleeperPlayer({ name: "DJ Moore", pos: "WR", team: "CAR" }, sleeperPlayers)).toBeNull();
  });

  it("adds retained metadata without changing imported rankings or order", () => {
    const imported = [
      { id: "a", name: "DJ Moore", pos: "WR", team: "CHI", rank: 7, drafted: false },
      { id: "b", name: "Unknown", pos: "RB", team: "NYJ", rank: 8, drafted: true },
    ];
    const enriched = enrichPlayersWithSleeper(imported, sleeperPlayers);

    expect(enriched.map((player) => player.id)).toEqual(["a", "b"]);
    expect(enriched.map((player) => player.rank)).toEqual([7, 8]);
    expect(enriched[0]).toMatchObject({ name: "DJ Moore", team: "CHI", sleeper: { playerId: "100", age: 29 } });
    expect(enriched[0].sleeper.externalIds.espnId).toBe("3126486");
    expect(enriched[1].sleeper).toEqual({ status: "unmatched" });
  });

  it("uses a saved Sleeper ID before matching by name", () => {
    const match = matchSleeperPlayer({ name: "Different Name", sleeper: { playerId: "100" } }, sleeperPlayers);

    expect(match?.playerId).toBe("100");
  });

  it("treats cache data as fresh for roughly one day", () => {
    const now = 1000000;
    expect(isSleeperCacheFresh(now - SLEEPER_CACHE_MAX_AGE_MS + 1, now)).toBe(true);
    expect(isSleeperCacheFresh(now - SLEEPER_CACHE_MAX_AGE_MS, now)).toBe(false);
    expect(isSleeperCacheFresh(null, now)).toBe(false);
  });

  it("fetches the Sleeper player map and surfaces request failures", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => sleeperPlayers });
    await expect(fetchSleeperPlayers(fetcher)).resolves.toEqual(sleeperPlayers);

    await expect(fetchSleeperPlayers(vi.fn().mockResolvedValue({ ok: false, status: 503 }))).rejects.toThrow("503");
    await expect(fetchSleeperPlayers(vi.fn().mockRejectedValue(new Error("offline")))).rejects.toThrow("offline");
  });
});
