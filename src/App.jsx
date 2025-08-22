import React, { useEffect, useMemo, useRef, useState } from "react";

/* =======================
   Storage / schema
======================= */
const STORAGE_KEY = "fantasy-draft-board-v4";
const DARK_KEY = "fdb_dark";

const DEFAULT_SETTINGS = {
  numTeams: 12,
  numRounds: 14,
  teamNames: Array.from({ length: 12 }, (_, i) => `Team ${i + 1}`),
};

// Quick seed — replace via Import
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

/* Pastel board colors by position (also used on tabs) */
const POS_BG = (pos) => {
  const p = (pos || "").toUpperCase();
  if (p === "WR") return "bg-blue-300 text-gray-900";
  if (p === "RB") return "bg-green-300 text-gray-900";
  if (p === "TE") return "bg-orange-300 text-gray-900";
  if (p === "QB") return "bg-pink-300 text-gray-900";
  if (p === "DST" || p === "DEF") return "bg-gray-300 text-gray-900";
  return "bg-gray-300 text-gray-900";
};

/* Pastel tier colors — separate palette, looping after 5 */
const TIER_CLASSES = [
  "bg-emerald-200 text-emerald-900",
  "bg-sky-200 text-sky-900",
  "bg-amber-200 text-amber-900",
  "bg-orange-200 text-orange-900",
  "bg-rose-200 text-rose-900",
];
const tierClass = (tier = 1) => TIER_CLASSES[(Math.max(1, tier) - 1) % TIER_CLASSES.length];

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

const IconToggle = ({ on, onClick }) => (
  <button
    onClick={onClick}
    className={`px-2 py-1 rounded-full text-xs font-semibold ${
      on ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-900"
    }`}
    title="Toggle dark mode"
  >
    {on ? "Dark" : "Light"}
  </button>
);

