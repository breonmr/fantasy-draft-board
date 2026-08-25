import { positionClass } from "../data/draftDefaults.js";
import { PlayerDetails } from "./PlayerDetails.jsx";
import { Button } from "./ui.jsx";

export function DraftBoard({
  dark,
  settings,
  editNames,
  onEditNamesChange,
  onTeamNameChange,
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
            {editNames ? "Done" : "Edit Team Names"}
          </Button>
          <Button className="bg-teal-300 text-black px-2 py-1 text-[11px]" onClick={onUndo} disabled={!history.length}>
            Undo
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-visible">
        <div className="relative min-w-[960px] xl:min-w-0">
          <div className="grid gap-0.5 mb-0.5" style={{ gridTemplateColumns: columns }}>
            {Array.from({ length: settings.numTeams }, (_, column) => (
              <div
                key={column}
                className={`relative ${
                  dark ? "bg-zinc-600 border-zinc-600" : "bg-gray-200 border-gray-200"
                } border p-1 rounded-md min-w-0`}
              >
                {editNames ? (
                  <input
                    className={`w-full px-1 py-0.5 rounded border text-[11px] ${
                      dark ? "bg-zinc-700 border-zinc-500 text-white" : ""
                    }`}
                    value={settings.teamNames[column] || ""}
                    onChange={(event) => onTeamNameChange(column, event.target.value)}
                  />
                ) : (
                  <span className={`block truncate text-[11px] font-semibold ${dark ? "text-zinc-200" : "text-black"}`}>
                    {settings.teamNames[column]}
                  </span>
                )}
              </div>
            ))}
          </div>

          {Array.from({ length: settings.numRounds }, (_, round) => (
            <div key={round} className="grid gap-0.5 mb-0.5" style={{ gridTemplateColumns: columns }}>
              {Array.from({ length: settings.numTeams }, (_, column) => {
                const pickIndex =
                  round * settings.numTeams +
                  (round % 2 === 0 ? column : settings.numTeams - 1 - column);
                const playerId = history[pickIndex];
                const player = playerId ? players.find((item) => item.id === playerId) : null;
                return (
                  <div
                    key={column}
                    className={`relative ${
                      dark ? "bg-zinc-800 border-zinc-600" : "bg-gray-50 border-gray-200"
                    } border rounded-md p-1 min-h-[32px]`}
                  >
                    {player && (
                      <div
                        className={`relative px-1 py-1 pr-4 rounded-md text-[11px] font-semibold ${positionClass(
                          player.pos
                        )}`}
                      >
                        <span className="block truncate">{player.name}</span>
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 rounded bg-black/10 px-0.5 text-[8px] font-medium opacity-70">
                          {pickIndex + 1}
                        </span>
                      </div>
                    )}
                    {!player && (
                      <span className="absolute left-1.5 bottom-1 text-[9px] opacity-70">{pickIndex + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {settings.myTeam != null && (
            <div className="pointer-events-none absolute inset-0">
              <div className="h-full grid gap-0.5" style={{ gridTemplateColumns: columns }}>
                <div
                  className="h-full rounded-md ring-4 ring-yellow-400"
                  style={{ gridColumn: String(settings.myTeam + 1) }}
                />
              </div>
            </div>
          )}
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
      />
    </section>
  );
}
