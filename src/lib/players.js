export const createId = () => Math.random().toString(36).slice(2, 9);

export function normalizePlayerName(value) {
  return (value || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function createPlayers(rows) {
  return rows.map((row, index) => ({
    id: createId(),
    name: row.name,
    pos: row.pos,
    team: row.team,
    tier: row.tier || 1,
    target: row.target || 0,
    drafted: false,
    rank: index,
  }));
}

export function playersByRank(players) {
  return [...players].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
}

export function availablePlayers(players) {
  return playersByRank(players).filter((player) => !player.drafted);
}

export function positionRankMap(players) {
  const counts = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
  const map = {};

  for (const player of players) {
    const position = player.pos || "NA";
    if (counts[position] !== undefined) {
      counts[position]++;
      map[player.id] = counts[position];
    }
  }

  return map;
}

export function filterAvailablePlayers(players, position, search) {
  const available = availablePlayers(players);
  const filtered = available.filter((player) => {
    if (position !== "ALL" && (player.pos || "") !== position) return false;
    if (!search.trim()) return true;
    const haystack = `${player.name} ${player.pos || ""} ${player.team || ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  if (!search.trim()) return filtered;

  const query = search.trim().toLowerCase();
  return [...filtered].sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aStarts = aName.startsWith(query);
    const bStarts = bName.startsWith(query);
    if (aStarts !== bStarts) return aStarts ? -1 : 1;
    const aHas = aName.includes(query);
    const bHas = bName.includes(query);
    if (aHas !== bHas) return aHas ? -1 : 1;
    return aName.localeCompare(bName);
  });
}

export function mergeStatsData(current, imported) {
  const merged = { ...current };
  for (const playerName of Object.keys(imported)) {
    merged[playerName] = { ...(merged[playerName] || {}), ...imported[playerName] };
  }
  return merged;
}
