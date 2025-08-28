import React, { useEffect, useMemo, useRef, useState } from "react";

/* =====================================================
   Local storage keys & defaults
===================================================== */
const STORAGE_KEY = "fantasy-draft-board-v10";
const DARK_KEY = "fdb_dark";

const DEFAULT_SETTINGS = {
  numTeams: 12,
  numRounds: 14,
  teamNames: Array.from({ length: 12 }, (_, i) => `Team ${i + 1}`),
  myTeam: null, // 0-based index or null
};

// A tiny starter list so the app renders first time.
// Replace via Import (Text or CSV).
const STARTERS = [
  "1, WR, CIN, Ja'Marr Chase",
  "1, WR, MIN, Justin Jefferson",
  "1, RB, SF, Christian McCaffrey",
  "1, WR, DAL, CeeDee Lamb",
  "1, RB, ATL, Bijan Robinson",
  "1, RB, NYJ, Breece Hall",
  "1, WR, DET, Amon-Ra St. Brown",
  "1, WR, MIA, Tyreek Hill",
  "1, WR, NYJ, Garrett Wilson",
  "2, RB, IND, Jonathan Taylor",
];

const POS_LIST = ["ALL", "RB", "WR", "QB", "TE", "K", "DST"];

/* Position color helpers (pastel) */
const POS_BG = (pos) => {
  const p = (pos || "").toUpperCase();
  if (p === "WR") return "bg-blue-300 text-black";
  if (p === "RB") return "bg-green-300 text-black";
  if (p === "TE") return "bg-orange-300 text-black";
  if (p === "QB") return "bg-pink-300 text-black";
  if (p === "DST" || p === "DEF") return "bg-gray-300 text-black";
  return "bg-gray-300 text-black";
};

const uid = () => Math.random().toString(36).slice(2, 9);
const norm = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/* =====================================================
   Import parsing helpers
===================================================== */
function parseImportLine(line) {
  // Accept: "Tier, POS, Team, Name"
  const parts = line.split(/[,\|\t]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 4 && /^\d+$/.test(parts[0])) {
    const tier = Math.max(1, parseInt(parts[0], 10) || 1);
    const posToken = (parts[1] || "").toUpperCase();
    const posMatch = posToken.match(/[A-Z]+/);
    const pos = posMatch ? posMatch[0] : "";
    const team = (parts[2] || "").toUpperCase();
    const name = parts.slice(3).join(" ");
    return { tier, pos, team, name };
  }
  // Fallback: "Name POS TEAM"
  let name = line.trim(),
    pos = "",
    team = "",
    tier = 1;
  const pt = line.match(/(.+?)\s+(QB|RB|WR|TE|K|DST)\s+([A-Z]{2,3})/i);
  if (pt) {
    name = pt[1].trim();
    pos = pt[2].toUpperCase();
    team = pt[3].toUpperCase();
  }
  return { tier, pos, team, name };
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const getIdx = (...names) =>
    names.map((n) => headers.indexOf(n)).find((i) => i >= 0) ?? -1;
  const idxTier = getIdx("tier");
  const idxPos = getIdx("pos", "position");
  const idxTeam = getIdx("team");
  const idxName = getIdx("name", "player", "player name");
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

function parseADPCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return {};
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idxName =
    headers.indexOf("name") !== -1
      ? headers.indexOf("name")
      : headers.indexOf("player") !== -1
      ? headers.indexOf("player")
      : headers.indexOf("player name");
  const idxAdp = headers.indexOf("adp");
  const idxSource = headers.indexOf("source");
  const out = {};
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((s) => s.trim());
    const name = parts[idxName] || "";
    const source = (parts[idxSource] || "").toLowerCase();
    const val = parseFloat(parts[idxAdp]);
    if (!name || !isFinite(val)) continue;
    const k = norm(name);
    out[k] = out[k] || {};
    if (source.includes("yahoo")) out[k].yahoo = val;
    if (source.includes("fantasypros") || source.includes("fp"))
      out[k].fantasypros = val;
  }
  return out;
}

