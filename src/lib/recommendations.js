import { availablePlayers, playersByRank } from "./players.js";

const STARTER_REQUIREMENTS = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DST: 1 };
const FLEX_POSITIONS = new Set(["RB", "WR", "TE"]);

function normalizedPosition(player) {
  return (player.pos || "").toUpperCase() === "DEF" ? "DST" : (player.pos || "").toUpperCase();
}

export function teamForPick(pickIndex, numTeams) {
  const round = Math.floor(pickIndex / numTeams);
  const roundPick = pickIndex % numTeams;
  return round % 2 === 0 ? roundPick : numTeams - 1 - roundPick;
}

export function myTeamRoster(players, history, settings) {
  if (settings.myTeam === null || settings.myTeam === undefined) return [];
  return history.flatMap((playerId, pickIndex) => {
    if (teamForPick(pickIndex, settings.numTeams) !== settings.myTeam) return [];
    const player = players.find((item) => item.id === playerId);
    return player ? [player] : [];
  });
}

function rosterCounts(roster) {
  return roster.reduce((counts, player) => {
    const position = normalizedPosition(player);
    counts[position] = (counts[position] || 0) + 1;
    return counts;
  }, {});
}

function needAdjustment(position, counts) {
  const current = counts[position] || 0;
  const baseNeed = Math.max(0, (STARTER_REQUIREMENTS[position] || 0) - current);
  const flexFilled = (counts.RB || 0) + (counts.WR || 0) + (counts.TE || 0);
  const flexNeed = Math.max(0, 6 - flexFilled);

  if (FLEX_POSITIONS.has(position)) {
    if (baseNeed > 0) return { score: 18, reason: `${position} need` };
    if (flexNeed > 0) return { score: 6, reason: "FLEX depth" };
    return { score: position === "TE" ? -8 : 2, reason: null };
  }

  if (position === "QB") return current === 0
    ? { score: 14, reason: "QB need" }
    : { score: -16, reason: null };
  if (position === "K" || position === "DST") return current === 0
    ? { score: -10, reason: null }
    : { score: -24, reason: null };
  return { score: 0, reason: null };
}

function scarcityAdjustment(position, nextPlayers) {
  if (!FLEX_POSITIONS.has(position)) return 0;
  const positionCount = nextPlayers.filter((player) => normalizedPosition(player) === position).length;
  return Math.max(0, 4 - positionCount) * 1.5;
}

// Rankings remain the dominant signal. Roster construction, falling value, and
// scarcity can shift close decisions without overriding a major ranking edge.
export function recommendAvailablePlayers(players, history, settings, limit = 3) {
  const available = availablePlayers(players);
  const nextPlayers = playersByRank(available).slice(0, 20);
  const roster = myTeamRoster(players, history, settings);
  const counts = rosterCounts(roster);
  const currentPick = history.length + 1;

  return playersByRank(available)
    .map((player) => {
      const position = normalizedPosition(player);
      const rankingValue = 1000 - (player.rank ?? 999) * 8;
      const need = needAdjustment(position, counts);
      const fall = Math.max(0, currentPick - ((player.rank ?? 0) + 1));
      const valueFallAdjustment = Math.min(24, fall * 1.2);
      const scarcity = scarcityAdjustment(position, nextPlayers);
      const score = rankingValue + need.score + valueFallAdjustment + scarcity;
      const reason = valueFallAdjustment >= 10
        ? "Falling value"
        : need.reason
          || (scarcity >= 3 ? "Position scarcity" : "Best available");

      return { player, score, reason };
    })
    .sort((a, b) => b.score - a.score || (a.player.rank ?? Infinity) - (b.player.rank ?? Infinity))
    .slice(0, limit);
}
