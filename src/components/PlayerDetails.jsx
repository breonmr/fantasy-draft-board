import { useState } from "react";
import { normalizePlayerName } from "../lib/players.js";
import { Button } from "./ui.jsx";

function StatsTable({ position, rows, display }) {
  if (position === "QB") {
    return (
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-left">
            <th className="py-0.5 pr-2">Year</th>
            <th className="py-0.5 pr-2">Att</th>
            <th className="py-0.5 pr-2">Pass Yds</th>
            <th className="py-0.5 pr-2">Pass TD</th>
            <th className="py-0.5 pr-2">Rush Yds</th>
            <th className="py-0.5 pr-2">Rush TD</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ year, data }) => (
            <tr key={year}>
              <td className="py-0.5 pr-2">{year}</td>
              <td className="py-0.5 pr-2">{display(data.pass_att)}</td>
              <td className="py-0.5 pr-2">{display(data.pass_yds)}</td>
              <td className="py-0.5 pr-2">{display(data.pass_td)}</td>
              <td className="py-0.5 pr-2">{display(data.rush_yds)}</td>
              <td className="py-0.5 pr-2">{display(data.rush_td)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="text-left">
          <th className="py-0.5 pr-2">Year</th>
          <th className="py-0.5 pr-2">Targets</th>
          <th className="py-0.5 pr-2">Rec</th>
          <th className="py-0.5 pr-2">Rec Yds</th>
          <th className="py-0.5 pr-2">Rec TD</th>
          <th className="py-0.5 pr-2">Rush Att</th>
          <th className="py-0.5 pr-2">Rush Yds</th>
          <th className="py-0.5 pr-2">Rush TD</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ year, data }) => (
          <tr key={year}>
            <td className="py-0.5 pr-2">{year}</td>
            <td className="py-0.5 pr-2">{display(data.targets)}</td>
            <td className="py-0.5 pr-2">{display(data.receptions)}</td>
            <td className="py-0.5 pr-2">{display(data.rec_yds)}</td>
            <td className="py-0.5 pr-2">{display(data.rec_td)}</td>
            <td className="py-0.5 pr-2">{display(data.rush_att)}</td>
            <td className="py-0.5 pr-2">{display(data.rush_yds)}</td>
            <td className="py-0.5 pr-2">{display(data.rush_td)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function recentStatsSummary(position, row) {
  const { data, year } = row;
  const stats = position === "QB"
    ? [["Pass", data.pass_yds], ["TD", data.pass_td], ["Rush", data.rush_yds]]
    : [["Rec", data.receptions], ["Yds", data.rec_yds], ["TD", data.rec_td]];
  const available = stats.filter(([, value]) => value !== undefined && value !== null && value !== "");

  return available.length
    ? `${year}: ${available.map(([label, value]) => `${value} ${label}`).join(" · ")}`
    : "Recent stats have not been imported.";
}

function AdpSummary({ selectedAdp }) {
  return (
    <dl className="flex items-center gap-2 text-[10px] whitespace-nowrap">
      <div>
        <dt className="inline opacity-60">Yahoo </dt>
        <dd className="inline font-semibold">{selectedAdp.yahoo ?? "—"}</dd>
      </div>
      <div>
        <dt className="inline opacity-60">FP </dt>
        <dd className="inline font-semibold">{selectedAdp.fantasypros ?? "—"}</dd>
      </div>
    </dl>
  );
}

function PlayerIdentity({ selected, compact = false }) {
  const initials = selected.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={`${compact ? "w-8 h-8 text-[10px]" : "w-12 h-12 text-xs"} rounded-lg bg-gray-200 shrink-0 flex items-center justify-center text-gray-500`}>
        {initials}
      </div>
      <div className="min-w-0">
        <div className={`${compact ? "text-sm" : "text-base"} font-bold truncate`}>{selected.name}</div>
        <div className="text-[11px] opacity-70">
          {selected.pos || "POS"} • {selected.team || "TEAM"}
          {selected.status && ` • ${selected.status}`}
        </div>
      </div>
    </div>
  );
}

function ExpandedDetails({ dark, selected, selectedAdp, rows, display, openAdp, openStats, statsFileRef, adpFileRef, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 p-3 md:p-6">
      <section
        className={`${dark ? "bg-zinc-800 text-zinc-100" : "bg-gray-50 text-gray-900"} flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-label="Expanded player details"
      >
        <header className={`flex items-center justify-between gap-2 border-b p-3 ${dark ? "border-zinc-700" : "border-gray-200"}`}>
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-wide opacity-60">Player details</div>
            <div className="font-bold truncate">{selected.name}</div>
          </div>
          <Button className="bg-gray-200 text-black px-2 py-1 text-[11px]" onClick={onClose} aria-label="Close expanded player details">
            Close
          </Button>
        </header>

        <div className="grid min-h-0 grid-cols-1 gap-2 overflow-y-auto p-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-2 min-w-0">
            <section className={`${dark ? "bg-zinc-700" : "bg-white"} rounded-lg p-2`}>
              <div className="text-[10px] font-medium uppercase tracking-wide opacity-60">Player profile</div>
              <div className="mt-1"><PlayerIdentity selected={selected} /></div>
            </section>

            <section className={`${dark ? "bg-zinc-700" : "bg-white"} rounded-lg p-2`}>
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wide opacity-60">Recent performance</div>
                  <div className="text-[11px] opacity-70">Last 3 Seasons</div>
                </div>
                <div className="flex gap-1">
                  <Button className="bg-orange-300 text-black px-2 py-1 text-[10px]" onClick={openStats}>Import Stats CSV</Button>
                  <input ref={statsFileRef} type="file" accept=".csv,text/csv" className="hidden" />
                  <Button className="bg-orange-300 text-black px-2 py-1 text-[10px]" onClick={openAdp}>Import ADP CSV</Button>
                  <input ref={adpFileRef} type="file" accept=".csv,text/csv" className="hidden" />
                </div>
              </div>
              <div className="overflow-auto"><StatsTable position={(selected.pos || "").toUpperCase()} rows={rows} display={display} /></div>
            </section>
          </div>

          <aside className={`${dark ? "bg-zinc-700" : "bg-white"} flex min-h-0 flex-col rounded-lg p-2`}>
            <div className="text-[10px] font-medium uppercase tracking-wide opacity-60">Draft context</div>
            <div className="mt-1"><AdpSummary selectedAdp={selectedAdp} /></div>
            <div className="mt-3 text-[10px] font-medium uppercase tracking-wide opacity-60">Recent news</div>
            <div className="mt-1 max-h-52 overflow-y-auto overscroll-contain text-[11px] opacity-70">
              No news data is loaded yet. When connected, recent headlines will scroll here without expanding the page.
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

export function PlayerDetails({ dark, selected, adp, stats, openAdp, openStats, statsFileRef, adpFileRef }) {
  const [expanded, setExpanded] = useState(false);
  const playerKey = selected ? normalizePlayerName(selected.name) : null;
  const selectedAdp = playerKey ? adp[playerKey] || {} : {};
  const now = new Date().getFullYear();
  const years = [String(now - 1), String(now - 2), String(now - 3)];
  const rows = years.map((year) => ({ year, data: playerKey && stats[playerKey]?.[year] || {} }));
  const display = (value) => (value === undefined ? "—" : String(value));
  const latestSummary = selected ? recentStatsSummary((selected.pos || "").toUpperCase(), rows[0]) : null;

  return (
    <section className={`${dark ? "bg-zinc-800" : "bg-gray-50"} rounded-xl p-1.5 mt-1.5 w-full`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-sm">Player Details</h3>
        {selected && (
          <Button
            className="bg-gray-200 text-black px-2 py-1 text-[10px]"
            onClick={() => setExpanded(true)}
            aria-label="Expand player details"
          >
            Expand
          </Button>
        )}
      </div>

      {!selected ? (
        <div className="mt-1 text-[11px] opacity-70">Select an available player to view draft details.</div>
      ) : (
        <div className={`mt-1 grid gap-1.5 ${dark ? "bg-zinc-700" : "bg-white"} rounded-lg p-1.5 lg:grid-cols-[minmax(180px,1fr)_auto_minmax(220px,1.2fr)] lg:items-center`}>
          <PlayerIdentity selected={selected} compact />
          <AdpSummary selectedAdp={selectedAdp} />
          <div className="min-w-0 truncate text-[10px] leading-tight opacity-70">
            <span className="font-medium opacity-100">Stats </span>{latestSummary}
            <span className="mx-1 opacity-40">|</span>
            <span className="font-medium opacity-100">News </span>No news data loaded.
          </div>
        </div>
      )}

      {selected && expanded && (
        <ExpandedDetails
          dark={dark}
          selected={selected}
          selectedAdp={selectedAdp}
          rows={rows}
          display={display}
          openAdp={openAdp}
          openStats={openStats}
          statsFileRef={statsFileRef}
          adpFileRef={adpFileRef}
          onClose={() => setExpanded(false)}
        />
      )}
    </section>
  );
}
