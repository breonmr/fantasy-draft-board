import { useEffect, useMemo, useRef, useState } from "react";
import { DragOverlay } from "./components/DragOverlay.jsx";
import { DraftBoard } from "./components/DraftBoard.jsx";
import { ImportModal } from "./components/ImportModal.jsx";
import { RankingsPanel } from "./components/RankingsPanel.jsx";
import { IconToggle } from "./components/ui.jsx";
import { addDraft, reorderAvailablePlayers, resetPlayers, setPlayerDrafted, undoLastDraft } from "./lib/draft.js";
import { parseAdpCSV, parseImportLine, parsePlayersCSV, parseStatsCSV } from "./lib/parsers.js";
import { availablePlayers, createPlayers, filterAvailablePlayers, mergeStatsData, positionRankMap } from "./lib/players.js";
import { loadDarkMode, loadDraftState, saveDarkMode, saveDraftState } from "./lib/storage.js";

export default function App() {
  const [initialState] = useState(() => loadDraftState());
  const [players, setPlayers] = useState(initialState.players);
  const [history, setHistory] = useState(initialState.history);
  const [settings, setSettings] = useState(initialState.settings);
  const [adp, setAdp] = useState(initialState.adp);
  const [stats, setStats] = useState(initialState.stats);

  const [editMode, setEditMode] = useState(false);
  const [editNames, setEditNames] = useState(false);
  const [posTab, setPosTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [dark, setDark] = useState(() => loadDarkMode());

  const fileInputRef = useRef(null);
  const adpFileRef = useRef(null);
  const statsFileRef = useRef(null);
  const itemRefs = useRef(new Map());
  const rectsRef = useRef([]);
  const [drag, setDrag] = useState(null);
  const [insertIndex, setInsertIndex] = useState(null);

  useEffect(() => {
    saveDarkMode(dark);
  }, [dark]);

  useEffect(() => {
    saveDraftState({ players, history, settings, adp, stats });
  }, [players, history, settings, adp, stats]);

  const available = useMemo(() => availablePlayers(players), [players]);
  const positionRanks = useMemo(() => positionRankMap(available), [available]);
  const filteredAvailable = useMemo(
    () => filterAvailablePlayers(players, posTab, search),
    [players, posTab, search]
  );
  const selectedPlayer = players.find((player) => player.id === selectedId) || null;
  const draggingPlayer = drag ? players.find((player) => player.id === drag.id) : null;

  function draftPlayer(id) {
    setPlayers((current) => setPlayerDrafted(current, id, true));
    setHistory((current) => addDraft(current, id));
    if (search.trim()) setSearch("");
  }

  function undoLast() {
    setHistory((current) => {
      const { history: nextHistory, lastId } = undoLastDraft(current);
      if (lastId) setPlayers((currentPlayers) => setPlayerDrafted(currentPlayers, lastId, false));
      return nextHistory;
    });
    setInsertIndex(null);
  }

  function resetDraft() {
    if (!confirm("Reset the entire draft?")) return;
    setPlayers((current) => resetPlayers(current));
    setHistory([]);
    setInsertIndex(null);
  }

  function measureRects() {
    rectsRef.current = filteredAvailable.flatMap((player, index) => {
      const element = itemRefs.current.get(player.id);
      if (!element) return [];
      const rect = element.getBoundingClientRect();
      return [{ id: player.id, index, mid: (rect.top + rect.bottom) / 2 }];
    });
  }

  function startDrag(event, id, fromFiltered) {
    if (!editMode) return;
    const element = itemRefs.current.get(id);
    if (!element) return;
    const rect = element.getBoundingClientRect();
    measureRects();

    setDrag({
      id,
      fromFiltered,
      x: event.clientX,
      y: event.clientY,
      offX: event.clientX - rect.left,
      offY: event.clientY - rect.top,
      w: rect.width,
    });
    setInsertIndex(fromFiltered);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
    document.body.classList.add("select-none");
  }

  function onPointerMove(event) {
    setDrag((current) => {
      if (!current) return current;
      measureRects();
      let nextIndex = rectsRef.current.findIndex((item) => event.clientY < item.mid);
      if (nextIndex === -1) nextIndex = rectsRef.current.length;
      setInsertIndex(nextIndex);
      return { ...current, x: event.clientX, y: event.clientY };
    });
  }

  function onPointerUp() {
    const currentDrag = drag;
    setDrag(null);
    document.body.classList.remove("select-none");
    window.removeEventListener("pointermove", onPointerMove);

    if (!currentDrag) return;
    const targetIndex = insertIndex ?? currentDrag.fromFiltered;
    setInsertIndex(null);

    const fromId = filteredAvailable[currentDrag.fromFiltered]?.id;
    const targetId = targetIndex >= filteredAvailable.length ? null : filteredAvailable[targetIndex]?.id;
    const fromAvailableIndex = available.findIndex((player) => player.id === fromId);
    let toAvailableIndex = targetId === null
      ? available.length
      : available.findIndex((player) => player.id === targetId);

    if (fromAvailableIndex < toAvailableIndex) toAvailableIndex -= 1;
    if (fromAvailableIndex >= 0 && toAvailableIndex >= 0) {
      setPlayers((current) => reorderAvailablePlayers(current, fromAvailableIndex, toAvailableIndex));
    }
  }

  function importPlayers(rows) {
    if (!rows.length) return;
    setPlayers(createPlayers(rows));
    setHistory([]);
    setImportText("");
    setImportOpen(false);
    setEditMode(false);
  }

  function importFromText() {
    const rows = importText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parseImportLine);
    importPlayers(rows);
  }

  function readFile(event, onText) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onText(String(reader.result || ""));
    reader.readAsText(file);
  }

  function onPlayersFileChange(event) {
    readFile(event, (text) => {
      importPlayers(parsePlayersCSV(text));
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function onAdpFileChange(event) {
    readFile(event, (text) => {
      const imported = parseAdpCSV(text);
      if (!Object.keys(imported).length) return;
      setAdp((current) => ({ ...current, ...imported }));
      alert("ADP data imported.");
      if (adpFileRef.current) adpFileRef.current.value = "";
    });
  }

  function onStatsFileChange(event) {
    readFile(event, (text) => {
      const imported = parseStatsCSV(text);
      if (!Object.keys(imported).length) return;
      setStats((current) => mergeStatsData(current, imported));
      alert("Stats imported.");
      if (statsFileRef.current) statsFileRef.current.value = "";
    });
  }

  function changePositionTab(tab) {
    setPosTab(tab);
    if (tab === "ALL" && search) setSearch("");
  }

  function updateTeamName(index, name) {
    setSettings((current) => {
      const teamNames = [...current.teamNames];
      teamNames[index] = name;
      return { ...current, teamNames };
    });
  }

  return (
    <div className={`${dark ? "bg-zinc-800 text-zinc-100" : "bg-gray-50 text-gray-900"} min-h-screen w-full`}>
      <div className="w-full px-3 md:px-4 py-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold">Fantasy Draft Board</h1>
            <IconToggle on={dark} onClick={() => setDark((current) => !current)} />
          </div>
          <div className="flex flex-wrap items-center gap-2" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-10 gap-3">
          <RankingsPanel
            dark={dark}
            editMode={editMode}
            onEditModeChange={setEditMode}
            onOpenImport={() => setImportOpen(true)}
            posTab={posTab}
            onPosTabChange={changePositionTab}
            search={search}
            onSearchChange={setSearch}
            players={filteredAvailable}
            positionRanks={positionRanks}
            drag={drag}
            insertIndex={insertIndex}
            itemRefs={itemRefs}
            onPlayerPointerDown={startDrag}
            onDraft={draftPlayer}
            onSelect={setSelectedId}
          />
          <DraftBoard
            dark={dark}
            settings={settings}
            editNames={editNames}
            onEditNamesChange={setEditNames}
            onTeamNameChange={updateTeamName}
            history={history}
            players={players}
            onReset={resetDraft}
            onUndo={undoLast}
            selectedPlayer={selectedPlayer}
            adp={adp}
            stats={stats}
            openAdp={() => adpFileRef.current?.click()}
            openStats={() => statsFileRef.current?.click()}
            statsFileRef={statsFileRef}
            adpFileRef={adpFileRef}
          />
        </div>
      </div>

      {importOpen && (
        <ImportModal
          dark={dark}
          importText={importText}
          onImportTextChange={setImportText}
          onClose={() => setImportOpen(false)}
          onImportText={importFromText}
          onOpenPlayersFile={() => fileInputRef.current?.click()}
          onOpenAdpFile={() => adpFileRef.current?.click()}
          onOpenStatsFile={() => statsFileRef.current?.click()}
          fileInputRef={fileInputRef}
          adpFileRef={adpFileRef}
          statsFileRef={statsFileRef}
          onPlayersFileChange={onPlayersFileChange}
          onAdpFileChange={onAdpFileChange}
          onStatsFileChange={onStatsFileChange}
        />
      )}

      <DragOverlay drag={drag} player={draggingPlayer} />
    </div>
  );
}
