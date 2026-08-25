import { normalizePlayerName } from "../lib/players.js";
import { Button } from "./ui.jsx";

export function PlayerDetails({
  dark,
  selected,
  adp,
  stats,
  openAdp,
  openStats,
  statsFileRef,
  adpFileRef,
}) {
  const playerKey = selected ? normalizePlayerName(selected.name) : null;
  const selectedAdp = playerKey ? adp[playerKey] || {} : {};
  const now = new Date().getFullYear();
  const years = [String(now - 1), String(now - 2), String(now - 3)];
  const rows = years.map((year) => ({ year, data: playerKey && stats[playerKey]?.[year] || {} }));
  const display = (value) => (value === undefined ? "—" : String(value));

  return (
    <div className={`${dark ? "bg-zinc-800" : "bg-gray-50"} rounded-xl p-3 mt-3 w-full`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">Player Details</h3>
        <span className="text-xs opacity-70">Click a player name in Overall Rankings to view</span>
      </div>
      {!selected ? (
        <div className="text-sm opacity-70">No player selected.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-10 gap-3">
          <div className="md:col-span-4 flex gap-3 items-start">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200 shrink-0 flex items-center justify-center text-gray-500">
              {selected.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-[14px] truncate">{selected.name}</div>
              <div className="text-[13px] opacity-80">
                {selected.pos || "POS"} • {selected.team || "TEAM"}
              </div>
              <div className="mt-2 text-[13px]">
                <div>ADP (Yahoo): {selectedAdp.yahoo ?? "—"}</div>
                <div>ADP (FantasyPros): {selectedAdp.fantasypros ?? "—"}</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-6">
            <div className="font-semibold text-xs mb-1">Last 3 Seasons</div>
            <div className="overflow-auto">
              {(selected.pos || "").toUpperCase() === "QB" ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left">
                      <th className="py-1 pr-2">Year</th>
                      <th className="py-1 pr-2">Att</th>
                      <th className="py-1 pr-2">Pass Yds</th>
                      <th className="py-1 pr-2">Pass TD</th>
                      <th className="py-1 pr-2">Rush Yds</th>
                      <th className="py-1 pr-2">Rush TD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ year, data }) => (
                      <tr key={year}>
                        <td className="py-1 pr-2">{year}</td>
                        <td className="py-1 pr-2">{display(data.pass_att)}</td>
                        <td className="py-1 pr-2">{display(data.pass_yds)}</td>
                        <td className="py-1 pr-2">{display(data.pass_td)}</td>
                        <td className="py-1 pr-2">{display(data.rush_yds)}</td>
                        <td className="py-1 pr-2">{display(data.rush_td)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left">
                      <th className="py-1 pr-2">Year</th>
                      <th className="py-1 pr-2">Targets</th>
                      <th className="py-1 pr-2">Rec</th>
                      <th className="py-1 pr-2">Rec Yds</th>
                      <th className="py-1 pr-2">Rec TD</th>
                      <th className="py-1 pr-2">Rush Att</th>
                      <th className="py-1 pr-2">Rush Yds</th>
                      <th className="py-1 pr-2">Rush TD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ year, data }) => (
                      <tr key={year}>
                        <td className="py-1 pr-2">{year}</td>
                        <td className="py-1 pr-2">{display(data.targets)}</td>
                        <td className="py-1 pr-2">{display(data.receptions)}</td>
                        <td className="py-1 pr-2">{display(data.rec_yds)}</td>
                        <td className="py-1 pr-2">{display(data.rec_td)}</td>
                        <td className="py-1 pr-2">{display(data.rush_att)}</td>
                        <td className="py-1 pr-2">{display(data.rush_yds)}</td>
                        <td className="py-1 pr-2">{display(data.rush_td)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-2 flex gap-2">
              <Button className="bg-orange-300 text-black" onClick={openStats}>
                Import Stats CSV
              </Button>
              <input ref={statsFileRef} type="file" accept=".csv,text/csv" className="hidden" />
              <Button className="bg-orange-300 text-black" onClick={openAdp}>
                Import ADP CSV
              </Button>
              <input ref={adpFileRef} type="file" accept=".csv,text/csv" className="hidden" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