function parseStatsCSV(text) {
  const H = (s) => s.replace(/\s+/g, "").toLowerCase();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return {};
  const headers = lines[0].split(",").map((h) => H(h));
  const idx = (names) =>
    names.map((n) => headers.indexOf(H(n))).find((i) => i >= 0) ?? -1;

  const idxName = idx(["name", "player", "playername"]);
  const idxYear = idx(["year", "season"]);
  const idxTargets = idx(["targets", "tgt"]);
  const idxRec = idx(["receptions", "rec"]);
  const idxRecYds = idx(["recyds", "receivingyards", "rec_yards"]);
  const idxRecTd = idx(["rectd", "receivingtd", "receivingtds", "rec_tds"]);
  const idxRushAtt = idx(["rushatt", "rushingattempts", "rush_attempts"]);
  const idxRushYds = idx(["rushyds", "rushingyards", "rush_yards"]);
  const idxRushTd = idx(["rushtd", "rushingtd", "rushingtds", "rush_tds"]);
  const idxPassAtt = idx(["passatt", "attempts", "passingattempts"]);
  const idxPassYds = idx(["passyds", "passingyards", "pass_yards"]);
  const idxPassTd = idx(["passtd", "passingtd", "passingtds", "pass_tds"]);

  const out = {};

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((s) => s.trim());
    const name = parts[idxName] || "";
    const year = parts[idxYear] || "";
    if (!name || !year) continue;
    const k = norm(name);
    const y = String(parseInt(year, 10));
    const row = {
      targets: idxTargets >= 0 ? +parts[idxTargets] || 0 : undefined,
      receptions: idxRec >= 0 ? +parts[idxRec] || 0 : undefined,
      rec_yds: idxRecYds >= 0 ? +parts[idxRecYds] || 0 : undefined,
      rec_td: idxRecTd >= 0 ? +parts[idxRecTd] || 0 : undefined,
      rush_att: idxRushAtt >= 0 ? +parts[idxRushAtt] || 0 : undefined,
      rush_yds: idxRushYds >= 0 ? +parts[idxRushYds] || 0 : undefined,
      rush_td: idxRushTd >= 0 ? +parts[idxRushTd] || 0 : undefined,
      pass_att: idxPassAtt >= 0 ? +parts[idxPassAtt] || 0 : undefined,
      pass_yds: idxPassYds >= 0 ? +parts[idxPassYds] || 0 : undefined,
      pass_td: idxPassTd >= 0 ? +parts[idxPassTd] || 0 : undefined,
    };
    out[k] = out[k] || {};
    out[k][y] = row;
  }
  return out;
}

/* =====================================================
   Load initial state
===================================================== */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("no saved state");
    const obj = JSON.parse(raw);
    if (Array.isArray(obj))
      return {
        players: obj,
        history: [],
        settings: DEFAULT_SETTINGS,
        adp: {},
        stats: {},
      };
    return {
      players: obj.players || [],
      history: obj.history || [],
      settings: { ...DEFAULT_SETTINGS, ...(obj.settings || {}) },
      adp: obj.adp || {},
      stats: obj.stats || {},
    };
  } catch {
    const players = STARTERS.map((line, i) => {
      const { tier, pos, team, name } = parseImportLine(line);
      return { id: uid(), name, pos, team, tier, drafted: false, rank: i };
    });
    return {
      players,
      history: [],
      settings: DEFAULT_SETTINGS,
      adp: {},
      stats: {},
    };
  }
}

