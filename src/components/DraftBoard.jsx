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
  adp,
  stats,
  openAdp,
  openStats,
  statsFileRef,
  adpFileRef,
}) {
  const columns = `repeat(${settings.numTeams}, minmax(140px, 1fr))`;

  return (
    <section className={`${dark ? "bg-zinc-700" : "bg-white"} rounded-2xl shadow p-3 md:col-span-8`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="font-bold">Draft Board</h2>
          <Button className="bg-orange-300 text-black" onClick={onReset}>
            Reset
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className={editNames ? "bg-blue-500 text-white" : "bg-orange-300 text-black"}
            onClick={() => onEditNamesChange(!editNames)}
          >
            {editNames ? "Done" : "Edit Team Names"}
          </Button>
          <Button className="bg-teal-300 text-black" onClick={onUndo} disabled={!history.length}>
            Undo
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-visible">
        <div className="relative">
          <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: columns }}>
            {Array.from({ length: settings.numTeams }, (_, column) => (
              <div
                key={column}
                className={`relative ${
                  dark ? "bg-zinc-600 border-zinc-600" : "bg-gray-200 border-gray-200"
                } border p-2 rounded-md`}
              >
                {editNames ? (
                  <input
                    className={`w-full px-2 py-1 rounded border text-sm ${
                      dark ? "bg-zinc-700 border-zinc-500 text-white" : ""
                    }`}
                    value={settings.teamNames[column] || ""}
                    onChange={(event) => onTeamNameChange(column, event.target.value)}
                  />
                ) : (
                  <span className={`font-semibold ${dark ? "text-zinc-200" : "text-black"}`}>
                    {settings.teamNames[column]}
                  </span>
                )}
              </div>
            ))}
          </div>

          {Array.from({ length: settings.numRounds }, (_, round) => (
            <div key={round} className="grid gap-2 mb-2" style={{ gridTemplateColumns: columns }}>
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
                    } border rounded-md p-2 min-h-[34px]`}
                  >
                    <span className="absolute left-1 bottom-1 text-[12px] opacity-70">{pickIndex + 1}</span>
                    {player && (
                      <div
                        className={`px-2 py-1 rounded-md text-[12px] font-semibold ${positionClass(
                          player.pos
                        )} truncate`}
                      >
                        {player.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {settings.myTeam != null && (
            <div className="pointer-events-none absolute inset-0">
              <div className="h-full grid gap-2" style={{ gridTemplateColumns: columns }}>
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
