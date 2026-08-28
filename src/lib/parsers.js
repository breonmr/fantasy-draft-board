import { normalizePlayerName } from "./players.js";

export function parseImportLine(line) {
  const parts = line.split(/[,|\t]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 4 && /^\d+$/.test(parts[0])) {
    const tier = Math.max(1, parseInt(parts[0], 10) || 1);
    const positionToken = (parts[1] || "").toUpperCase();
    const positionMatch = positionToken.match(/[A-Z]+/);
    const pos = positionMatch ? positionMatch[0] : "";
    const team = (parts[2] || "").toUpperCase();
    const name = parts.slice(3, 4).join(" ") || parts[3];
    const target = parts.length >= 5 ? Math.max(0, parseInt(parts[4], 10) || 0) : 0;
    return { tier, pos, team, name, target };
  }

  let name = line.trim();
  let pos = "";
  let team = "";
  const fallback = line.match(/(.+?)\s+(QB|RB|WR|TE|K|DST)\s+([A-Z]{2,3})/i);
  if (fallback) {
    name = fallback[1].trim();
    pos = fallback[2].toUpperCase();
    team = fallback[3].toUpperCase();
  }
  return { tier: 1, pos, team, name, target: 0 };
}

export function parsePlayersCSV(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  const getIndex = (...names) =>
    names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
  const tierIndex = getIndex("tier");
  const positionIndex = getIndex("pos", "position");
  const teamIndex = getIndex("team");
  const nameIndex = getIndex("name", "player", "player name");
  const targetIndex = getIndex("target");
  const adpIndex = getIndex("adp");

  return lines.slice(1).map((line) => {
    const parts = line.split(",").map((part) => part.trim());
    const tier = tierIndex >= 0 ? parseInt(parts[tierIndex] || "1", 10) || 1 : 1;
    const positionToken = positionIndex >= 0 ? (parts[positionIndex] || "").toUpperCase() : "";
    const positionMatch = positionToken.match(/[A-Z]+/);
    const pos = positionMatch ? positionMatch[0] : "";
    const team = teamIndex >= 0 ? (parts[teamIndex] || "").toUpperCase() : "";
    const name = nameIndex >= 0 ? parts[nameIndex] || "" : line;
    const target = targetIndex >= 0 ? Math.max(0, parseInt(parts[targetIndex] || "0", 10) || 0) : 0;
    const adp = adpIndex >= 0 ? parseFloat(parts[adpIndex]) : NaN;
    return { tier, pos, team, name, target, ...(Number.isFinite(adp) ? { adp } : {}) };
  });
}

export function parseAdpCSV(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length);
  if (!lines.length) return {};
  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  const nameIndex = headers.includes("name")
    ? headers.indexOf("name")
    : headers.includes("player")
      ? headers.indexOf("player")
      : headers.indexOf("player name");
  const adpIndex = headers.indexOf("adp");
  const sourceIndex = headers.indexOf("source");
  const parsed = {};

  for (const line of lines.slice(1)) {
    const parts = line.split(",").map((part) => part.trim());
    const name = parts[nameIndex] || "";
    const source = (parts[sourceIndex] || "").toLowerCase();
    const value = parseFloat(parts[adpIndex]);
    if (!name || !Number.isFinite(value)) continue;
    const key = normalizePlayerName(name);
    parsed[key] = parsed[key] || {};
    if (source.includes("yahoo")) parsed[key].yahoo = value;
    if (source.includes("fantasypros") || source.includes("fp")) parsed[key].fantasypros = value;
  }
  return parsed;
}

export function parseStatsCSV(text) {
  const normalizeHeader = (value) => value.replace(/\s+/g, "").toLowerCase();
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length);
  if (!lines.length) return {};
  const headers = lines[0].split(",").map(normalizeHeader);
  const getIndex = (names) =>
    names.map(normalizeHeader).map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
  const indices = {
    name: getIndex(["name", "player", "playername"]),
    year: getIndex(["year", "season"]),
    targets: getIndex(["targets", "tgt"]),
    receptions: getIndex(["receptions", "rec"]),
    rec_yds: getIndex(["recyds", "receivingyards", "rec_yards"]),
    rec_td: getIndex(["rectd", "receivingtd", "receivingtds", "rec_tds"]),
    rush_att: getIndex(["rushatt", "rushingattempts", "rush_attempts"]),
    rush_yds: getIndex(["rushyds", "rushingyards", "rush_yards"]),
    rush_td: getIndex(["rushtd", "rushingtd", "rushingtds", "rush_tds"]),
    pass_att: getIndex(["passatt", "attempts", "passingattempts"]),
    pass_yds: getIndex(["passyds", "passingyards", "pass_yards"]),
    pass_td: getIndex(["passtd", "passingtd", "passingtds", "pass_tds"]),
  };
  const parsed = {};

  for (const line of lines.slice(1)) {
    const parts = line.split(",").map((part) => part.trim());
    const name = parts[indices.name] || "";
    const year = parts[indices.year] || "";
    if (!name || !year) continue;
    const stats = {};
    for (const [field, index] of Object.entries(indices)) {
      if (field === "name" || field === "year") continue;
      stats[field] = index >= 0 ? +parts[index] || 0 : undefined;
    }
    const key = normalizePlayerName(name);
    const normalizedYear = String(parseInt(year, 10));
    parsed[key] = parsed[key] || {};
    parsed[key][normalizedYear] = stats;
  }
  return parsed;
}
