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

const uid = () => Math.random().toString(36).slice(2, 9);

function parseImportLine(line) {
  // New format: Tier, POS#, Team, Name (commas/pipes/tabs)
  // Example: 1, WR1, CIN, Ja'Marr Chase
  const parts = line.split(/[,\|\t]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 4 && /^\d+$/.test(parts[0])) {
    const tier = Math.max(1, parseInt(parts[0], 10) || 1);
    const posToken = parts[1].toUpperCase();
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
    if (!raw) throw new Error("no state");
    const obj = JSON.parse(raw);
    // v2 compat where we saved just players[]
    if (Array.isArray(obj)) {
      return {
        players: obj,
        history: [],
        settings: DEFAULT_SETTINGS,
      };
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
   UI primitives
======================= */
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

  // drag indicator state
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

  // POS# (within available list)
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

  // Filter/tabs/search live in the overall list now
  const filteredAvailable = useMemo(() => {
    return available.filter((p) => {
      if (posTab !== "ALL" && (p.pos || "") !== posTab) return false;
      if (!search.trim()) return true;
      const hay = `${p.name} ${p.pos || ""} ${p.team || ""}`.toLowerCase();
      return hay.includes(search.toLowerCase());
    });
  }, [available, posTab, search]);

  /* ------- Actions ------- */
  function applyReorder(from, to) {
    const ordered = [...available]; // only the undrafted list is shown/dragged
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);

    setPlayers((ps) => {
      const byId = Object.fromEntries(ps.map((x) => [x.id, x]));
      // Build a full ordered list: ordered (undrafted) + drafted (at their same ranks)
      const drafted = byRank.filter((p) => p.drafted);
      // Merge back in their relative ranks
      const merged = [];
      let u = 0;
      for (let i = 0; i < byRank.length; i++) {
        const isDrafted = byRank[i].drafted;
        if (isDrafted) merged.push(byRank[i]);
        else merged.push(ordered[u++]);
      }

      // Auto-tier adjustment for the moved player
      const newIndex = merged.findIndex((x) => x.id === moved.id);
      const left = merged[newIndex - 1];
      const right = merged[newIndex + 1];
      let newTier = byId[moved.id].tier || 1;
      const lt = left ? (byId[left.id].tier || 1) : null;
      const rt = right ? (byId[right.id].tier || 1) : null;
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

  const onItemDragOver = (index) => (e) => {
    if (!editMode) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const before = e.clientY - rect.top < rect.height / 2;
    setInsertIndex(before ? index : index + 1);
  };

  const onListDrop = (e) => {
    if (!editMode) return;
    e.preventDefault();
    const from = dragFromRef.current;
    const to = insertIndex;
    setInsertIndex(null);
    dragFromRef.current = null;
    if (from == null || to == null) return;

    // translate "from" (index within filteredAvailable) to its index in available
    const fromId = filteredAvailable[from]?.id;
    const toAfterId =
      to >= filteredAvailable.length ? null : filteredAvailable[to]?.id;

    const fromIndexInAvail = available.findIndex((p) => p.id === fromId);
    let toIndexInAvail =
      toAfterId == null
        ? available.length
        : available.findIndex((p) => p.id === toAfterId);

    // reorder within available
    let adjustedTo = toIndexInAvail;
    if (fromIndexInAvail < toIndexInAvail) adjustedTo -= 1;

    if (fromIndexInAvail >= 0 && adjustedTo >= 0) {
      applyReorder(fromIndexInAvail, adjustedTo);
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

  // materialize board cells from history
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
  }, [history, players, numTeams, numRounds]);

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
      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
        TIER_COLORS[tier] || "bg-gray-100 text-gray-700"
      }`}
    >
      Tier {tier || 1}
    </span>
  );

  const PlayerRow = ({ p, overallIndex, posIndex }) => (
    <li
      key={p.id}
      className={`rounded-md border bg-white flex items-center justify-between gap-2 p-2 ${
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
        <span className="w-6 text-xs text-gray-500 tabular-nums">
          {overallIndex + 1}
        </span>
        {tierPill(p.tier || 1)}
        <span className="text-[11px] px-2 py-0.5 bg-gray-100 rounded-full">
          {p.pos ? `${p.pos}${posIndex ?? ""}` : "POS"}
        </span>
        <span className="font-semibold">{p.name}</span>
      </div>
      <div className="text-xs text-gray-600 font-medium">{p.team || ""}</div>
    </li>
  );

  // build the overall list with insertion line
  const renderOverallList = () => {
    const items = [];
    for (let i = 0; i < filteredAvailable.length; i++) {
      if (insertIndex === i && editMode) {
        items.push(
          <div key={`line-${i}`} className="h-1 bg-gray-800 rounded my-1" />
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
      items.push(
        <div key={`line-end`} className="h-1 bg-gray-800 rounded my-1" />
      );
    }
    return items;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl md:text-3xl font-bold">Fantasy Draft Board</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setEditMode((v) => !v)} className="bg-white">
              {editMode ? "Exit Edit" : "Edit Mode"}
            </Button>
            <Button onClick={exportCSV} className="bg-white">
              Export CSV
            </Button>
            <Button onClick={exportJSON} className="bg-white">
              Export JSON
            </Button>
          </div>
        </div>

        {/* Two columns: Overall + Draft Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Overall Rankings with tabs + search */}
          <section className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">Overall Rankings</h2>
              <span className="text-xs text-gray-500">
                {available.length} available
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="flex flex-wrap
