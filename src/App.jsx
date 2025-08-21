import React, { useEffect, useMemo, useRef, useState } from "react";

/** -------- Storage / model -------- */
const STORAGE_KEY = "fantasy-draft-board-v2";

// starter seed (you’ll replace via Quick Import)
const STARTERS = [
  "Ja'Marr Chase WR CIN T1",
  "Justin Jefferson WR MIN T1",
  "Christian McCaffrey RB SF T1",
  "CeeDee Lamb WR DAL T1",
  "Bijan Robinson RB ATL T1",
  "Breece Hall RB NYJ T1",
  "Amon-Ra St. Brown WR DET T1",
  "Tyreek Hill WR MIA T1",
  "Garrett Wilson WR NYJ T1",
  "Jonathan Taylor RB IND T2",
];

const POS_LIST = ["ALL", "RB", "WR", "QB", "TE", "K", "DST"];
const TIER_COLORS = {
  1: "bg-green-100 text-green-800",
  2: "bg-blue-100 text-blue-800",
  3: "bg-yellow-100 text-yellow-800",
  4: "bg-orange-100 text-orange-800",
  5: "bg-rose-100 text-rose-800",
};

const uid = () => Math.random().toString(36).slice(2, 9);

function parseLine(line) {
  // “Name POS TEAM T#” (POS & T# optional)
  let name = line.trim();
  let pos = "";
  let team = "";
  let tier = 1;

  const tierMatch = line.match(/T(\d+)/i);
  if (tierMatch) tier = parseInt(tierMatch[1], 10);

  const pt = line.match(/(.+?)\s+(QB|RB|WR|TE|K|DST)\s+([A-Z]{2,3})/i);
  if (pt) {
    name = pt[1].trim();
    pos = pt[2].toUpperCase();
    team = pt[3].toUpperCase();
  }
  return { name, pos, team, tier };
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return p;
    }
  } catch {}
  // seed with ranks in current order
  return STARTERS.map((s, i) => {
    const { name, pos, team, tier } = parseLine(s);
    return {
      id: uid(),
      name,
      pos,
      team,
      tier,
      drafted: false,
      rank: i, // overall order
    };
  });
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/** -------- UI primitives -------- */
const Button = ({ className = "", ...p }) => (
  <button
    {...p}
    className={`px-3 py-2 rounded-2xl shadow text-sm hover:shadow-md active:scale-[0.99] ${p.disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
  />
);
const Input = ({ className = "", ...p }) => (
  <input
    {...p}
    className={`px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring w-full ${className}`}
  />
);
const Textarea = ({ className = "", ...p }) => (
  <textarea
    {...p}
    className={`px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring w-full ${className}`}
  />
);

/** -------- App -------- */
export default function App() {
  const [players, setPlayers] = useState(loadInitial());
  const [history, setHistory] = useState([]); // stack of drafted ids
  const [editMode, setEditMode] = useState(false);
  const [posTab, setPosTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const dragIndexRef = useRef(null);

  // persist
  useEffect(() => save(players), [players]);

  /** Derived views */
  const byRank = useMemo(() => {
    // Stable sort by rank (ascending)
    return [...players].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  }, [players]);

  // available (not drafted)
  const available = useMemo(() => byRank.filter((p) => !p.drafted), [byRank]);

  // position ranking for available list
  const posRankMap = useMemo(() => {
    const counts = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
    const map = {};
    for (const p of available) {
      const pos = p.pos || "NA";
      if (counts[pos] !== undefined) {
        counts[pos] += 1;
        map[p.id] = counts[pos];
      } else {
        map[p.id] = undefined;
      }
    }
    return map;
  }, [available]);

  // middle column filtered list
  const middleList = useMemo(() => {
    const base = available;
    return base.filter((p) => {
      if (posTab !== "ALL" && (p.pos || "") !== posTab) return false;
      if (!search.trim()) return true;
      const hay = `${p.name} ${p.pos || ""} ${p.team || ""}`.toLowerCase();
      return hay.includes(search.toLowerCase());
    });
  }, [available, posTab, search]);

  /** Actions */
  const draftPlayer = (id) => {
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, drafted: true } : p)));
    setHistory((h) => [...h, id]);
  };

  const undoLast = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const lastId = h[h.length - 1];
      setPlayers((ps) => ps.map((p) => (p.id === lastId ? { ...p, drafted: false } : p)));
      return h.slice(0, -1);
    });
  };

  const resetDraft = () => {
    if (!confirm("Reset the entire draft? This will undraft everyone and clear history.")) return;
    setPlayers((ps) => ps.map((p) => ({ ...p, drafted: false })));
    setHistory([]);
  };

  const changeTier = (id, delta) =>
    setPlayers((ps) =>
      ps.map((p) => (p.id === id ? { ...p, tier: Math.max(1, (p.tier || 1) + delta) } : p))
    );

  // drag & drop (edit mode) — reorder by overall
  const onDragStart = (index) => (e) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e) => {
    if (!editMode) return;
    e.preventDefault();
  };
  const onDrop = (index) => (e) => {
    if (!editMode) return;
    e.preventDefault();
    const from = dragIndexRef.current;
    const to = index;
    if (from == null || to == null || from === to) return;
    // reorder byRank, then write back ranks
    const ordered = [...byRank];
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    setPlayers((ps) =>
      ordered.map((p, i) => {
        const original = ps.find((x) => x.id === p.id)!;
        return { ...original, rank: i };
      })
    );
    dragIndexRef.current = null;
  };

  /** Import / Export */
  const [importText, setImportText] = useState("");
  const importReplace = () => {
    const lines = importText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return;
    const next = lines.map((line, i) => {
      const { name, pos, team, tier } = parseLine(line);
      return { id: uid(), name, pos, team, tier: tier || 1, drafted: false, rank: i };
    });
    setPlayers(next);
    setHistory([]);
    setImportText("");
    setEditMode(false);
  };

  const exportCSV = () => {
    const header = "rank,name,pos,team,tier,drafted\n";
    const rows = byRank
      .map(
        (p, i) =>
          `${i + 1},"${p.name.replace(/"/g, '""')}",${p.pos || ""},${p.team || ""},${p.tier || 1},${
            p.drafted ? "yes" : "no"
          }`
      )
      .join("\n");
    downloadBlob(header + rows, "players.csv", "text/csv");
  };
  const exportJSON = () => downloadBlob(JSON.stringify(players, null, 2), "players.json", "application/json");

  function downloadBlob(text, filename, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Rendering helpers */
  const tierPill = (tier) => (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${TIER_COLORS[tier] || "bg-gray-100 text-gray-700"}`}>
      Tier {tier || 1}
    </span>
  );

  const PlayerRow = ({ p, overallIndex, posIndex, showDraftBtn }) => (
    <li
      key={p.id}
      className={`rounded-md border bg-white flex items-center justify-between gap-2 p-2 ${editMode ? "cursor-grab" : ""}`}
      draggable={editMode}
      onDragStart={onDragStart(overallIndex)}
      onDragOver={onDragOver}
      onDrop={onDrop(overallIndex)}
      title={editMode ? "Drag to reorder" : ""}
    >
      <div className="flex items-center gap-2">
        <span className="w-6 text-xs text-gray-500 tabular-nums">{overallIndex + 1}</span>
        {tierPill(p.tier || 1)}
        <span className="text-[11px] px-2 py-0.5 bg-gray-100 rounded-full">{p.pos ? `${p.pos}${posIndex ?? ""}` : "POS"}</span>
        <span className="font-semibold">{p.name}</span>
      </div>
      <div className="flex items-center gap-1">
        {editMode ? (
          <>
            <Button className="bg-gray-100" onClick={() => changeTier(p.id, -1)}>-Tier</Button>
            <Button className="bg-gray-100" onClick={() => changeTier(p.id, +1)}>+Tier</Button>
          </>
        ) : (
          showDraftBtn && (
            <Button className="bg-gray-100" onClick={() => draftPlayer(p.id)}>Draft</Button>
          )
        )}
      </div>
    </li>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h1 className="text-2xl md:text-3xl font-bold">Fantasy Draft Board</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setEditMode((v) => !v)} className="bg-white">{editMode ? "Exit Edit" : "Edit Mode"}</Button>
            <Button onClick={exportCSV} className="bg-white">Export CSV</Button>
            <Button onClick={exportJSON} className="bg-white">Export JSON</Button>
          </div>
        </div>

        {/* 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left: Overall Rankings */}
          <section className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">Overall Rankings</h2>
              <span className="text-xs text-gray-500">{available.length} available</span>
            </div>
            <ul className="space-y-2 max-h-[70vh] overflow-auto pr-1">
              {available.map((p, idx) => (
                <PlayerRow
                  key={p.id}
                  p={p}
                  overallIndex={idx}
                  posIndex={posRankMap[p.id]}
                  showDraftBtn={true}
                />
              ))}
              {available.length === 0 && (
                <li className="text-sm text-gray-500">All drafted 🎉</li>
              )}
            </ul>
          </section>

          {/* Middle: Quick by Position */}
          <section className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-bold">Top Picks by Position</h2>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex flex-wrap gap-1">
                {POS_LIST.map((t) => (
                  <Button
                    key={t}
                    className={`bg-white ${posTab === t ? "ring-2 ring-black" : ""}`}
                    onClick={() => setPosTab(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <Input
                placeholder="Search by name / team"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <ul className="space-y-2 max-h-[70vh] overflow-auto pr-1">
              {middleList.map((p) => {
                const overallIndex = available.findIndex((x) => x.id === p.id);
                return (
                  <PlayerRow
                    key={p.id}
                    p={p}
                    overallIndex={overallIndex}
                    posIndex={posRankMap[p.id]}
                    showDraftBtn={true}
                  />
                );
              })}
              {middleList.length === 0 && (
                <li className="text-sm text-gray-500">No matches</li>
              )}
            </ul>
          </section>

          {/* Right: Draft History */}
          <section className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">Draft History</h2>
              <div className="flex items-center gap-2">
                <Button className="bg-white" onClick={undoLast} disabled={history.length === 0}>
                  Undo
                </Button>
                <Button className="bg-white" onClick={resetDraft}>Reset</Button>
              </div>
            </div>
            <ol className="space-y-2 max-h-[70vh] overflow-auto pr-1">
              {history.length === 0 && (
                <li className="text-sm text-gray-500">No picks yet</li>
              )}
              {history.map((id, i) => {
                const p = players.find((x) => x.id === id);
                if (!p) return null;
                const overallIndex = byRank.findIndex((x) => x.id === id);
                const posIndex = (() => {
                  // recompute pos index at time of listing using byRank order
                  let count = 0;
                  for (const x of byRank) {
                    if (x.pos === p.pos) {
                      count++;
                      if (x.id === p.id) return count;
                    }
                  }
                })();
                return (
                  <li key={`${id}-${i}`} className="rounded-md border bg-gray-50 p-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-xs text-gray-500 tabular-nums">{overallIndex + 1}</span>
                      {tierPill(p.tier || 1)}
                      <span className="text-[11px] px-2 py-0.5 bg-gray-100 rounded-full">
                        {p.pos ? `${p.pos}${posIndex ?? ""}` : "POS"}
                      </span>
                      <span className="font-semibold">{p.name}</span>
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Import (only visible in Edit Mode) */}
            {editMode && (
              <div className="mt-6 border-t pt-4">
                <details>
                  <summary className="cursor-pointer font-semibold">Quick Import (one per line: “Name POS TEAM T#”)</summary>
                  <div className="space-y-2 mt-2">
                    <Textarea
                      rows={6}
                      placeholder={`Examples:\nPuka Nacua WR LAR T1\nBreece Hall RB NYJ T1\nSam LaPorta TE DET T2`}
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button className="bg-white" onClick={importReplace}>Replace List</Button>
                    </div>
                  </div>
                </details>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
