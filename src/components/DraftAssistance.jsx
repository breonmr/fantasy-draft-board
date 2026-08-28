import { positionClass } from "../data/draftDefaults.js";
import { nextPickContext, recommendAvailablePlayers } from "../lib/recommendations.js";
import { actionableTargets } from "../lib/targets.js";
import { TargetRoundBadge } from "./TargetRoundBadge.jsx";

function PlayerLine({ player, positionRank, reason, detail, showFavorite = false }) {
  return (
    <li className="flex min-w-0 items-center gap-1.5 rounded-md bg-black/5 px-1.5 py-1 text-[11px] dark:bg-white/5">
      <span className="w-4 shrink-0 text-right text-[9px] font-medium tabular-nums opacity-60">{(player.rank ?? 0) + 1}</span>
      <span className={`h-2 w-2 shrink-0 rounded-full ${positionClass(player.pos)}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{player.name}</div>
        <div className="truncate text-[9px] opacity-65">{player.pos || "POS"}{positionRank ?? ""} · {player.team || "TEAM"}{reason ? ` · ${reason}` : ""}</div>
        {detail && <div className="truncate text-[9px] opacity-55">{detail}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {showFavorite && player.starred && (
          <span className="text-sm leading-none text-amber-400" aria-label="Favorite target" title="Favorite target">★</span>
        )}
        <TargetRoundBadge round={player.targetRound} />
      </div>
    </li>
  );
}

export function DraftAssistance({ dark, players, history, settings, positionRanks }) {
  const targets = actionableTargets(players);
  const recommendations = recommendAvailablePlayers(players, history, settings);
  const pickContext = nextPickContext(history.length, settings);

  return (
    <section className={`mt-1.5 grid gap-1.5 md:min-h-0 md:flex-1 md:grid-cols-2 ${dark ? "text-zinc-100" : "text-gray-900"}`} aria-label="Draft assistance">
      <section className={`${dark ? "bg-zinc-800" : "bg-gray-50"} min-w-0 rounded-lg p-1.5 md:flex md:min-h-0 md:flex-col md:overflow-hidden`} aria-labelledby="targets-heading">
        <div className="mb-1 flex shrink-0 items-baseline justify-between gap-2">
          <h3 id="targets-heading" className="text-sm font-semibold">Targets</h3>
          <span className="text-[9px] opacity-60">Favorites & targets</span>
        </div>
        {targets.length ? (
          <ul className="space-y-1 md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain md:pr-0.5" aria-label="Actionable targets">
            {targets.map((player) => <PlayerLine key={player.id} player={player} positionRank={positionRanks[player.id]} showFavorite />)}
          </ul>
        ) : (
          <p className="text-[10px] opacity-65">Star players or assign target rounds in Rankings to build your draft cheat sheet.</p>
        )}
      </section>

      <section className={`${dark ? "bg-zinc-800" : "bg-gray-50"} min-w-0 rounded-lg p-1.5 md:flex md:min-h-0 md:flex-col md:overflow-hidden`} aria-labelledby="recommendations-heading">
        <div className="mb-1 flex shrink-0 items-baseline justify-between gap-2">
          <h3 id="recommendations-heading" className="text-sm font-semibold">Recommendations</h3>
          {settings.myTeam === null || settings.myTeam === undefined
            ? <span className="text-[9px] opacity-60">Set My Team to personalize</span>
            : <span className="text-[9px] opacity-60">Next pick #{pickContext.nextPick}</span>}
        </div>
        {recommendations.length ? (
          <ul className="space-y-1 md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain md:pr-0.5" aria-label="Recommended players">
            {recommendations.map(({ player, reason, detail }) => (
              <PlayerLine key={player.id} player={player} positionRank={positionRanks[player.id]} reason={reason} detail={detail} />
            ))}
          </ul>
        ) : (
          <p className="text-[10px] opacity-65">No available players remain.</p>
        )}
      </section>
    </section>
  );
}
