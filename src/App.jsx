import React, { useEffect, useMemo, useRef, useState } from "react";

/* =======================
   Storage / schema
======================= */
const STORAGE_KEY = "fantasy-draft-board-v7";
const DARK_KEY = "fdb_dark";

const DEFAULT_SETTINGS = {
  numTeams: 12,
  numRounds: 14,
  teamNames: Array.from({ length: 12 }, (_, i) => `Team ${i + 1}`),
};

// seed — replace via Import
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
  if (p === "WR") return "bg-blue-300 text-black";
  if (p === "RB") return "bg-green-300 text-black";
  if (p === "TE") return "bg-orange-300 text-black";
  if (p === "QB") return "bg-pink-300 text-black";
  if (p === "DST" || p === "DEF") return "bg-gray-300 text-black";
  return "bg-gray-300 text-black";
};

/* Pastel tier colors — distinct from POS; loop after 5 */
const TIER_CLASSES = [
  "bg-emerald-200 text-emerald-900",
  "bg-sky-200 text-sky-900",
  "bg-amber-200 text-amber-900",
  "bg-orange-200 text-orange-900",
  "bg-rose-200 text-rose-900",
];
const tierClass = (tier = 1) =>
  TIER_CLASSES[(Math.max(1, tier) - 1) % TIER_CLASSES.length];

const uid = () => Math.random().toString(36).slice(2, 9);

/* ---------- helpers ---------- */
const norm = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function parseImportLine(line) {
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
  // fallback: "Name POS TEAM T#"
  let name = line.trim(),
    pos = "",
    team = "",
    tier = 1;
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
    if (Array.isArray(obj))
      return { players: obj, history: [], settings: DEFAULT_SETTINGS, adp: {} };
    return {
      players: obj.players || [],
      history: obj.history || [],
      settings: { ...DEFAULT_SETTINGS, ...(obj.settings || {}) },
      adp: obj.adp || {},
    };
  } catch {
    const players = STARTERS.map((line, i) => {
      const { tier, pos, team, name } = parseImportLine(line);
      return { id: uid(), name, pos, team, tier, drafted: false, rank: i };
    });
    return { players, history: [], settings: DEFAULT_SETTINGS, adp: {} };
  }
}

