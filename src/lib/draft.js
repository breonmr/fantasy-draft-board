import { availablePlayers, playersByRank } from "./players.js";

export function setPlayerDrafted(players, id, drafted) {
  return players.map((player) => (player.id === id ? { ...player, drafted } : player));
}

export function addDraft(history, id) {
  return [...history, id];
}

export function undoLastDraft(history) {
  if (!history.length) return { history, lastId: null };
  return { history: history.slice(0, -1), lastId: history[history.length - 1] };
}

export function resetPlayers(players) {
  return players.map((player) => ({ ...player, drafted: false }));
}

export function nextDraftStatus(historyLength, settings) {
  const totalPicks = settings.numTeams * settings.numRounds;
  if (historyLength >= totalPicks) return { complete: true };

  return {
    complete: false,
    round: Math.floor(historyLength / settings.numTeams) + 1,
    pick: historyLength + 1,
  };
}

export function reorderAvailablePlayers(players, fromIndex, toIndex) {
  const ranked = playersByRank(players);
  const available = availablePlayers(players);
  const reordered = [...available];
  const [moved] = reordered.splice(fromIndex, 1);

  if (!moved) return players;
  reordered.splice(toIndex, 0, moved);

  const byId = Object.fromEntries(players.map((player) => [player.id, player]));
  let availableIndex = 0;
  const merged = ranked.map((player) =>
    player.drafted ? player : reordered[availableIndex++]
  );

  return merged.map((player, index) => ({ ...byId[player.id], rank: index }));
}
