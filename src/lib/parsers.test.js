import { describe, expect, it } from "vitest";
import { parseAdpCSV, parseImportLine, parsePlayersCSV, parseStatsCSV } from "./parsers.js";

describe("player import parsing", () => {
  it("parses text imports and the fallback name-position-team format", () => {
    expect(parseImportLine("2, WR, cin, Ja'Marr Chase, 3")).toEqual({
      tier: 2,
      pos: "WR",
      team: "CIN",
      name: "Ja'Marr Chase",
      target: 3,
    });
    expect(parseImportLine("Josh Allen QB BUF")).toEqual({
      pos: "QB",
      team: "BUF",
      name: "Josh Allen",
      target: 0,
    });
  });

  it("supports flexible player CSV header order", () => {
    const players = parsePlayersCSV("Player,Team,Position,Target,Tier\nAmon-Ra St. Brown,det,wr,2,3");

    expect(players).toEqual([
      { tier: 3, pos: "WR", team: "DET", name: "Amon-Ra St. Brown", target: 2 },
    ]);
  });

  it("keeps tiers optional and ignores blank or invalid tier values", () => {
    expect(parsePlayersCSV("Name,Position,Team\nJosh Allen,QB,BUF")).toEqual([
      { pos: "QB", team: "BUF", name: "Josh Allen", target: 0 },
    ]);
    expect(parsePlayersCSV("Name,Position,Team,TIER\nA,QB,BUF,\nB,RB,DET,0\nC,WR,MIN,three")).toEqual([
      { pos: "QB", team: "BUF", name: "A", target: 0 },
      { pos: "RB", team: "DET", name: "B", target: 0 },
      { pos: "WR", team: "MIN", name: "C", target: 0 },
    ]);
  });

  it("keeps an optional static ADP column when present", () => {
    expect(parsePlayersCSV("Name,Position,Team,ADP\nAmon-Ra St. Brown,WR,DET,14.2")).toEqual([
      { pos: "WR", team: "DET", name: "Amon-Ra St. Brown", target: 0, adp: 14.2 },
    ]);
  });

  it("merges recognized ADP sources and maps stat header aliases", () => {
    expect(parseAdpCSV("name,adp,source\nAmon-Ra St. Brown,14.2,Yahoo\nAmon-Ra St. Brown,13.1,FantasyPros")).toEqual({
      "amonra st brown": { yahoo: 14.2, fantasypros: 13.1 },
    });
    expect(parseStatsCSV("player,season,rec,recyds,rectd\nAmon-Ra St. Brown,2025,99,1200,8")).toEqual({
      "amonra st brown": {
        "2025": {
          targets: undefined,
          receptions: 99,
          rec_yds: 1200,
          rec_td: 8,
          rush_att: undefined,
          rush_yds: undefined,
          rush_td: undefined,
          pass_att: undefined,
          pass_yds: undefined,
          pass_td: undefined,
        },
      },
    });
  });
});
