import { availablePlayers, normalizeTier, playersByRank } from "./players.js";

const STARTER_REQUIREMENTS = { QB: 1, RB: 2, WR: 2, TE: 1 };
const FLEX_POSITIONS = new Set(["RB", "WR", "TE"]);
export const RECOMMENDATION_CONFIG = {
  comparableRankWindow: 18,
  recentPickWindow: 8,
};

export function normalizedPosition(player) {
  return (player.pos || "").toUpperCase() === "DEF" ? "DST" : (player.pos || "").toUpperCase();
}

export function teamForPick(pickIndex, numTeams) {
  const round = Math.floor(pickIndex / numTeams);
  const roundPick = pickIndex % numTeams;
  return round % 2 === 0 ? roundPick : numTeams - 1 - roundPick;
}

export function nextPickContext(historyLength, settings) {
  const currentPickIndex = historyLength;
  if (settings.myTeam === null || settings.myTeam === undefined) {
    return { currentPick: currentPickIndex + 1, nextPick: null, interveningPicks: [] };
  }

  let nextPickIndex = currentPickIndex;
  while (teamForPick(nextPickIndex, settings.numTeams) !== settings.myTeam) nextPickIndex++;
  const interveningPicks = Array.from({ length: nextPickIndex - currentPickIndex }, (_, offset) => {
    const pickIndex = currentPickIndex + offset;
    return { pick: pickIndex + 1, team: teamForPick(pickIndex, settings.numTeams) };
  });

  return { currentPick: currentPickIndex + 1, nextPick: nextPickIndex + 1, interveningPicks };
}

export function teamRosters(players, history, settings) {
  const rosters = Array.from({ length: settings.numTeams }, () => []);
  for (const [pickIndex, playerId] of history.entries()) {
    const player = players.find((item) => item.id === playerId);
    if (player) rosters[teamForPick(pickIndex, settings.numTeams)].push(player);
  }
  return rosters;
}

export function myTeamRoster(players, history, settings) {
  if (settings.myTeam === null || settings.myTeam === undefined) return [];
  return teamRosters(players, history, settings)[settings.myTeam];
}

function rosterCounts(roster) {
  return roster.reduce((counts, player) => {
    const position = normalizedPosition(player);
    counts[position] = (counts[position] || 0) + 1;
    return counts;
  }, {});
}

export function positionDemand(roster) {
  const counts = rosterCounts(roster);
  const flexFilled = (counts.RB || 0) + (counts.WR || 0) + (counts.TE || 0);
  const flexNeed = Math.max(0, 6 - flexFilled);
  const starterNeed = (position) => Math.max(0, STARTER_REQUIREMENTS[position] - (counts[position] || 0));

  return {
    QB: counts.QB >= 2 ? 0 : counts.QB === 1 ? 0.4 : 3,
    RB: starterNeed("RB") * 4 + (flexNeed ? 1.25 : 0),
    WR: starterNeed("WR") * 4 + (flexNeed ? 1.25 : 0),
    TE: starterNeed("TE") * 3 + (flexNeed ? 0.5 : 0),
  };
}

export function interveningTeamDemand(players, history, settings) {
  const context = nextPickContext(history.length, settings);
  const rosters = teamRosters(players, history, settings);
  const teamDemands = context.interveningPicks.map(({ pick, team }) => ({
    pick,
    team,
    demand: positionDemand(rosters[team]),
  }));
  const totalDemand = teamDemands.reduce((totals, { demand }) => {
    for (const position of Object.keys(totals)) totals[position] += demand[position];
    return totals;
  }, { QB: 0, RB: 0, WR: 0, TE: 0 });

  return { ...context, teamDemands, totalDemand };
}

