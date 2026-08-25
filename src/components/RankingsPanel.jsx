import { Fragment } from "react";
import { POS_LIST, positionClass } from "../data/draftDefaults.js";
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
}) {
  return (
    <li
      data-id={player.id}
      ref={(element) =>
        element ? itemRefs.current.set(player.id, element) : itemRefs.current.delete(player.id)
      }
      className={`rounded-md border ${
        dark ? "border-zinc-600 bg-zinc-700" : "border-gray-300 bg-white"
      } flex items-center justify-between gap-2 p-1.5 ${
        editMode ? "cursor-grab" : "cursor-default"
      } select-none ${beingDragged ? "opacity-40" : ""}`}
      onPointerDown={onPointerDown}
      title={editMode ? "Drag to reorder" : "Click Draft to draft; click name for details"}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="w-6 text-[10px] opacity-70 tabular-nums">{(player.rank ?? 0) + 1}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${positionClass(player.pos)}`}>
          {player.pos ? `${player.pos}${positionIndex ?? ""}` : "POS"}
        </span>
        {!editMode ? (
          <>
            <button
              className="font-semibold text-[12px] hover:underline truncate"
              onClick={(event) => {
                event.stopPropagation();
                onSelect(player.id);
              }}
              title="Show details"
            >
              {player.name}
            </button>
            <span className="text-[11px] opacity-70 shrink-0">{player.team || ""}</span>
          </>
        ) : (
          <>
            <span className="font-semibold text-[12px] truncate">{player.name}</span>
            <span className="text-[11px] opacity-70 shrink-0">{player.team || ""}</span>
          </>
        )}
      </div>

      {!editMode && (
        <div className="shrink-0 flex items-center gap-2">
          {player.target > 0 && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-300 text-amber-900"
              title={`Target ${player.target}`}
            >
              ★ {player.target}
            </span>
          )}
          <Button
            className="bg-blue-900 text-white"
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
}) {
  return (
    <section className={`${dark ? "bg-zinc-700" : "bg-white"} rounded-2xl shadow p-3 md:col-span-2`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold">Overall Rankings</h2>
        <div className="flex items-center gap-2">
          {!editMode ? (
            <Button onClick={() => onEditModeChange(true)} className="bg-orange-300 text-black">
              Edit
            </Button>
          ) : (
            <>
              <Button onClick={onOpenImport} className="bg-orange-300 text-black">
                Import
              </Button>
              <Button onClick={() => onEditModeChange(false)} className="bg-blue-500 text-white">
                Done
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {POS_LIST.map((tab) => {
          const pastel = tab === "ALL" ? "bg-gray-200 text-black" : positionClass(tab);
          const active = posTab === tab ? "ring-2 ring-black" : "";
          return (
            <Button
              key={tab}
              className={`text-xs ${pastel} ${active}`}
              onClick={() => onPosTabChange(tab)}
            >
              {tab}
            </Button>
          );
        })}
      </div>

      <div className="mb-2">
        <Input
          placeholder="Search by name / team"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="bg-white text-black"
        />
      </div>

      <ul className="space-y-1.5 max-h-[80vh] overflow-auto pr-1">
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
