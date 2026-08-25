export const SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl";
export const SLEEPER_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function normalizeSleeperName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv|v)\.?\s*$/, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizePosition(value) {
  const position = String(value || "").toUpperCase();
  return ["DEF", "DST", "D/ST"].includes(position) ? "DST" : position;
}

function normalizeTeam(value) {
  return String(value || "").trim().toUpperCase();
}

function sleeperName(player) {
  return player.full_name || [player.first_name, player.last_name].filter(Boolean).join(" ");
}

function matchesImportedDetails(importedPlayer, sleeperPlayer) {
  if (importedPlayer.pos && normalizePosition(importedPlayer.pos) !== normalizePosition(sleeperPlayer.position)) {
    return false;
  }
  if (importedPlayer.team && normalizeTeam(importedPlayer.team) !== normalizeTeam(sleeperPlayer.team)) {
    return false;
  }
  return true;
}

function keepDefined(values) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

export function retainSleeperMetadata(playerId, player) {
  const externalIds = keepDefined({
    espnId: player.espn_id,
    yahooId: player.yahoo_id,
    sportradarId: player.sportradar_id,
    fantasyDataId: player.fantasy_data_id,
    rotowireId: player.rotowire_id,
    rotoworldId: player.rotoworld_id,
    statsId: player.stats_id,
  });

  const metadata = keepDefined({
    status: "matched",
    playerId: String(playerId),
    firstName: player.first_name,
    lastName: player.last_name,
    team: player.team,
    position: player.position,
    number: player.number,
    age: player.age,
    height: player.height,
    weight: player.weight,
    college: player.college,
    yearsExp: player.years_exp,
    active: player.active,
    availability: player.status,
    injuryStatus: player.injury_status,
    injuryStartDate: player.injury_start_date,
    practiceParticipation: player.practice_participation,
    depthChartPosition: player.depth_chart_position,
    depthChartOrder: player.depth_chart_order,
  });
  if (Object.keys(externalIds).length) metadata.externalIds = externalIds;
  return metadata;
}

export function matchSleeperPlayer(importedPlayer, sleeperPlayers) {
  const savedId = importedPlayer.sleeper?.playerId;
  if (savedId && sleeperPlayers[savedId]) {
    return { playerId: String(savedId), player: sleeperPlayers[savedId] };
  }

  const normalizedName = normalizeSleeperName(importedPlayer.name);
  if (!normalizedName) return null;

  const candidates = Object.entries(sleeperPlayers)
    .filter(([, player]) => normalizeSleeperName(sleeperName(player)) === normalizedName)
    .filter(([, player]) => matchesImportedDetails(importedPlayer, player));

  if (candidates.length !== 1) return null;
  const [playerId, player] = candidates[0];
  return { playerId, player };
}

export function enrichPlayersWithSleeper(players, sleeperPlayers) {
  return players.map((player) => {
    const match = matchSleeperPlayer(player, sleeperPlayers);
    return {
      ...player,
      sleeper: match ? retainSleeperMetadata(match.playerId, match.player) : { status: "unmatched" },
    };
  });
}

export function isSleeperCacheFresh(lastUpdatedAt, now = Date.now()) {
  return Number.isFinite(lastUpdatedAt) && now - lastUpdatedAt < SLEEPER_CACHE_MAX_AGE_MS;
}

export async function fetchSleeperPlayers(fetcher = fetch) {
  const response = await fetcher(SLEEPER_PLAYERS_URL);
  if (!response.ok) throw new Error(`Sleeper request failed (${response.status})`);
  const players = await response.json();
  if (!players || typeof players !== "object" || Array.isArray(players)) {
    throw new Error("Sleeper returned an invalid player dataset");
  }
  return players;
}