export function comparableDepth(player, available, rankWindow = RECOMMENDATION_CONFIG.comparableRankWindow) {
  const position = normalizedPosition(player);
  const tier = normalizeTier(player.tier);
  const rankedAvailable = playersByRank(available).filter((candidate) => !candidate.drafted);

  if (tier) {
    return rankedAvailable.filter((candidate) => (
      candidate.id !== player.id
      && normalizedPosition(candidate) === position
      && normalizeTier(candidate.tier) === tier
    ));
  }

  const cutoff = (player.rank ?? 0) + rankWindow;
  return rankedAvailable.filter((candidate) => (
    normalizedPosition(candidate) === position && (candidate.rank ?? Infinity) <= cutoff
  ));
}

function tierDepth(player, available) {
  const tier = normalizeTier(player.tier);
  if (!tier) return { hasTier: false, tier: null, sameTierCount: null, nextTier: null, tierCliff: false };

  const position = normalizedPosition(player);
  const atPosition = available.filter((candidate) => (
    !candidate.drafted && candidate.id !== player.id && normalizedPosition(candidate) === position
  ));
  const sameTierCount = atPosition.filter((candidate) => normalizeTier(candidate.tier) === tier).length;
  const nextTier = atPosition
    .map((candidate) => normalizeTier(candidate.tier))
    .filter((candidateTier) => candidateTier && candidateTier > tier)
    .sort((a, b) => a - b)[0] ?? null;

  return {
    hasTier: true,
    tier,
    sameTierCount,
    nextTier,
    tierCliff: nextTier !== null && sameTierCount <= 1,
  };
}

export function detectPositionRuns(history, players, window = RECOMMENDATION_CONFIG.recentPickWindow) {
  const recent = history.slice(-window)
    .map((id) => players.find((player) => player.id === id))
    .filter(Boolean);
  const counts = recent.reduce((totals, player) => {
    const position = normalizedPosition(player);
    totals[position] = (totals[position] || 0) + 1;
    return totals;
  }, {});

  return Object.fromEntries(Object.entries(counts).map(([position, count]) => [position, {
    count,
    underway: recent.length >= 4 && count >= 3 && count / recent.length >= 0.4,
  }]));
}

export function estimateSurvivalRisk(player, available, lookAhead, runs = {}, rankWindow) {
  const position = normalizedPosition(player);
  const comparable = comparableDepth(player, available, rankWindow);
  const comparableCount = comparable.length;
  const tier = tierDepth(player, available);
  const teamDemand = lookAhead.totalDemand[position] || 0;
  const needyTeams = lookAhead.teamDemands.filter(({ demand }) => demand[position] >= 2).length;
  const picksAhead = lookAhead.interveningPicks.length;
  const rankPressure = lookAhead.nextPick
    ? Math.min(1.5, Math.max(0, lookAhead.nextPick - ((player.rank ?? 0) + 1)) * 0.04)
    : 0;
  const adpPressure = Number.isFinite(player.adp) && lookAhead.nextPick
    ? Math.min(2, Math.max(0, lookAhead.nextPick - player.adp) * 0.1)
    : 0;
  const runPressure = runs[position]?.underway && comparableCount <= 3 ? 1.5 : 0;
  const tierPressure = tier.tierCliff ? 1.75 : 0;
  const depthRelief = tier.hasTier
    ? Math.min(3, comparableCount * 0.75)
    : Math.min(5, Math.max(0, comparableCount - 1));
  const riskScore = Math.max(0,
    Math.min(8, teamDemand * 0.75)
    + Math.min(2, picksAhead * 0.25)
    + rankPressure
    + adpPressure
    + runPressure
    + tierPressure
    - depthRelief
  );
  const level = riskScore >= 6 ? "high" : riskScore >= 3 ? "moderate" : "low";

  return {
    level,
    riskScore,
    comparableCount,
    needyTeams,
    picksAhead,
    runUnderway: Boolean(runs[position]?.underway),
    ...tier,
  };
}

