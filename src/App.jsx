import React, { useEffect, useMemo, useRef, useState } from "react";

/* =======================
   Storage / schema
======================= */
const STORAGE_KEY = "fantasy-draft-board-v3";
const DEFAULT_SETTINGS = {
  numTeams: 12,
  numRounds: 14,
  teamNames: Array.from({ length: 12 }, (_, i) => `Team ${i + 1}`),
};

// Quick seed — replace via Quick Import
const STARTERS = [
  "1, WR1, CIN, Ja'Marr Chase",
  "1, WR1, MIN, Justin Jefferson",
  "1, RB1, SF, Christian McCaffrey",
  "1, WR1, DAL, CeeDee Lamb",
  "1, RB1, ATL, Bijan Robinson",
  "1, RB1, NYJ, Breece Hall",
  "1, WR1, DET, Amon-Ra St. Brown",
  "1, WR1, MIA, Tyreek Hill",
  "1, WR1, NYJ, Garrett Wilson",
  "2, RB1, IND, Jonathan Taylor",
];

const POS_LIST = ["ALL", "RB", "WR", "QB", "TE", "K", "DST"];
const TIER_COLORS = {
  1: "bg-green-100 text-green-800",
  2: "bg-blue-100 text-blue-800",
  3: "bg-yellow-100 text-yellow-800",
  4: "bg-orange-100 text-orange-800",
  5: "bg-rose-100 text-rose-800",
};

// Board-only pill colors
const POS_BG = (pos) => {
  const p = (pos || "").toUpperCase();
  if (p === "WR") return "bg-blue-500 text-white";
  if (p === "RB") return "bg-green-500 text-white";
  if (p === "TE") return "bg-orange-500 text-white";
  if (p === "QB") return "bg-pink-600 text-white";
  if (p === "DST" || p === "DEF") return "bg-gray-400 text-white";
  return "bg-gray-300 text-gray-900";
};

const uid = () => Math.random().toString(36).slice(2, 9);

/* ---------- parsing: "Tier, POS#, Team, Name" OR fallback "Name POS TEAM T#" ---------- */
function parseImportLine(line) {
  const parts = line
    .split(/[,\|\t]/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length >= 4 && /^\d+$/.test(parts[0])) {
    const tier = Math.max(1, parseInt(parts[0], 10) || 1);
    const posToken = (parts[1] || "").toUpperCase();
    const posMatch = posToken.match(/[A-Z]+/);
    const pos = posMatch ? posMatch[0] : "";
    const team = (parts[2] || "").toUpperCase();
    const name = parts.slice(3).join(" ");
    return { tier, pos, team, name };
  }

  // Fallback: "Name POS TEAM T#"
  let name = line.trim();
  let pos = "";
  let team = "";
  let tier = 1;
  const t = line.match(/T(\d+)/i);
  if (t) tier = parseInt(t[1], 10) || 1;
  const pt = line.match(/(.+?)\s+(QB|RB|WR|TE|K|DST)\s+([A-Z]{2,3})/i);
  if (pt) {
    name = pt[1].trim();
    pos = pt[2].toUpperCase();
    team = pt[3].toUpperCase();
  }
  return { tier, pos, team, name };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("no saved state");
    const obj = JSON.parse(raw);
    if (Array.isArray(obj)) {
      // very old version: players[]
      return { players: obj, history: [], settings: DEFAULT_SETTINGS };
    }
    return {
      players: obj.players || [],
      history: obj.history || [],
      settings: { ...DEFAULT_SETTINGS, ...(obj.settings || {}) },
    };
  } catch {
    const players = STARTERS.map((line, i) => {
      const { tier, pos, team, name } = parseImportLine(line);
      return {
        id: uid(),
        name,
        pos,
        team,
        tier,
        drafted: false,
        rank: i,
      };
    });
    return { players, history: [], settings: DEFAULT_SETTINGS };
  }
}

/* =======================
   UI primitives (compact)
======================= */
const Button = ({ className = "", ...p }) => (
  <button
    {...p}
    className={`px-2.5 py-1.5 rounded-xl shadow text-xs hover:shadow-md active:scale-[0.99] ${
      p.disabled ? "opacity-50 cursor-not-allowed" : ""
    } ${className}`}
  />
);

const Input = ({ className = "", ...p }) => (
  <input
    {...p}
    className={`px-2.5 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring w-full ${className}`}
  />
);