const Input = ({ className = "", ...p }) => (
  <input
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
  const [editNames, setEditNames] = useState(false);
  const [posTab, setPosTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const fileInputRef = useRef(null);

  // drag state for insertion line
  const dragFromRef = useRef(null);
  const [insertIndex, setInsertIndex] = useState(null);

  // Dark mode
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem(DARK_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(DARK_KEY, dark ? "1" : "0");
    } catch {}
  }, [dark]);

  // persist board state
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

  /* ------- Drag handlers (fluid click+drag) ------- */
  const onItemMouseDown = (overallIndex) => (e) => {
    if (!editMode) return;
    // nothing special; HTML5 drag will start as soon as mouse moves
  };
  const onItemDragStart = (overallIndex) => (e) => {
    if (!editMode) return;
    dragFromRef.current = overallIndex;
    setInsertIndex(overallIndex);
    // help some browsers start the drag right away
    e.dataTransfer.setData("text/plain", String(overallIndex));
    e.dataTransfer.effectAllowed = "move";
  };
  const onItemDragEnd = () => setInsertIndex(null);

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

  /* ------- Import (modal) ------- */
  const openFile = () => fileInputRef.current?.click();

  function parseCSV(text) {
    // Very lightweight CSV (no quoted commas). Headers map fields.
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
    if (!lines.length) return [];
    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().toLowerCase());
    const h = (nameArr) => {
      for (const n of nameArr) {
        const i = headers.indexOf(n);
        if (i !== -1) return i;
      }
      return -1;
    };
    const idxTier = h(["tier"]);
    const idxPos = h(["pos", "position"]);
    const idxTeam = h(["team"]);
    const idxName = h(["name", "player", "player name"]);

    const out = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map((s) => s.trim());
      const tier = idxTier >= 0 ? parseInt(parts[idxTier] || "1", 10) || 1 : 1;
      const posToken = idxPos >= 0 ? (parts[idxPos] || "").toUpperCase() : "";
      const posMatch = posToken.match(/[A-Z]+/);
      const pos = posMatch ? posMatch[0] : "";
      const team = idxTeam >= 0 ? (parts[idxTeam] || "").toUpperCase() : "";
      const name = idxName >= 0 ? parts[idxName] || "" : lines[i];
      out.push({ tier, pos, team, name });
    }
    return out;
  }

  const importFromText = () => {
    const lines = importText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return;
    const next = lines.map((line, i) => {
      const { tier, pos, team, name } = parseImportLine(line);
      return { id: uid(), name, pos, team, tier: tier || 1, drafted: false, rank: i };
    });
    setPlayers(next);
    setHistory([]);
    setImportText("");
    setImportOpen(false);
    setEditMode(false);
  };

  const onCSVChosen = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const rows = parseCSV(text);
      if (!rows.length) return;
      const next = rows.map((r, i) => ({
        id: uid(),
        name: r.name,
        pos: r.pos,
        team: r.team,
        tier: r.tier || 1,
        drafted: false,
        rank: i,
      }));
      setPlayers(next);
      setHistory([]);
      setImportOpen(false);
      setEditMode(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

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

  const setTeamName = (i, name) =>
    setSettings((s) => {
      const t = [...s.teamNames];
      t[i] = name;
      return { ...s, teamNames: t };
    });

  /* ------- Rendering helpers ------- */
  const TierPill = ({ tier }) => (
    <span
      className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${tierClass(
        tier
      )}`}
    >
      Tier {tier || 1}
    </span>
  );

  // Compact overall-ranking row
  const PlayerRow = ({ p, overallIndex, posIndex }) => (
    <li
      key={p.id}
      className={`rounded-md border ${
        dark ? "border-zinc-700 bg-zinc-800" : "border-gray-300 bg-white"
      } flex items-center justify-between gap-2 p-1.5 ${
        editMode ? "cursor-grab" : "cursor-pointer"
      } select-none`}
      draggable={editMode}
      onMouseDown={onItemMouseDown(overallIndex)}
      onDragStart={onItemDragStart(overallIndex)}
      onDragEnd={onItemDragEnd}
      onDragOver={onItemDragOver(overallIndex)}
      onClick={() => {
        if (!editMode) draftPlayer(p.id);
      }}
      title={editMode ? "Drag to reorder" : "Click to draft"}
    >
      <div className="flex items-center gap-2">
        <span className="w-5 text-[10px] opacity-70 tabular-nums">
          {overallIndex + 1}
        </span>
        <TierPill tier={p.tier || 1} />
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-900">
          {p.pos ? `${p.pos}${posIndex ?? ""}` : "POS"}
        </span>
        <span className="font-semibold text-[13px]">{p.name}</span>
      </div>
      <div className="text-[11px] font-medium text-black opacity-70">{p.team || ""}</div>
    </li>
  );

  // Build the overall list with insertion line
  const renderOverallList = () => {
    const items = [];
    for (let i = 0; i < filteredAvailable.length; i++) {
      if (insertIndex === i && editMode) {
        items.push(
          <div key={`line-${i}`} className={`h-[3px] ${dark ? "bg-zinc-200" : "bg-gray-800"} rounded my-0.5`} />
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
      items.push(<div key="line-end" className={`h-[3px] ${dark ? "bg-zinc-200" : "bg-gray-800"} rounded my-0.5`} />);
    }
    return items;
  };

  /* =======================
     Render
  ======================= */
  return (
    <div className={`${dark ? "bg-zinc-900 text-zinc-100" : "bg-gray-50 text-gray-900"} min-h-screen w-full`}>
      <div className="w-full px-3 md:px-4 py-3 space-y-3">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold">Fantasy Draft Board</h1>
            <IconToggle on={dark} onClick={() => setDark((v) => !v)} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setEditMode((v) => !v)} className={`${editMode ? "bg-blue-500 text-white" : "bg-orange-300 text-gray-900"}`}>
              {editMode ? "Done" : "Edit Order"}
            </Button>
            {editMode && (
              <Button onClick={() => setImportOpen(true)} className="bg-orange-300 text-gray-900">
                Import
              </Button>
            )}
          </div>
        </div>

        {/* 33% / 67% layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Left: Overall Rankings (col 1/3) */}
          <section className={`${dark ? "bg-zinc-800" : "bg-white"} rounded-2xl shadow p-3 md:col-span-1`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold">Overall Rankings</h2>
              <span className="text-xs opacity-70">{available.length} available</span>
            </div>

            {/* colored tabs */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {POS_LIST.map((t) => {
                const pastel =
                  t === "ALL"
                    ? "bg-gray-200"
                    : POS_BG(t).replace("text-gray-900", "");
                const active = posTab === t ? "ring-2 ring-black" : "";
                return (
                  <Button
                    key={t}
                    className={`text-xs ${pastel} ${active}`}
                    onClick={() => setPosTab(t)}
                  >
                    {t}
                  </Button>
                );
              })}
            </div>
            <div className="mb-2">
              <Input
                placeholder="Search by name / team"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <ul
              className="space-y-1.5 max-h-[80vh] overflow-auto pr-1"
              onDragOver={(e) => editMode && e.preventDefault()}
              onDrop={onListDrop}
            >
              {renderOverallList()}
              {filteredAvailable.length === 0 && (
                <li className="text-xs opacity-70">No players match.</li>
              )}
            </ul>
          </section>

          {/* Right: Draft Board (col 2/3) */}
          <section className={`${dark ? "bg-zinc-800" : "bg-white"} rounded-2xl shadow p-3 md:col-span-2`}>
            <div className="flex items-center justify-between mb-2">
              {/* Left side: title + Reset */}
              <div className="flex items-center gap-2">
                <h2 className="font-bold">Draft Board</h2>
                <Button className="bg-orange-300 text-gray-900" onClick={resetDraft}>
                  Reset
                </Button>
              </div>
              {/* Right side: names editing + undo */}
              <div className="flex items-center gap-2">
                <Button
                  className={`${editNames ? "bg-blue-500 text-white" : "bg-orange-300 text-gray-900"}`}
                  onClick={() => setEditNames((v) => !v)}
                >
                  {editNames ? "Done" : "Edit Team Names"}
                </Button>
                <Button className="bg-teal-300 text-gray-900" onClick={undoLast} disabled={!history.length}>
                  Undo
                </Button>
              </div>
            </div>

            {/* Grid board (no Rnd column) */}
            <div className="overflow-auto">
              {/* Team name header */}
              <div
                className="grid gap-[1px] mb-1"
                style={{ gridTemplateColumns: `repeat(${settings.numTeams}, minmax(120px, 1fr))` }}
              >
                {Array.from({ length: settings.numTeams }, (_, c) => (
                  <div key={c} className={`${dark ? "bg-zinc-700" : "bg-gray-200"} p-2 rounded-md`}>
                    {editNames ? (
                      <input
                        className={`w-full px-2 py-1 rounded border text-sm ${dark ? "bg-zinc-800 border-zinc-600 text-white" : ""}`}
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
                      <span className="font-semibold text-black">{settings.teamNames[c]}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {Array.from({ length: settings.numRounds }, (_, r) => (
                <div
                  key={r}
                  className="grid gap-2 mb-2"
                  style={{ gridTemplateColumns: `repeat(${settings.numTeams}, minmax(120px, 1fr))` }}
                >
                  {Array.from({ length: settings.numTeams }, (_, c) => {
                    const p = board[r][c];
                    return (
                      <div
                        key={c}
                        className={`${dark ? "bg-zinc-900 border-zinc-700" : "bg-gray-50 border-gray-200"} border rounded-lg p-2 min-h-[36px]`}
                      >
                        {p ? (
                          <div className={`px-2 py-1 rounded-md text-xs font-semibold ${POS_BG(p.pos)} truncate`}>
                            {p.name}
                          </div>
                        ) : (
                          <div className="text-gray-300 text-xs">—</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Import Modal */}
      {importOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setImportOpen(false)}>
          <div
            className={`${dark ? "bg-zinc-800 text-zinc-100" : "bg-white"} w-full max-w-2xl rounded-2xl shadow p-4`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Import Players</h3>
              <Button className="bg-blue-500 text-white" onClick={() => setImportOpen(false)}>Done</Button>
            </div>
            <p className="text-xs opacity-70 mb-2">
              Paste free text (format: <code>Tier, POS#, Team, Name</code>) or upload a CSV with headers
              like <code>tier</code>, <code>pos</code>, <code>team</code>, <code>name</code> (any order).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <textarea
                  rows={8}
                  className={`w-full rounded-lg border px-2 py-1.5 text-sm ${dark ? "bg-zinc-900 border-zinc-700" : ""}`}
                  placeholder={`Examples:\n1, WR1, LAR, Puka Nacua\n1, RB1, NYJ, Breece Hall\n2, TE1, DET, Sam LaPorta`}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                />
                <div className="mt-2">
                  <Button className="bg-orange-300 text-gray-900" onClick={importFromText}>
                    Import from Text
                  </Button>
                </div>
              </div>
              <div className={`${dark ? "bg-zinc-900" : "bg-gray-50"} rounded-lg p-3`}>
                <p className="text-xs mb-2">Upload CSV</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={onCSVChosen}
                />
                <Button className="bg-orange-300 text-gray-900" onClick={openFile}>
                  Choose CSV…
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