function myRosterNeed(position, counts) {
  const current = counts[position] || 0;
  const baseNeed = Math.max(0, (STARTER_REQUIREMENTS[position] || 0) - current);
  const flexFilled = (counts.RB || 0) + (counts.WR || 0) + (counts.TE || 0);
  const flexNeed = Math.max(0, 6 - flexFilled);

  if (FLEX_POSITIONS.has(position)) {
    if (baseNeed > 0) return { score: 18, reason: `${position} need` };
    if (flexNeed > 0) return { score: 6, reason: "FLEX depth" };
    return { score: position === "TE" ? -8 : 2, reason: null };
  }
  if (position === "QB") return current === 0 ? { score: 14, reason: "QB need" } : { score: -16, reason: null };
  if (position === "K" || position === "DST") return current === 0 ? { score: -10, reason: null } : { score: -24, reason: null };
  return { score: 0, reason: null };
}

function depthDescription(position, survival) {
  return survival.hasTier
    ? `${survival.comparableCount} same-tier ${position}s remain`
    : `${survival.comparableCount} comparable ${position}s remain`;
}

function recommendationReason(player, position, need, fallAdjustment, survival) {
  if (survival.hasTier && survival.tierCliff && survival.comparableCount === 0) {
    return { reason: `Last ${position} in Tier ${survival.tier}`, detail: "Tier cliff ahead" };
  }
  if (survival.hasTier && survival.tierCliff) {
    return { reason: "Tier cliff ahead", detail: depthDescription(position, survival) };
  }
  if (survival.level === "high" && survival.needyTeams >= 2) {
    return { reason: `${position} may not make it back`, detail: `${survival.needyTeams} ${position}-needy teams pick before you` };
  }
  if (survival.level === "high" && survival.comparableCount <= 2) {
    return { reason: "Thin tier", detail: depthDescription(position, survival) };
  }
  if (fallAdjustment >= 10) return { reason: "Falling value", detail: `Ranked #${(player.rank ?? 0) + 1}` };
  if (need.reason) return { reason: need.reason, detail: survival.comparableCount > 1 ? depthDescription(position, survival) : "Thin tier" };
  if (survival.level === "low" && survival.comparableCount >= 4) {
    return {
      reason: survival.hasTier ? "Safe to wait" : `Safe to wait at ${position}`,
      detail: depthDescription(position, survival),
    };
  }
  if (survival.runUnderway && survival.comparableCount >= 4) {
    return { reason: `${position} run underway`, detail: depthDescription(position, survival) };
  }
  return { reason: "Best available", detail: survival.level === "moderate" ? "Could go before your next pick" : "Strongest ranking value" };
}

// Rankings remain the dominant signal. Look-ahead factors nudge close calls;
// they do not overturn a clearly superior user ranking on position alone.
export function recommendAvailablePlayers(players, history, settings, limit = 3) {
  const available = availablePlayers(players);
  const roster = myTeamRoster(players, history, settings);
  const myCounts = rosterCounts(roster);
  const lookAhead = interveningTeamDemand(players, history, settings);
  const runs = detectPositionRuns(history, players);
  const currentPick = history.length + 1;

  return playersByRank(available)
    .map((player) => {
      const position = normalizedPosition(player);
      const rankingValue = 1000 - (player.rank ?? 999) * 8;
      const need = myRosterNeed(position, myCounts);
      const fall = Math.max(0, currentPick - ((player.rank ?? 0) + 1));
      const fallAdjustment = Math.min(24, fall * 1.2);
      const survival = estimateSurvivalRisk(player, available, lookAhead, runs);
      const survivalAdjustment = survival.level === "high" ? 8 : survival.level === "moderate" ? 3 : -1;
      const tierAdjustment = survival.tierCliff ? 4 : survival.hasTier && survival.comparableCount >= 4 ? -1 : 0;
      const score = rankingValue + need.score + fallAdjustment + survivalAdjustment + tierAdjustment;
      const explanation = recommendationReason(player, position, need, fallAdjustment, survival);

      return { player, score, survival, ...explanation };
    })
    .sort((a, b) => b.score - a.score || (a.player.rank ?? Infinity) - (b.player.rank ?? Infinity))
    .slice(0, limit);
}
