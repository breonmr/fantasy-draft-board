import { playersByRank } from "./players.js";

export function actionableTargets(players) {
  return playersByRank(players)
    .filter((player) => player.starred && !player.drafted)
    .sort((a, b) => {
      const aRound = a.targetRound ?? Infinity;
      const bRound = b.targetRound ?? Infinity;
      return aRound - bRound || (a.rank ?? Infinity) - (b.rank ?? Infinity);
    });
}
