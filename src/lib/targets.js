import { playersByRank } from "./players.js";

export function actionableTargets(players) {
  return playersByRank(players)
    .filter((player) => !player.drafted && (player.starred || player.targetRound))
    .sort((a, b) => {
      const aRound = a.targetRound ?? Infinity;
      const bRound = b.targetRound ?? Infinity;
      return aRound - bRound || (a.rank ?? Infinity) - (b.rank ?? Infinity);
    });
}
