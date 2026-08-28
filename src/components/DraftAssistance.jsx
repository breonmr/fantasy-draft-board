import { positionClass } from "../data/draftDefaults.js";
import { recommendAvailablePlayers } from "../lib/recommendations.js";
import { actionableTargets } from "../lib/targets.js";
import { TargetRoundBadge } from "./TargetRoundBadge.jsx";

function PlayerLine({ player, positionRank, reason }) {
  return (
    <li className="flex min-w-0 items-center gap-1.5 rounded-md bg-black/5 px-1.5 py-1 text-[11px] dark:bg-white/5">
      <span className="w-4 shrink-0 text-right text-[9px] font-medium tabular-nums opacity-60">{(player.rank ?? 0) + 1}</span>
      <span className={`h-2 w-2 shrink-0 rounded-full ${positionClass(player.pos)}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{player.name}</div>
        <div className="text-[9px] opacity-65">{player.pos || "POS"}{positionRank ?? ""} · {player.team || "TEAM"}{reason ? ` · ${reason}` : ""}</div>
      </div>
      <TargetRoundBadge round={player.targetRound} />
    </li>
  );
}

export function DraftAssistance({ dark, players, history, settings, positionRanks }) {
  const targets = actionableTargets(players);
  const recommendations = recommendAvailablePlayers(players, history, settings);

  return (
    <section className={`mt-1.5 grid gap-1.5 md:grid-cols-2 ${dark ? "text-zinc-100" : "text-gray-900"}`} aria-label="Draft assistance">
      <section className={`${dark ? "bg-zinc-800" : "bg-gray-50"} min-w-0 rounded-lg p-1.5`} aria-labelledby="targets-heading">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h3 id="targets-heading" className="text-sm font-semibold">Targets</h3>
          <span className="text-[9px] opacity-60">Favorites</span>
        </div>
        {targets.length ? (
          <ul className="space-y-1" aria-label="Actionable targets">
            {targets.map((player) => <PlayerLine key={player.id} player={player} positionRank={positionRanks[player.id]} />)}
          </ul>
        ) : (
          <p className="text-[10px] opacity-65">Star players in Rankings to build your draft cheat sheet.</p>
        )}
      </section>

      <section className={`${dark ? "bg-zinc-800" : "bg-gray-50"} min-w-0 rounded-lg p-1.5`} aria-labelledby="recommendations-heading">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h3 id="recommendations-heading" className="text-sm font-semibold">Recommendations</h3>
          {settings.myTeam === null || settings.myTeam === undefined
            ? <span className="text-[9px] opacity-60">Set My Team to personalize</span>
            : <span className="text-[9px] opacity-60">Top available</span>}
        </div>
        {recommendations.length ? (
          <ul className="space-y-1" aria-label="Recommended players">
            {recommendations.map(({ player, reason }) => (
              <PlayerLine key={player.id} player={player} positionRank={positionRanks[player.id]} reason={reason} />
            ))}
          </ul>
        ) : (
          <p className="text-[10px] opacity-65">No available players remain.</p>
        )}
      </section>
    </section>
  );
}