/* =====================================================
   Small UI atoms
===================================================== */
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
      on ? "bg-slate-800 text-white" : "bg-slate-300 text-slate-900"
    }`}
    title="Toggle dark mode"
  >
    {on ? "Dark" : "Light"}
  </button>
);

const Input = ({ className = "", ...p }) => (
  <input
    {...p}
    className={`px-2.5 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring w-full ${className}`}
  />
);

/* =====================================================
   App
===================================================== */
export default function App() {
  const initial = loadState();
  const [players, setPlayers] = useState(initial.players);
  const [history, setHistory] = useState(initial.history);
  const [settings, setSettings] = useState(initial.settings);
  const [adp, setAdp] = useState(initial.adp);
  const [stats, setStats] = useState(initial.stats);

  const [editMode, setEditMode] = useState(false);
  const [editNames, setEditNames] = useState(false);
  const [posTab, setPosTab] = useState("ALL");
  const [search, setSearch] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const fileInputRef = useRef(null);
  const adpFileRef = useRef(null);
  const statsFileRef = useRef(null);

  // manual drag state
  const itemRefs = useRef(new Map());
  const rectsRef = useRef([]);
  const [drag, setDrag] = useState(null);
  const [insertIndex, setInsertIndex] = useState(null);

  // Player details
  const [selectedId, setSelectedId] = useState(null);

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

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ players, history, settings, adp, stats })
      );
    } catch {}
  }, [players, history, settings, adp, stats]);

  /* ---------- Derived lists ---------- */
  const byRank = useMemo(
    () => [...players].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)),
    [players]
  );
  const available = useMemo(() => byRank.filter((p) => !p.drafted), [byRank]);

  // Dynamic POS 1/2/3… based on CURRENT available order
  const posRankMap = useMemo(() => {
    const counts = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 },
      map = {};
    for (const p of available) {
      const pos = p.pos || "NA";
      if (counts[pos] !== undefined) {
        counts[pos]++;
        map[p.id] = counts[pos];
      }
    }
    return map;
  }, [available]);

  // Filter + live-sort for search
  const filteredAvailable = useMemo(() => {
    const base = available.filter((p) => {
      if (posTab !== "ALL" && (p.pos || "") !== posTab) return false;
      if (!search.trim()) return true;
      const hay = `${p.name} ${p.pos || ""} ${p.team || ""}`.toLowerCase();
      return hay.includes(search.toLowerCase());
    });

    if (!search.trim()) return base;

    const q = search.trim().toLowerCase();
    return [...base].sort((a, b) => {
      const an = a.name.toLowerCase(),
        bn = b.name.toLowerCase();
      const aStarts = an.startsWith(q),
        bStarts = bn.startsWith(q);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      const aHas = an.includes(q),
        bHas = bn.includes(q);
      if (aHas !== bHas) return aHas ? -1 : 1;
      return an.localeCompare(bn);
    });
  }, [available, posTab, search]);

  /* ---------- Reorder logic ---------- */
  function applyReorder(fromIndexInAvail, toIndexInAvail) {
    const orderedAvail = [...available];
    const [moved] = orderedAvail.splice(fromIndexInAvail, 1);
    orderedAvail.splice(toIndexInAvail, 0, moved);

    setPlayers((ps) => {
      const byId = Object.fromEntries(ps.map((x) => [x.id, x]));
      const merged = [];
      let u = 0;
      for (let i = 0; i < byRank.length; i++) {
        const wasDrafted = byRank[i].drafted;
        merged.push(wasDrafted ? byRank[i] : orderedAvail[u++]);
      }
      // Ranks update when you reorder; drafting does not change rank
      return merged.map((p, i) => ({ ...byId[p.id], rank: i }));
    });
  }

  /* ---------- Draft actions ---------- */
  const draftPlayer = (id) => {
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, drafted: true } : p)));
    setHistory((h) => [...h, id]);
    // If you drafted from a filtered search, clear search to return to full list
    if (search.trim()) setSearch("");
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
    if (!confirm("Reset the entire draft?")) return;
    setPlayers((ps) => ps.map((p) => ({ ...p, drafted: false })));
    setHistory([]);
    setInsertIndex(null);
  };

  /* ---------- Manual drag & drop (pointer events) ---------- */
  function measureRects() {
    const arr = [];
    for (let i = 0; i < filteredAvailable.length; i++) {
      const id = filteredAvailable[i].id;
      const el = itemRefs.current.get(id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      arr.push({ id, idx: i, mid: (r.top + r.bottom) / 2 });
    }
    rectsRef.current = arr;
  }

  function startDrag(e, id, fromFiltered) {
    if (!editMode) return;
    const el = itemRefs.current.get(id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    measureRects();

    setDrag({
      id,
      fromFiltered,
      x: e.clientX,
      y: e.clientY,
      offX: e.clientX - r.left,
      offY: e.clientY - r.top,
      w: r.width,
    });
    setInsertIndex(fromFiltered);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
    document.body.classList.add("select-none");
  }

  function onPointerMove(e) {
    setDrag((d) => {
      if (!d) return d;
      const y = e.clientY;
      measureRects();
      let idx = rectsRef.current.findIndex((x) => y < x.mid);
      if (idx === -1) idx = rectsRef.current.length;
      setInsertIndex(idx);
      return { ...d, x: e.clientX, y };
    });
  }

  function onPointerUp() {
    const d = drag;
    setDrag(null);
    document.body.classList.remove("select-none");

    if (!d) return;
    const toFiltered = insertIndex ?? d.fromFiltered;
    setInsertIndex(null);

    const fromId = filteredAvailable[d.fromFiltered]?.id;
    const toAfterId =
      toFiltered >= filteredAvailable.length ? null : filteredAvailable[toFiltered]?.id;

    const fromIndexInAvail = available.findIndex((p) => p.id === fromId);
    let toIndexInAvail =
      toAfterId == null ? available.length : available.findIndex((p) => p.id === toAfterId);

    if (fromIndexInAvail < toIndexInAvail) toIndexInAvail -= 1;

    if (fromIndexInAvail >= 0 && toIndexInAvail >= 0) {
      applyReorder(fromIndexInAvail, toIndexInAvail);
    }

    window.removeEventListener("pointermove", onPointerMove);
  }

  /* ---------- Import handlers ---------- */
  const openFile = () => fileInputRef.current?.click();
  const openAdp = () => adpFileRef.current?.click();
  const openStats = () => statsFileRef.current?.click();

  const importFromText = () => {
    const lines = importText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
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
      fileInputRef.current && (fileInputRef.current.value = "");
    };
    reader.readAsText(file);
  };

  const onADPChosen = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const map = parseADPCSV(text);
      if (!Object.keys(map).length) return;
      setAdp((cur) => ({ ...cur, ...map }));
      alert("ADP data imported.");
      adpFileRef.current && (adpFileRef.current.value = "");
    };
    reader.readAsText(file);
  };

  const onStatsChosen = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const map = parseStatsCSV(text);
      if (!Object.keys(map).length) return;
      setStats((cur) => {
        const out = { ...cur };
        for (const k of Object.keys(map)) {
          out[k] = { ...(out[k] || {}), ...map[k] };
        }
        return out;
      });
      alert("Stats imported.");
      statsFileRef.current && (statsFileRef.current.value = "");
    };
    reader.readAsText(file);
  };

  /* ---------- Row component ---------- */
  const PlayerRow = ({ p, posIndex }) => {
    const beingDragged = drag?.id === p.id;
    return (
      <li
        key={p.id}
        data-id={p.id}
        ref={(el) =>
          el ? itemRefs.current.set(p.id, el) : itemRefs.current.delete(p.id)
        }
        className={`rounded-md border ${
          dark ? "border-zinc-600 bg-zinc-700" : "border-gray-300 bg-white"
        } flex items-center justify-between gap-2 p-1.5 ${
          editMode ? "cursor-grab" : "cursor-default"
        } select-none ${beingDragged ? "opacity-40" : ""}`}
        onPointerDown={(e) => {
          if (!editMode) return;
          const idx = filteredAvailable.findIndex((x) => x.id === p.id);
          if (idx >= 0) startDrag(e, p.id, idx);
        }}
        title={
          editMode ? "Drag to reorder" : "Click Draft to draft; click name for details"
        }
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Stable rank number (updates only when YOU reorder) */}
          <span className="w-6 text-[10px] opacity-70 tabular-nums">
            {(p.rank ?? 0) + 1}
          </span>

          {/* Colored POS bubble */}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${POS_BG(p.pos)}`}>
            {p.pos ? `${p.pos}${posIndex ?? ""}` : "POS"}
          </span>

          {/* Name + team */}
          {!editMode ? (
            <>
              <button
                className="font-semibold text-[12px] hover:underline truncate"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(p.id);
                }}
                title="Show details"
              >
                {p.name}
              </button>
              <span className="text-[11px] opacity-70 shrink-0">
                {p.team || ""}
              </span>
            </>
          ) : (
            <>
              <span className="font-semibold text-[12px] truncate">{p.name}</span>
              <span className="text-[11px] opacity-70 shrink-0">{p.team || ""}</span>
            </>
          )}
        </div>

        {/* Draft button only when not editing */}
        {!editMode && (
          <div className="shrink-0">
            <Button
              className="bg-blue-900 text-white"
              onClick={(e) => {
                e.stopPropagation();
                draftPlayer(p.id);
              }}
            >
              Draft
            </Button>
          </div>
        )}
      </li>
    );
  };

  const draggingPlayer = drag ? players.find((p) => p.id === drag.id) : null;

  /* ---------- Render ---------- */
  return (
    <div
      className={`${
        dark ? "bg-zinc-800 text-zinc-100" : "bg-gray-50 text-gray-900"
      } min-h-screen w-full`}
    >
      <div className="w-full px-3 md:px-4 py-3 space-y-3">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold">Fantasy Draft Board</h1>
            <IconToggle on={dark} onClick={() => setDark((v) => !v)} />
          </div>
          <div className="flex flex-wrap items-center gap-2" />
        </div>

        {/* Layout: rankings (2/10) + board (8/10) */}
        <div className="grid grid-cols-1 md:grid-cols-10 gap-3">
          {/* Overall Rankings */}
          <section
            className={`${
              dark ? "bg-zinc-700" : "bg-white"
            } rounded-2xl shadow p-3 md:col-span-2`}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold">Overall Rankings</h2>
              <div className="flex items-center gap-2">
                {!editMode ? (
                  <Button
                    onClick={() => setEditMode(true)}
                    className="bg-orange-300 text-black"
                  >
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => setImportOpen(true)}
                      className="bg-orange-300 text-black"
                    >
                      Import
                    </Button>
                    <Button
                      onClick={() => setEditMode(false)}
                      className="bg-blue-500 text-white"
                    >
                      Done
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {POS_LIST.map((t) => {
                const pastel = t === "ALL" ? "bg-gray-200 text-black" : POS_BG(t);
                const active = posTab === t ? "ring-2 ring-black" : "";
                return (
                  <Button
                    key={t}
                    className={`text-xs ${pastel} ${active}`}
                    onClick={() => {
                      setPosTab(t);
                      if (t === "ALL" && search) setSearch("");
                    }}
                  >
                    {t}
                  </Button>
                );
              })}
            </div>

            {/* Search */}
            <div className="mb-2">
              <Input
                placeholder="Search by name / team"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="bg-white text-black"
              />
            </div>

            {/* List */}
            <ul className="space-y-1.5 max-h-[80vh] overflow-auto pr-1">
              {filteredAvailable.map((p, i) => (
                <React.Fragment key={p.id}>
                  {insertIndex === i && editMode && (
                    <div
                      className={`h-[3px] ${
                        dark ? "bg-zinc-200" : "bg-gray-800"
                      } rounded my-0.5`}
                    />
                  )}
                  <PlayerRow p={p} posIndex={posRankMap[p.id]} />
                </React.Fragment>
              ))}
              {insertIndex === filteredAvailable.length && editMode && (
                <div
                  className={`h-[3px] ${
                    dark ? "bg-zinc-200" : "bg-gray-800"
                  } rounded my-0.5`}
                />
              )}
              {filteredAvailable.length === 0 && (
                <li className="text-xs opacity-70">No players match.</li>
              )}
            </ul>
          </section>

          {/* Draft Board */}
          <section
            className={`${
              dark ? "bg-zinc-700" : "bg-white"
            } rounded-2xl shadow p-3 md:col-span-8`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h2 className="font-bold">Draft Board</h2>
                <Button className="bg-orange-300 text-black" onClick={resetDraft}>
                  Reset
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  className={`${
                    editNames ? "bg-blue-500 text-white" : "bg-orange-300 text-black"
                  }`}
                  onClick={() => setEditNames((v) => !v)}
                >
                  {editNames ? "Done" : "Edit Team Names"}
                </Button>
                <Button
                  className="bg-teal-300 text-black"
                  onClick={undoLast}
                  disabled={!history.length}
                >
                  Undo
                </Button>
              </div>
            </div>

            {/* 'My team' picker */}
            {editNames && (
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs opacity-80">Highlight my team:</label>
                <select
                  className={`px-2 py-1 border rounded text-xs ${
                    dark ? "bg-zinc-800 border-zinc-600" : "bg-white"
                  }`}
                  value={settings.myTeam == null ? "" : String(settings.myTeam)}
                  onChange={(e) => {
                    const v =
                      e.target.value === "" ? null : parseInt(e.target.value, 10);
                    setSettings((s) => ({ ...s, myTeam: v }));
                  }}
                >
                  <option value="">None</option>
                  {Array.from({ length: settings.numTeams }, (_, i) => (
                    <option key={i} value={i}>
                      {settings.teamNames[i] || `Team ${i + 1}`} ({i + 1})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] opacity-70">
                  The chosen team column will have a yellow border.
                </span>
              </div>
            )}

            {/* The board (single horizontal scroller) */}
            <div className="overflow-x-auto overflow-y-visible">
              {/* Team header */}
              <div
                className="grid gap-2 mb-2"
                style={{
                  gridTemplateColumns: `repeat(${settings.numTeams}, minmax(140px, 1fr))`,
                }}
              >
                {Array.from({ length: settings.numTeams }, (_, c) => {
                  const isMine = settings.myTeam === c;
                  return (
                    <div
                      key={c}
                      className={`relative ${
                        dark
                          ? "bg-zinc-600 border-zinc-600"
                          : "bg-gray-200 border-gray-200"
                      } border p-2 rounded-md ${isMine ? "ring-2 ring-yellow-400" : ""}`}
                    >
                      {editNames ? (
                        <input
                          className={`w-full px-2 py-1 rounded border text-sm ${
                            dark ? "bg-zinc-700 border-zinc-500 text-white" : ""
                          }`}
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
                        <span className={`font-semibold ${dark ? "text-zinc-200" : "text-black"}`}>
                          {settings.teamNames[c]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Round rows */}
              {Array.from({ length: settings.numRounds }, (_, r) => (
                <div
                  key={r}
                  className="grid gap-2 mb-2"
                  style={{
                    gridTemplateColumns: `repeat(${settings.numTeams}, minmax(140px, 1fr))`,
                  }}
                >
                  {Array.from({ length: settings.numTeams }, (_, c) => {
                    const snakedIndex =
                      r * settings.numTeams +
                      (r % 2 === 0 ? c : settings.numTeams - 1 - c);
                    const id = history[snakedIndex];
                    const p = id ? players.find((x) => x.id === id) : null;
                    const isMine = settings.myTeam === c;
                    const pickNumber = snakedIndex + 1;

                    return (
                      <div
                        key={c}
                        className={`relative ${
                          dark
                            ? "bg-zinc-800 border-zinc-600"
                            : "bg-gray-50 border-gray-200"
                        } border rounded-md p-2 min-h-[34px] ${isMine ? "ring-2 ring-yellow-400" : ""}`}
                      >
                        {/* pick number (larger, no '#') */}
                        <span className="absolute left-1 bottom-1 text-[11px] opacity-70">
                          {pickNumber}
                        </span>

                        {p && (
                          <div
                            className={`px-2 py-1 rounded-md text-[12px] font-semibold ${POS_BG(
                              p.pos
                            )} truncate`}
                          >
                            {p.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <PlayerDetails
              dark={dark}
              selected={players.find((x) => x.id === selectedId) || null}
              adp={adp}
              stats={stats}
              openAdp={() => adpFileRef.current?.click()}
              openStats={() => statsFileRef.current?.click()}
              statsFileRef={statsFileRef}
              adpFileRef={adpFileRef}
            />
          </section>
        </div>
      </div>

      {/* ================= Import Modal ================= */}
      {importOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setImportOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`${dark ? "bg-zinc-700 text-zinc-100" : "bg-white"} w-full max-w-3xl rounded-2xl shadow p-4`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Import</h3>
              <Button className="bg-blue-500 text-white" onClick={() => setImportOpen(false)}>
                Done
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Players */}
              <div>
                <div className="font-semibold text-sm mb-1">Players (replace list)</div>
                <p className="text-xs opacity-70 mb-2">
                  Paste free text (<code>Tier, POS, Team, Name</code>) or upload CSV with headers in any order:
                  <code> tier</code> (ignored in UI), <code> pos/position</code>, <code> team</code>, <code> name</code>.
                </p>
                <textarea
                  rows={8}
                  className={`w-full rounded-lg border px-2 py-1.5 text-sm ${
                    dark ? "bg-zinc-800 border-zinc-600" : ""
                  }`}
                  placeholder={`Examples:\n1, WR, LAR, Puka Nacua\n1, RB, NYJ, Breece Hall\n2, TE, DET, Sam LaPorta`}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                />
                <div className="mt-2 flex gap-2">
                  <Button className="bg-orange-300 text-black" onClick={importFromText}>
                    Import from Text
                  </Button>
                  <Button className="bg-orange-300 text-black" onClick={openFile}>
                    Choose CSV…
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={onCSVChosen}
                  />
                </div>
              </div>

              {/* ADP & Stats */}
              <div>
                <div className="font-semibold text-sm mb-1">ADP (merge)</div>
                <p className="text-xs opacity-70 mb-2">
                  Upload a CSV with columns <code>name</code> (or <code>player</code>), <code>adp</code>, and
                  <code> source</code> (e.g. <em>yahoo</em>, <em>fantasypros</em>). This won’t change your player list.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button className="bg-orange-300 text-black" onClick={openAdp}>
                    Choose ADP CSV…
                  </Button>
                  <input
                    ref={adpFileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={onADPChosen}
                  />
                </div>

                <div className="font-semibold text-sm mt-4 mb-1">Stats (merge, last 3 seasons)</div>
                <p className="text-xs opacity-70 mb-2">
                  CSV with flexible headers (e.g., <code>name</code>, <code>year</code>, <code>targets</code>, <code>rec</code>,
                  <code>rec_yds</code>, <code>rec_td</code>, <code>rush_att</code>, <code>rush_yds</code>, <code>rush_td</code>,
                  <code>pass_att</code>, <code>pass_yds</code>, <code>pass_td</code>).
                </p>
                <div className="mt-2 flex gap-2">
                  <Button className="bg-orange-300 text-black" onClick={openStats}>
                    Choose Stats CSV…
                  </Button>
                  <input
                    ref={statsFileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={onStatsChosen}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drag overlay: translucent tile follows cursor */}
      {drag && draggingPlayer && (
        <div
          style={{
            position: "fixed",
            left: Math.max(6, drag.x - drag.offX),
            top: Math.max(6, drag.y - drag.offY),
            width: drag.w,
            pointerEvents: "none",
            opacity: 0.85,
            zIndex: 1000,
          }}
          className="rounded-md border border-gray-300 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 p-1.5">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${POS_BG(draggingPlayer.pos)}`}>
                {draggingPlayer.pos || "POS"}
              </span>
              <span className="font-semibold text-[12px]">{draggingPlayer.name}</span>
              <span className="text-[11px] opacity-70">{draggingPlayer.team || ""}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   Player Details panel
===================================================== */
function PlayerDetails({
  dark,
  selected,
  adp,
  stats,
  openAdp,
  openStats,
  statsFileRef,
  adpFileRef,
}) {
  const key = selected ? selected.name : null;
  const k = key ? norm(key) : null;
  const selectedADP = k ? adp[k] || {} : {};
  const now = new Date().getFullYear();
  const years = [String(now - 1), String(now - 2), String(now - 3)];
  const rows =
    k && stats[k]
      ? years.map((y) => ({ y, d: stats[k][y] || {} }))
      : years.map((y) => ({ y, d: {} }));
  const num = (v) => (v === undefined ? "—" : String(v));

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
          {/* Basics */}
          <div className="md:col-span-4 flex gap-3 items-start">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200 shrink-0 flex items-center justify-center text-gray-500">
              {selected.name
                .split(" ")
                .map((s) => s[0])
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
                <div>ADP (Yahoo): {selectedADP.yahoo ?? "—"}</div>
                <div>ADP (FantasyPros): {selectedADP.fantasypros ?? "—"}</div>
              </div>
            </div>
          </div>

          {/* Last 3 Seasons */}
          <div className="md:col-span-6">
            <div className="font-semibold text-xs mb-1">Last 3 Seasons</div>
            <div className="overflow-auto">
              {(() => {
                const pos = (selected.pos || "").toUpperCase();
                if (pos === "QB") {
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
                        {rows.map(({ y, d }) => (
                          <tr key={y}>
                            <td className="py-1 pr-2">{y}</td>
                            <td className="py-1 pr-2">{num(d.pass_att)}</td>
                            <td className="py-1 pr-2">{num(d.pass_yds)}</td>
                            <td className="py-1 pr-2">{num(d.pass_td)}</td>
                            <td className="py-1 pr-2">{num(d.rush_yds)}</td>
                            <td className="py-1 pr-2">{num(d.rush_td)}</td>
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
                      {rows.map(({ y, d }) => (
                        <tr key={y}>
                          <td className="py-1 pr-2">{y}</td>
                          <td className="py-1 pr-2">{num(d.targets)}</td>
                          <td className="py-1 pr-2">{num(d.receptions)}</td>
                          <td className="py-1 pr-2">{num(d.rec_yds)}</td>
                          <td className="py-1 pr-2">{num(d.rec_td)}</td>
                          <td className="py-1 pr-2">{num(d.rush_att)}</td>
                          <td className="py-1 pr-2">{num(d.rush_yds)}</td>
                          <td className="py-1 pr-2">{num(d.rush_td)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Optional: import helpers */}
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
