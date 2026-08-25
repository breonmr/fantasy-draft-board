import { Fragment } from "react";
import { POSITION_FILTERS, positionClass } from "../data/draftDefaults.js";
import { Button, Input } from "./ui.jsx";

function PlayerRow({
  player,
  positionIndex,
  dark,
  editMode,
  beingDragged,
  itemRefs,
  onPointerDown,
  onDraft,
  onSelect,
  onToggleStar,
}) {
  return (
    <li
      data-id={player.id}
      ref={(element) =>
        element ? itemRefs.current.set(player.id, element) : itemRefs.current.delete(player.id)
      }
      className={`rounded-md border ${
        dark ? "border-zinc-600 bg-zinc-700" : "border-gray-300 bg-white"
      } flex items-center justify-between gap-1.5 px-1.5 py-1.5 ${
        editMode ? "cursor-grab" : "cursor-pointer hover:border-blue-400 hover:shadow-sm"
      } select-none ${beingDragged ? "opacity-40" : ""}`}
      onPointerDown={onPointerDown}
      onClick={() => {
        if (!editMode) onSelect(player.id);
      }}
      title={editMode ? "Drag to reorder" : "Click card for details; click Draft to draft"}
    >
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {!editMode ? (
          <div className="min-w-0 flex-1">
            <button
              className="block w-full text-left font-semibold text-[12px] hover:underline truncate"
              onClick={(event) => {
                event.stopPropagation();
                onSelect(player.id);
              }}
              title="Show details"
            >
              {player.name}
            </button>
            <div className="flex items-center gap-1 text-[10px] leading-tight opacity-60">
              <span
                className={`w-2 h-2 shrink-0 rounded-full ${positionClass(player.pos)}`}
                title={player.pos || "Position unavailable"}
              />
              <span>{player.pos ? `${player.pos}${positionIndex ?? ""}` : "POS"}</span>
              {player.team && <span>• {player.team}</span>}
            </div>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <span className="block font-semibold text-[12px] truncate">{player.name}</span>
            <div className="flex items-center gap-1 text-[10px] leading-tight opacity-60">
              <span
                className={`w-2 h-2 shrink-0 rounded-full ${positionClass(player.pos)}`}
                title={player.pos || "Position unavailable"}
              />
              <span>{player.pos ? `${player.pos}${positionIndex ?? ""}` : "POS"}</span>
              {player.team && <span>• {player.team}</span>}
            </div>
          </div>
        )}
        <span className="w-4 shrink-0 text-right text-[9px] opacity-60 tabular-nums">{(player.rank ?? 0) + 1}</span>
      </div>

      {!editMode && (
        <div className="shrink-0 flex items-center gap-1">
          <button
            type="button"
            className={`w-6 h-6 rounded-md text-base leading-none hover:bg-amber-100 ${
              player.starred ? "text-amber-500" : "text-gray-400 hover:text-amber-500"
            }`}
            onClick={(event) => {
              event.stopPropagation();
              onToggleStar(player.id);
            }}
            aria-label={`${player.starred ? "Remove" : "Add"} ${player.name} ${player.starred ? "from" : "to"} watchlist`}
            title={player.starred ? "Remove from watchlist" : "Add to watchlist"}
          >
            {player.starred ? "★" : "☆"}
          </button>
          {player.target > 0 && (
            <span
              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] font-bold bg-amber-300 text-amber-900"
              title={`Target ${player.target}`}
            >
              ★ {player.target}
            </span>
          )}
          <Button
            className="bg-blue-900 text-white px-2 py-1 text-[11px]"
            onClick={(event) => {
              event.stopPropagation();
              onDraft(player.id);
            }}
          >
            Draft
          </Button>
        </div>
      )}
    </li>
  );
}

export function RankingsPanel({
  dark,
  editMode,
  onEditModeChange,
  onOpenImport,
  posTab,
  onPosTabChange,
  search,
  onSearchChange,
  players,
  positionRanks,
  drag,
  insertIndex,
  itemRefs,
  onPlayerPointerDown,
  onDraft,
  onSelect,
  onToggleStar,
}) {
  return (
    <section
      className={`${dark ? "bg-zinc-700" : "bg-white"} rounded-2xl shadow p-2 flex flex-col min-h-0 md:sticky md:top-2 md:h-[calc(100vh-1rem)]`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <h2 className="font-bold text-sm">Overall Rankings</h2>
        <div className="flex items-center gap-1">
          {!editMode ? (
            <Button onClick={() => onEditModeChange(true)} className="bg-orange-300 text-black px-2 py-1 text-[11px]">
              Edit
            </Button>
          ) : (
            <>
              <Button onClick={onOpenImport} className="bg-orange-300 text-black px-2 py-1 text-[11px]">
                Import
              </Button>
              <Button onClick={() => onEditModeChange(false)} className="bg-blue-500 text-white px-2 py-1 text-[11px]">
                Done
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-nowrap items-center justify-between gap-0.5 mb-1.5">
        {POSITION_FILTERS.map((tab) => {
          const pastel = tab.value === "ALL" ? "bg-gray-200 text-black" : positionClass(tab.value);
          const active = posTab === tab.value ? "ring-1 ring-black shadow-sm" : "opacity-80 hover:opacity-100";
          return (
            <Button
              key={tab.value}
              className={`shrink-0 px-1.5 py-1 text-[9px] ${pastel} ${active}`}
              onClick={() => onPosTabChange(tab.value)}
            >
              {tab.label}
            </Button>
          );
        })}
      </div>

      <div className="relative mb-1.5">
        <Input
          placeholder="Search by name / team"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="bg-white text-black pr-10"
        />
        {search && (
          <button
            type="button"
            className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg text-lg leading-none text-gray-500 hover:bg-gray-200 hover:text-gray-900"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            title="Clear search"
          >
            ×
          </button>
        )}
      </div>

      <ul className="space-y-1 flex-1 min-h-0 overflow-y-auto overscroll-contain pr-0.5">
        {players.map((player, index) => (
          <Fragment key={player.id}>
            {insertIndex === index && editMode && (
              <div className={`h-[3px] ${dark ? "bg-zinc-200" : "bg-gray-800"} rounded my-0.5`} />
            )}
            <PlayerRow
              player={player}
              positionIndex={positionRanks[player.id]}
              dark={dark}
              editMode={editMode}
              beingDragged={drag?.id === player.id}
              itemRefs={itemRefs}
              onPointerDown={(event) => onPlayerPointerDown(event, player.id, index)}
              onDraft={onDraft}
              onSelect={onSelect}
              onToggleStar={onToggleStar}
            />
          </Fragment>
        ))}
        {insertIndex === players.length && editMode && (
          <div className={`h-[3px] ${dark ? "bg-zinc-200" : "bg-gray-800"} rounded my-0.5`} />
        )}
        {players.length === 0 && <li className="text-xs opacity-70">No players match.</li>}
      </ul>
    </section>
  );
}
