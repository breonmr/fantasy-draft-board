import { normalizePlayerName } from "../lib/players.js";
import { Button } from "./ui.jsx";

function AdpCard({ dark, label, value }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${dark ? "border-zinc-600 bg-zinc-800" : "border-gray-200 bg-white"}`}>
      <div className={`text-[11px] font-medium uppercase tracking-wide ${dark ? "text-zinc-400" : "text-gray-500"}`}>{label}</div>
      <div className={`mt-0.5 text-lg font-bold ${dark ? "text-white" : "text-gray-900"}`}>{value ?? "—"}</div>
    </div>
  );
}

function StatsTable({ position, rows, display }) {
  if (position === "QB") {
    return (
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
    );
  }

  return (
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
  );
}

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
    <section className={`${dark ? "bg-zinc-800" : "bg-gray-50"} rounded-xl p-3 mt-3 w-full`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-sm">Player Details</h3>
          <span className="text-xs opacity-70">Click any available player for a closer look.</span>
        </div>
      </div>

      {!selected ? (
        <div className="text-sm opacity-70">No player selected.</div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-3">
            <section className={`${dark ? "bg-zinc-700" : "bg-white"} rounded-lg p-3 lg:col-span-4`}>
              <div className="text-[11px] font-medium uppercase tracking-wide opacity-60">Player profile</div>
              <div className="mt-2 flex gap-3 items-center">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 shrink-0 flex items-center justify-center text-gray-500">
                  {selected.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-base truncate">{selected.name}</div>
                  <div className="text-sm opacity-80">
                    {selected.pos || "POS"} • {selected.team || "TEAM"}
                  </div>
                </div>
              </div>
            </section>

            <section className={`${dark ? "bg-zinc-700" : "bg-white"} rounded-lg p-3 lg:col-span-6`}>
              <div className="text-[11px] font-medium uppercase tracking-wide opacity-60">Draft context</div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <AdpCard dark={dark} label="Yahoo ADP" value={selectedAdp.yahoo} />
                <AdpCard dark={dark} label="FantasyPros ADP" value={selectedAdp.fantasypros} />
              </div>
            </section>
          </div>

          <section className={`${dark ? "bg-zinc-700" : "bg-white"} rounded-lg p-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide opacity-60">Recent performance</div>
                <div className="text-xs opacity-70">Last 3 Seasons</div>
              </div>
              <div className="flex gap-2">
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
            <div className="overflow-auto">
              <StatsTable position={(selected.pos || "").toUpperCase()} rows={rows} display={display} />
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
