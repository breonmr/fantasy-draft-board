import { positionClass } from "../data/draftDefaults.js";
import { PlayerDetails } from "./PlayerDetails.jsx";
import { Button } from "./ui.jsx";

export function DraftBoard({
  dark,
  settings,
  editNames,
  onEditNamesChange,
  onTeamNameChange,
  onMyTeamChange,
  history,
  players,
  onReset,
  onUndo,
  selectedPlayer,
  selectedPositionRank,
  adp,
  stats,
  openAdp,
  openStats,
  statsFileRef,
  adpFileRef,
  onRefreshPlayerData,
  sleeperRefreshState,
  sleeperRefreshError,
}) {
  const columns = `repeat(${settings.numTeams}, minmax(0, 1fr))`;

  return (
    <section className={`${dark ? "bg-zinc-700" : "bg-white"} min-w-0 rounded-2xl shadow p-1.5`}>
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5">
          <h2 className="font-bold text-sm">Draft Board</h2>
          <Button className="bg-orange-300 text-black px-2 py-1 text-[11px]" onClick={onReset}>
            Reset
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            className={`${editNames ? "bg-blue-500 text-white" : "bg-orange-300 text-black"} px-2 py-1 text-[11px]`}
            onClick={() => onEditNamesChange(!editNames)}
          >
            {editNames ? "Done" : "Edit Teams"}
          </Button>
          <Button className="bg-teal-300 text-black px-2 py-1 text-[11px]" onClick={onUndo} disabled={!history.length}>
            Undo
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-visible">
        <div className="relative min-w-[960px] xl:min-w-0">
          <div className="grid gap-0.5 mb-0.5" style={{ gridTemplateColumns: columns }}>
            {Array.from({ length: settings.numTeams }, (_, column) => {
              const isMyTeam = settings.myTeam === column;
              return (
              <div
                key={column}
                className={`relative ${
                  isMyTeam
                    ? dark ? "bg-teal-950/70 border-teal-400" : "bg-teal-100 border-teal-400"
                    : dark ? "bg-zinc-600 border-zinc-600" : "bg-gray-200 border-gray-200"
                } border p-1 rounded-md min-w-0`}
              >
                {editNames ? (
                  <div className="flex items-center gap-0.5">
                    <input
                      className={`min-w-0 flex-1 px-1 py-0.5 rounded border text-[11px] ${
                        dark ? "bg-zinc-700 border-zinc-500 text-white" : ""
                      }`}
                      value={settings.teamNames[column] || ""}
                      onChange={(event) => onTeamNameChange(column, event.target.value)}
                    />
                    <button
                      type="button"
                      className={`h-6 shrink-0 rounded px-1 text-[8px] font-bold ${
                        isMyTeam ? "bg-teal-400 text-slate-950" : dark ? "bg-zinc-700 text-zinc-300" : "bg-white text-gray-600"
                      }`}
                      onClick={() => onMyTeamChange(column)}
                      aria-label={`Set ${settings.teamNames[column] || `Team ${column + 1}`} as My Team`}
                      title={isMyTeam ? "My Team" : "Set as My Team"}
                    >
                      MY
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 min-w-0">
                    <span className={`block min-w-0 flex-1 truncate text-[11px] font-semibold ${dark ? "text-zinc-200" : "text-black"}`}>
                      {settings.teamNames[column]}
                    </span>
                    {isMyTeam && <span className="shrink-0 rounded bg-teal-400 px-1 text-[8px] font-bold text-slate-950">MY</span>}
                  </div>
                )}
              </div>
              );
            })}
          </div>

          {Array.from({ length: settings.numRounds }, (_, round) => (
            <div key={round} className="grid gap-0.5 mb-0.5" style={{ gridTemplateColumns: columns }}>
              {Array.from({ length: settings.numTeams }, (_, column) => {
                const isMyTeam = settings.myTeam === column;
                const pickIndex =
                  round * settings.numTeams +
                  (round % 2 === 0 ? column : settings.numTeams - 1 - column);
                const playerId = history[pickIndex];
                const player = playerId ? players.find((item) => item.id === playerId) : null;
                return (
                  <div
                    key={column}
                    className={`relative ${
                      isMyTeam
                        ? dark ? "bg-teal-950/20 border-teal-500/70" : "bg-teal-50 border-teal-400/70"
                        : dark ? "bg-zinc-800 border-zinc-600" : "bg-gray-50 border-gray-200"
                    } border rounded-md p-1 min-h-[32px]`}
                  >
                    {player && (
                      <div
                        className={`relative px-1 py-1 pr-4 rounded-md text-[11px] font-semibold ${positionClass(
                          player.pos
                        )}`}
                      >
                        <span className="block truncate">{player.name}</span>
                        <span data-pick-number={pickIndex + 1} className="absolute right-1 top-1/2 -translate-y-1/2 rounded bg-black/10 px-0.5 text-[8px] font-medium opacity-70">
                          {pickIndex + 1}
                        </span>
                      </div>
                    )}
                    {!player && (
                      <span data-pick-number={pickIndex + 1} className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] opacity-70">{pickIndex + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <PlayerDetails
        dark={dark}
        selected={selectedPlayer}
        positionRank={selectedPositionRank}
        adp={adp}
        stats={stats}
        openAdp={openAdp}
        openStats={openStats}
        statsFileRef={statsFileRef}
        adpFileRef={adpFileRef}
        onRefreshPlayerData={onRefreshPlayerData}
        sleeperRefreshState={sleeperRefreshState}
        sleeperRefreshError={sleeperRefreshError}
      />
    </section>
  );
}