/* =======================
   UI primitives
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
  const [adp, setAdp] = useState(initial.adp); // { normName: { yahoo?: number, fantasypros?: number } }

  const [editMode, setEditMode] = useState(false);
  const [editNames, setEditNames] = useState(false);
  const [posTab, setPosTab] = useState("ALL");
  const [search, setSearch] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const fileInputRef = useRef(null);
  const adpFileRef = useRef(null);

  // manual drag state
  const itemRefs = useRef(new Map()); // id -> element
  const rectsRef = useRef([]); // {id, idx, mid}
  const [drag, setDrag] = useState(null); // {id, fromFiltered, x, y, offX, offY, w}
  const [insertIndex, setInsertIndex] = useState(null);

  // Player details
  const [selectedId, setSelectedId] = useState(null);
  const [sleeperMap, setSleeperMap] = useState(null); // { normName: { id, data } }

  // Dark mode (lighter charcoal)
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
        JSON.stringify({ players, history, settings, adp })
      );
    } catch {}
  }, [players, history, settings, adp]);

  /* ------- Derived lists ------- */
  const byRank = useMemo(
    () => [...players].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)),
    [players]
  );
  const available = useMemo(() => byRank.filter((p) => !p.drafted), [byRank]);

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

  const filteredAvailable = useMemo(() => {
    return available.filter((p) => {
      if (posTab !== "ALL" && (p.pos || "") !== posTab) return false;
      if (!search.trim()) return true;
      const hay = `${p.name} ${p.pos || ""} ${p.team || ""}`.toLowerCase();
      return hay.includes(search.toLowerCase());
    });
  }, [available, posTab, search]);

  /* ------- Reorder ------- */
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

      // Auto-tier to neighbor(s)
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

  /* ------- Draft actions ------- */
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
    if (!confirm("Reset the entire draft?")) return;
    setPlayers((ps) => ps.map((p) => ({ ...p, drafted: false })));
    setHistory([]);
    setInsertIndex(null);
  };

  /* ===== Manual drag & drop (pointer events) ===== */
  function measureRects(list) {
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

  /* ------- Import (players + ADP) ------- */
  const openFile = () => fileInputRef.current?.click();
  const openAdp = () => adpFileRef.current?.click();

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
    // expects headers: name/player, adp, source (values like yahoo, fantasypros)
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

  /* ------- Player Details (Sleeper) ------- */
  useEffect(() => {
    // lazy load Sleeper players index on first open
    if (!selectedId || sleeperMap) return;
    (async () => {
      try {
        const res = await fetch("https://api.sleeper.app/v1/players/nfl");
        const obj = await res.json();
        const map = {};
        for (const pid in obj) {
          const p = obj[pid];
          if (!p || !p.full_name) continue;
          map[norm(p.full_name)] = { id: pid, data: p };
        }
        setSleeperMap(map);
      } catch (e) {
        // ignore; we'll just show placeholders
      }
    })();
  }, [selectedId, sleeperMap]);

  const selected = selectedId
    ? players.find((p) => p.id === selectedId)
    : null;
  const selectedSleeper = useMemo(() => {
    if (!sleeperMap || !selected) return null;
    const k = norm(selected.name);
    return sleeperMap[k] || null;
  }, [sleeperMap, selected]);

  const selectedADP = useMemo(() => {
    if (!selected) return {};
    return adp[norm(selected.name)] || {};
  }, [adp, selected]);

  const headshotUrl = selectedSleeper
    ? // Sleeper headshot CDN
      `https://sleepercdn.com/content/nfl/players/thumb/${selectedSleeper.id}.jpg`
    : null;

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

  // Player row with Draft button + clickable name (opens details)
  const PlayerRow = ({ p, overallIndex, posIndex }) => {
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
          startDrag(e, p.id, overallIndex);
        }}
        title={editMode ? "Drag to reorder" : "Click Draft to draft"}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="w-5 text-[10px] opacity-70 tabular-nums">
            {overallIndex + 1}
          </span>
          <TierPill tier={p.tier || 1} />
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-black">
            {p.pos ? `${p.pos}${posIndex ?? ""}` : "POS"}
          </span>
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
          <span className="text-[11px] opacity-70 shrink-0">{p.team || ""}</span>
        </div>
        <div className="shrink-0">
          <Button
            className="bg-green-400 text-black"
            onClick={(e) => {
              e.stopPropagation();
              draftPlayer(p.id);
            }}
          >
            Draft
          </Button>
        </div>
      </li>
    );
  };

  const renderOverallList = () => {
    const items = [];
    for (let i = 0; i < filteredAvailable.length; i++) {
      if (insertIndex === i && editMode) {
        items.push(
          <div
            key={`line-${i}`}
            className={`h-[3px] ${
              dark ? "bg-zinc-200" : "bg-gray-800"
            } rounded my-0.5`}
          />
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
        <div
          key="line-end"
          className={`h-[3px] ${dark ? "bg-zinc-200" : "bg-gray-800"} rounded my-0.5`}
        />
      );
    }
    return items;
  };

  // Selection (drag overlay)
  const draggingPlayer = drag ? players.find((p) => p.id === drag.id) : null;

  /* =======================
     Render
  ======================= */
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
            <h1 className="text-2xl md:text-3xl font-bold">
              Fantasy Draft Board
            </h1>
            <IconToggle on={dark} onClick={() => setDark((v) => !v)} />
          </div>
          <div className="flex flex-wrap items-center gap-2" />
        </div>

        {/* 30% / 70% layout (3 / 7) */}
        <div className="grid grid-cols-1 md:grid-cols-10 gap-3">
          {/* Overall Rankings (30%) */}
          <section
            className={`${
              dark ? "bg-zinc-700" : "bg-white"
            } rounded-2xl shadow p-3 md:col-span-3`}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold">Overall Rankings</h2>
              <div className="flex items-center gap-2">
                {!editMode ? (
                  <Button
                    onClick={() => setEditMode(true)}
                    className="bg-orange-300 text-black"
                  >
                    Edit Order
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

            {/* colored tabs */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {POS_LIST.map((t) => {
                const pastel =
                  t === "ALL" ? "bg-gray-200 text-black" : POS_BG(t);
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

            <ul className="space-y-1.5 max-h-[80vh] overflow-auto pr-1">
              {renderOverallList()}
              {filteredAvailable.length === 0 && (
                <li className="text-xs opacity-70">No players match.</li>
              )}
            </ul>
          </section>

          {/* Draft Board + Details (70%) */}
          <section
            className={`${
              dark ? "bg-zinc-700" : "bg-white"
            } rounded-2xl shadow p-3 md:col-span-7`}
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

            {/* Team header */}
            <div
              className="grid gap-2 mb-2"
              style={{
                gridTemplateColumns: `repeat(${settings.numTeams}, minmax(140px, 1fr))`,
              }}
            >
              {Array.from({ length: settings.numTeams }, (_, c) => (
                <div
                  key={c}
                  className={`${
                    dark
                      ? "bg-zinc-600 border-zinc-600"
                      : "bg-gray-200 border-gray-200"
                  } border p-2 rounded-md`}
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
                    <span className="font-semibold text-zinc-200">
                      {settings.teamNames[c]}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Rows */}
            {Array.from({ length: settings.numRounds }, (_, r) => (
              <div
                key={r}
                className="grid gap-2 mb-2"
                style={{
                  gridTemplateColumns: `repeat(${settings.numTeams}, minmax(140px, 1fr))`,
                }}
              >
                {Array.from({ length: settings.numTeams }, (_, c) => {
                  const id = history[r * settings.numTeams + (r % 2 === 0 ? c : settings.numTeams - 1 - c)];
                  const p = id ? players.find((x) => x.id === id) : null;
                  return (
                    <div
                      key={c}
                      className={`${
                        dark ? "bg-zinc-800 border-zinc-600" : "bg-gray-50 border-gray-200"
                      } border rounded-md p-2 min-h-[34px]`}
                    >
                      {p ? (
                        <div
                          className={`px-2 py-1 rounded-md text-[12px] font-semibold ${POS_BG(
                            p.pos
                          )} truncate`}
                        >
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

            {/* Player Details (lower right) */}
            <div className={`${dark ? "bg-zinc-800" : "bg-gray-50"} rounded-xl p-3 mt-3`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Player Details</h3>
                {selected && (
                  <span className="text-xs opacity-70">
                    Click a player name in Overall Rankings to view
                  </span>
                )}
              </div>
              {!selected ? (
                <div className="text-sm opacity-70">No player selected.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-10 gap-3">
                  {/* Photo + basics */}
                  <div className="md:col-span-3 flex gap-3 items-start">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                      {headshotUrl ? (
                        <img src={headshotUrl} alt={selected.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          {selected.name.split(" ").map(s=>s[0]).join("").slice(0,2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold truncate">{selected.name}</div>
                      <div className="text-xs opacity-80">
                        {selected.pos || "POS"} • {selected.team || "TEAM"}
                      </div>
                      <div className="mt-1 text-xs flex gap-2 items-center">
                        <span className={`px-1.5 py-0.5 rounded-full ${tierClass(selected.tier || 1)}`}>
                          Tier {selected.tier || 1}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="md:col-span-3">
                    <div className="font-semibold text-xs mb-1">Stats (basic)</div>
                    {selectedSleeper ? (
                      <ul className="text-xs space-y-0.5">
                        <li>Age: {selectedSleeper.data.age ?? "—"}</li>
                        <li>Height: {selectedSleeper.data.height ?? "—"}</li>
                        <li>Weight: {selectedSleeper.data.weight ?? "—"}</li>
                        <li>College: {selectedSleeper.data.college ?? "—"}</li>
                      </ul>
                    ) : (
                      <div className="text-xs opacity-70">Stats unavailable (no match yet).</div>
                    )}
                  </div>

                  {/* ADP */}
                  <div className="md:col-span-2">
                    <div className="font-semibold text-xs mb-1">ADP</div>
                    <ul className="text-xs space-y-0.5">
                      <li>Yahoo: {selectedADP.yahoo ?? "—"}</li>
                      <li>FantasyPros: {selectedADP.fantasypros ?? "—"}</li>
                    </ul>
                    <div className="mt-2">
                      <Button className="bg-orange-300 text-black" onClick={openAdp}>Import ADP CSV</Button>
                      <input ref={adpFileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onADPChosen} />
                    </div>
                  </div>

                  {/* News links */}
                  <div className="md:col-span-2">
                    <div className="font-semibold text-xs mb-1">Recent News</div>
                    <ul className="text-xs space-y-1">
                      <li>
                        <a
                          className="underline"
                          href={`https://news.google.com/search?q=${encodeURIComponent(selected.name + " NFL")}`}
                          target="_blank" rel="noreferrer"
                        >
                          Google News
                        </a>
                      </li>
                      <li>
                        <a
                          className="underline"
                          href={`https://www.fantasypros.com/search/?query=${encodeURIComponent(selected.name)}`}
                          target="_blank" rel="noreferrer"
                        >
                          FantasyPros News
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Import Modal */}
      {importOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setImportOpen(false)}
        >
          <div
            className={`${
              dark ? "bg-zinc-700 text-zinc-100" : "bg-white"
            } w-full max-w-3xl rounded-2xl shadow p-4`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Import</h3>
              <Button
                className="bg-blue-500 text-white"
                onClick={() => setImportOpen(false)}
              >
                Done
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Players */}
              <div>
                <div className="font-semibold text-sm mb-1">Players (replace list)</div>
                <p className="text-xs opacity-70 mb-2">
                  Paste free text (<code>Tier, POS#, Team, Name</code>) or upload CSV with headers in any order:
                  <code> tier</code>, <code> pos/position</code>, <code> team</code>, <code> name</code>.
                </p>
                <textarea
                  rows={8}
                  className={`w-full rounded-lg border px-2 py-1.5 text-sm ${
                    dark ? "bg-zinc-800 border-zinc-600" : ""
                  }`}
                  placeholder={`Examples:\n1, WR1, LAR, Puka Nacua\n1, RB1, NYJ, Breece Hall\n2, TE1, DET, Sam LaPorta`}
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

              {/* ADP */}
              <div>
                <div className="font-semibold text-sm mb-1">ADP (merge)</div>
                <p className="text-xs opacity-70 mb-2">
                  Upload a CSV with columns <code>name</code> (or <code>player</code>),{" "}
                  <code>adp</code>, and <code>source</code> (values like{" "}
                  <em>yahoo</em> or <em>fantasypros</em>). This won’t change your player list.
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
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drag overlay (follows cursor, translucent) */}
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
              <span className="w-5 text-[10px] opacity-70 tabular-nums"></span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${tierClass(
                  draggingPlayer.tier || 1
                )}`}
              >
                Tier {draggingPlayer.tier || 1}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-black">
                {draggingPlayer.pos || "POS"}
              </span>
              <span className="font-semibold text-[12px]">
                {draggingPlayer.name}
              </span>
              <span className="text-[11px] opacity-70">{draggingPlayer.team || ""}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