const Textarea = ({ className = "", ...p }) => (
  <textarea
    {...p}
    className={`px-2.5 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring w-full ${className}`}
  />
);

/* =======================
   App
======================= */
export default function App() {
  const initial = loadState();
  const [players, setPlayers] = useState(initial.players);
  const [history, setHistory] = useState(initial.history);
  const [settings, setSettings] = useState(initial.settings);

  const [editMode, setEditMode] = useState(false);
  const [posTab, setPosTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [importText, setImportText] = useState("");

  // drag state for insertion line
  const dragFromRef = useRef(null);
  const [insertIndex, setInsertIndex] = useState(null);

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ players, history, settings })
      );
    } catch {}
  }, [players, history, settings]);

  /* ------- Derived lists ------- */
  const byRank = useMemo(
    () => [...players].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)),
    [players]
  );
  const available = useMemo(
    () => byRank.filter((p) => !p.drafted),
    [byRank]
  );

  // POS# within current available order
  const posRankMap = useMemo(() => {
    const counts = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
    const map = {};
    for (const p of available) {
      const pos = p.pos || "NA";
      if (counts[pos] !== undefined) {
        counts[pos] += 1;
        map[p.id] = counts[pos];
      }
    }
    return map;
  }, [available]);

  // tabs + search live in overall column
  const filteredAvailable = useMemo(() => {
    return available.filter((p) => {
      if (posTab !== "ALL" && (p.pos || "") !== posTab) return false;
      if (!search.trim()) return true;
      const hay = `${p.name} ${p.pos || ""} ${p.team || ""}`.toLowerCase();
      return hay.includes(search.toLowerCase());
    });
  }, [available, posTab, search]);

  /* ------- Actions ------- */
  function applyReorder(fromIndexInAvail, toIndexInAvail) {
    const orderedAvail = [...available];
    const [moved] = orderedAvail.splice(fromIndexInAvail, 1);
    orderedAvail.splice(toIndexInAvail, 0, moved);

    setPlayers((ps) => {
      const byId = Object.fromEntries(ps.map((x) => [x.id, x]));
      // Rebuild full order: interleave ordered undrafted with drafted in original relative positions
      const merged = [];
      let u = 0;
      for (let i = 0; i < byRank.length; i++) {
        const wasDrafted = byRank[i].drafted;
        if (wasDrafted) merged.push(byRank[i]);
        else merged.push(orderedAvail[u++]);
      }

      // Auto-tier: look at immediate neighbors in merged
      const newIndex = merged.findIndex((x) => x.id === moved.id);
      const left = merged[newIndex - 1];
      const right = merged[newIndex + 1];
      const lt = left ? (byId[left.id].tier || 1) : null;
      const rt = right ? (byId[right.id].tier || 1) : null;
      let newTier = byId[moved.id].tier || 1;
      if (lt != null && rt != null) newTier = Math.min(lt, rt);
      else if (lt != null) newTier = lt;
      else if (rt != null) newTier = rt;

      return merged.map((p, i) => {
        const base = { ...byId[p.id], rank: i };
        if (p.id === moved.id) base.tier = newTier;
        return base;
      });
    });
  }

  const draftPlayer = (id) => {
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, drafted: true } : p)));
    setHistory((h) => [...h, id]);
  };

  const undoLast = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const last = h[h.length - 1];
      setPlayers((ps) => ps.map((p) => (p.id === last ? { ...p, drafted: false } : p)));
      return h.slice(0, -1);
    });
    setInsertIndex(null);
  };

  const resetDraft = () => {
    if (!confirm("Reset the entire draft? This will undraft everyone and clear the board.")) return;
    setPlayers((ps) => ps.map((p) => ({ ...p, drafted: false })));
    setHistory([]);
    setInsertIndex(null);
  };

  const changeTier = (id, delta) =>
    setPlayers((ps) =>
      ps.map((p) => (p.id === id ? { ...p, tier: Math.max(1, (p.tier || 1) + delta) } : p))
    );

  /* ------- Drag handlers (with insertion line) ------- */
  const onItemDragStart = (overallIndex) => (e) => {
    if (!editMode) return;
    dragFromRef.current = overallIndex;
    setInsertIndex(overallIndex);
    e.dataTransfer.effectAllowed = "move";
  };

  const onItemDragOver = (overallIndex) => (e) => {
    if (!editMode) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const before = e.clientY - rect.top < rect.height / 2;
    setInsertIndex(before ? overallIndex : overallIndex + 1);
  };

  const onListDrop = (e) => {
    if (!editMode) return;
    e.preventDefault();
    const fromFiltered = dragFromRef.current;
    const toFiltered = insertIndex;
    setInsertIndex(null);
    dragFromRef.current = null;
    if (fromFiltered == null || toFiltered == null) return;

    // Translate filtered indexes to indexes in "available"
    const fromId = filteredAvailable[fromFiltered]?.id;
    const toAfterId =
      toFiltered >= filteredAvailable.length ? null : filteredAvailable[toFiltered]?.id;

    const fromIndexInAvail = available.findIndex((p) => p.id === fromId);
    let toIndexInAvail =
      toAfterId == null ? available.length : available.findIndex((p) => p.id === toAfterId);

    // If moving downwards, account for removal
    if (fromIndexInAvail < toIndexInAvail) toIndexInAvail -= 1;

    if (fromIndexInAvail >= 0 && toIndexInAvail >= 0) {
      applyReorder(fromIndexInAvail, toIndexInAvail);
    }
  };

  /* ------- Import / Export ------- */
  const importReplace = () => {
    const lines = importText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return;

    const next = lines.map((line, i) => {
      const { tier, pos, team, name } = parseImportLine(line);
      return {
        id: uid(),
        name,
        pos,
        team,
        tier: tier || 1,
        drafted: false,
        rank: i,
      };
    });

    setPlayers(next);
    setHistory([]);
    setImportText("");
    setEditMode(false);
  };

  const exportCSV = () => {
    const header = "rank,tier,pos,team,name,drafted\n";
    const rows = byRank
      .map(
        (p, i) =>
          `${i + 1},${p.tier || 1},${p.pos || ""},${p.team || ""},"${p.name.replace(
            /"/g,
            '""'
          )}",${p.drafted ? "yes" : "no"}`
      )
      .join("\n");
    downloadBlob(header + rows, "players.csv", "text/csv");
  };

  const exportJSON = () =>
    downloadBlob(
      JSON.stringify({ players, history, settings }, null, 2),
      "board.json",
      "application/json"
    );

  function downloadBlob(text, filename, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ------- Draft board (snake) ------- */
  const { numTeams, numRounds, teamNames } = settings;

  function pickToCoord(pickIndex) {
    const r = Math.floor(pickIndex / numTeams);
    const i = pickIndex % numTeams;
    const c = r % 2 === 0 ? i : numTeams - 1 - i;
    return { row: r, col: c };
  }

  const board = useMemo(() => {
    const grid = Array.from({ length: numRounds }, () =>
      Array.from({ length: numTeams }, () => null)
    );
    history.forEach((id, k) => {
      const { row, col } = pickToCoord(k);
      const p = players.find((x) => x.id === id);
      if (p && row < numRounds) grid[row][col] = p;
    });
    return grid;
  }, [history, players, numRounds, numTeams]);

  const [editNames, setEditNames] = useState(false);
  const setTeamName = (i, name) =>
    setSettings((s) => {
      const t = [...s.teamNames];
      t[i] = name;
      return { ...s, teamNames: t };
    });

  /* ------- Rendering helpers ------- */
  const tierPill = (tier) => (
    <span
      className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
        TIER_COLORS[tier] || "bg-gray-100 text-gray-700"
      }`}
    >
      Tier {tier || 1}
    </span>
  );

  // Compact overall-ranking row
  const PlayerRow = ({ p, overallIndex, posIndex }) => (
    <li
      key={p.id}
      className={`rounded-md border bg-white flex items-center justify-between gap-2 p-1.5 ${
        editMode ? "cursor-grab" : "cursor-pointer"
      }`}
      draggable={editMode}
      onDragStart={onItemDragStart(overallIndex)}
      onDragOver={onItemDragOver(overallIndex)}
      onClick={() => {
        if (!editMode) draftPlayer(p.id);
      }}
      title={editMode ? "Drag to reorder" : "Click to draft"}
    >
      <div className="flex items-center gap-2">
        <span className="w-5 text-[10px] text-gray-500 tabular-nums">
          {overallIndex + 1}
        </span>
        {tierPill(p.tier || 1)}
        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded-full">
          {p.pos ? `${p.pos}${posIndex ?? ""}` : "POS"}
        </span>
        <span className="font-semibold text-sm">{p.name}</span>
      </div>
      <div className="text-[11px] text-gray-600 font-medium">{p.team || ""}</div>
    </li>
  );

  // Build the overall list with insertion line
  const renderOverallList = () => {
    const items = [];
    for (let i = 0; i < filteredAvailable.length; i++) {
      if (insertIndex === i && editMode) {
        items.push(
          <div key={`line-${i}`} className="h-[3px] bg-gray-800 rounded my-0.5" />
        );
      }
      const p = filteredAvailable[i];
      const overallIndex = available.findIndex((x) => x.id === p.id);
      items.push(
        <PlayerRow
          key={p.id}
          p={p}
          overallIndex={overallIndex}
          posIndex={posRankMap[p.id]}
        />
      );
    }
    if (insertIndex === filteredAvailable.length && editMode) {
      items.push(<div key="line-end" className="h-[3px] bg-gray-800 rounded my-0.5" />);
    }
    return items;
  };

  /* =======================
     Render
  ======================= */
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-3 md:p-4">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Top bar (exports only now) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl md:text-3xl font-bold">Fantasy Draft Board</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={exportCSV} className="bg-white">Export CSV</Button>
            <Button onClick={exportJSON} className="bg-white">Export JSON</Button>
          </div>
        </div>

        {/* 25% / 75% layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Left: Overall Rankings (col-span-1 → 25%) */}
          <section className="bg-white rounded-2xl shadow p-3 md:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold">Overall Rankings</h2>
              <div className="flex items-center gap-2">
                <Button onClick={() => setEditMode((v) => !v)} className="bg-white">
                  {editMode ? "Done" : "Edit Order"}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
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
            <div className="mb-2">
              <Input
                placeholder="Search by name / team"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <ul
              className="space-y-1.5 max-h-[78vh] overflow-auto pr-1"
              onDragOver={(e) => editMode && e.preventDefault()}
              onDrop={onListDrop}
            >
              {renderOverallList()}
              {filteredAvailable.length === 0 && (
                <li className="text-xs text-gray-500">No players match.</li>
              )}
            </ul>

            {/* Quick Import (in Edit Mode) */}
            {editMode && (
              <div className="mt-4 border-t pt-3">
                <details>
                  <summary className="cursor-pointer font-semibold text-sm">
                    Quick Import (Tier, POS#, Team, Name)
                  </summary>
                  <div className="space-y-2 mt-2">
                    <Textarea
                      rows={6}
                      placeholder={`Examples:\n1, WR1, LAR, Puka Nacua\n1, RB1, NYJ, Breece Hall\n2, TE1, DET, Sam LaPorta`}
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button className="bg-white" onClick={importReplace}>
                        Replace List
                      </Button>
                    </div>
                  </div>
                </details>
              </div>
            )}
          </section>

          {/* Right: Draft Board (col-span-3 → 75%) */}
          <section className="bg-white rounded-2xl shadow p-3 md:col-span-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold">Draft Board</h2>
              <div className="flex items-center gap-2">
                <Button className="bg-white" onClick={() => setEditNames((v) => !v)}>
                  {editNames ? "Done names" : "Edit names"}
                </Button>
                <Button className="bg-white" onClick={undoLast} disabled={!history.length}>
                  Undo
                </Button>
                <Button className="bg-white" onClick={resetDraft}>Reset</Button>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="min-w-full text-xs border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 border w-10 text-center">Rnd</th>
                    {Array.from({ length: settings.numTeams }, (_, c) => (
                      <th key={c} className="p-2 border min-w-[110px]">
                        {editNames ? (
                          <input
                            className="w-full px-2 py-1 rounded border text-xs"
                            value={settings.teamNames[c] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSettings((s) => {
                                const t = [...s.teamNames];
                                t[c] = val;
                                return { ...s, teamNames: t };
                              });
                            }}
                          />
                        ) : (
                          <span className="font-semibold">{settings.teamNames[c]}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: settings.numRounds }, (_, r) => (
                    <tr key={r}>
                      <td className="p-1.5 border text-center text-gray-500 w-10">
                        {r + 1}
                      </td>
                      {Array.from({ length: settings.numTeams }, (_, c) => {
                        const p = board[r][c];
                        return (
                          <td key={c} className="p-1.5 border align-top">
                            {p ? (
                              <div
                                className={`px-2 py-1 rounded-md text-xs font-semibold ${POS_BG(
                                  p.pos
                                )}`}
                              >
                                {p.name}
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
