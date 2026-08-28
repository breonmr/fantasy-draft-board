import { Fragment } from "react";
import { POSITION_FILTERS, positionClass } from "../data/draftDefaults.js";
import { TargetRoundBadge } from "./TargetRoundBadge.jsx";
import { Button, Input } from "./ui.jsx";

const FILTER_SEGMENT_WIDTHS = {
  ALL: "flex-[1.1_1_0%]",
  QB: "flex-[0.8_1_0%]",
  RB: "flex-[0.8_1_0%]",
  WR: "flex-[0.9_1_0%]",
  TE: "flex-[0.9_1_0%]",
  FLEX: "flex-[1.6_1_0%]",
  K: "flex-[0.6_1_0%]",
  DEF: "flex-[1.15_1_0%]",
};

function PlayerRow({
  player,
  positionIndex,
  dark,
  editMode,
  beingDragged,
  itemRefs,
  onPointerDown,
  onDraft,
  onToggleStar,
  onTargetRoundChange,
  onTierChange,
}) {
  const changeTargetRound = (event, nextRound) => {
    event.preventDefault();
    event.stopPropagation();
    onTargetRoundChange(player.id, nextRound);
  };

  const changeTier = (event, nextTier) => {
    event.preventDefault();
    event.stopPropagation();
    onTierChange(player.id, nextTier);
  };

  return (
    <li
      data-id={player.id}
      ref={(element) =>
        element ? itemRefs.current.set(player.id, element) : itemRefs.current.delete(player.id)
      }
      className={`rounded-md border ${
        dark ? "border-zinc-600 bg-zinc-700" : "border-gray-300 bg-white"
      } flex items-center justify-between gap-1.5 px-1.5 py-1.5 ${
        editMode ? "cursor-grab" : "hover:border-blue-400 hover:shadow-sm"
      } select-none ${beingDragged ? "opacity-40" : ""}`}
      onPointerDown={onPointerDown}
      title={editMode ? "Drag to reorder" : "Draft, favorite, or set a target round in Edit mode"}
    >
      <span data-overall-rank={player.id} className="w-5 shrink-0 text-right text-[9px] font-medium opacity-60 tabular-nums">{(player.rank ?? 0) + 1}</span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {!editMode ? (
          <div className="min-w-0 flex-1">
            <span className="block w-full text-left font-semibold text-[12px] truncate">{player.name}</span>
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
      </div>

      {!editMode && (
        <div className="shrink-0 flex items-center gap-1">
          {player.targetRound ? (
            <TargetRoundBadge round={player.targetRound} />
          ) : (
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
      {editMode && (
        <div className="flex shrink-0 items-center gap-1" onPointerDown={(event) => event.stopPropagation()}>
          <div className="grid w-[66px] grid-cols-[20px_22px_20px] items-center gap-0.5" aria-label={`${player.name} tier controls`}>
            <button
              type="button"
              className="h-5 w-5 rounded bg-slate-500 text-xs leading-none hover:bg-slate-400 disabled:opacity-35"
              onClick={(event) => changeTier(event, player.tier ? player.tier - 1 : null)}
              disabled={!player.tier || player.tier <= 1}
              aria-label={`Decrease ${player.name} tier`}
              title="Decrease tier"
            >
              −
            </button>
            <button
              type="button"
              className="h-5 min-w-0 rounded bg-slate-600 px-0.5 text-[9px] font-semibold tabular-nums text-white hover:bg-slate-500 disabled:opacity-55"
              onClick={(event) => changeTier(event, player.tier ? null : 1)}
              aria-label={player.tier ? `Clear ${player.name} tier` : `Set ${player.name} tier 1`}
              title={player.tier ? "Clear tier" : "Set tier 1"}
            >
              {player.tier ? `T${player.tier}` : "T—"}
            </button>
            <button
              type="button"
              className="h-5 w-5 rounded bg-slate-500 text-xs leading-none hover:bg-slate-400"
              onClick={(event) => changeTier(event, (player.tier || 0) + 1)}
              aria-label={`Increase ${player.name} tier`}
              title="Increase tier"
            >
              +
            </button>
          </div>
          <div className="grid w-[86px] grid-cols-4 items-center gap-0.5" aria-label={`${player.name} target round controls`}>
            <button
              type="button"
              className={`h-5 w-5 rounded text-[11px] leading-none opacity-65 hover:bg-rose-500 hover:text-white ${player.targetRound ? "" : "invisible"}`}
              onClick={(event) => changeTargetRound(event, null)}
              aria-label={`Clear ${player.name} target round`}
              title="Clear target round"
              tabIndex={player.targetRound ? 0 : -1}
            >
              ×
            </button>
            <button
              type="button"
              className="h-5 w-5 rounded bg-zinc-500 text-xs leading-none hover:bg-zinc-400 disabled:opacity-35"
              onClick={(event) => changeTargetRound(event, player.targetRound ? player.targetRound - 1 : null)}
              disabled={!player.targetRound || player.targetRound <= 1}
              aria-label={`Decrease ${player.name} target round`}
              title="Decrease target round"
              data-target-control="decrease"
            >
              −
            </button>
            <span className="flex h-5 w-5 items-center justify-center">
              <TargetRoundBadge round={player.targetRound} />
            </span>
            <button
              type="button"
              className="h-5 w-5 rounded bg-zinc-500 text-xs leading-none hover:bg-zinc-400 disabled:opacity-35"
              onClick={(event) => changeTargetRound(event, Math.min(16, (player.targetRound || 0) + 1))}
              disabled={player.targetRound >= 16}
              aria-label={`Increase ${player.name} target round`}
              title="Increase target round"
              data-target-control="increase"
            >
              +
            </button>
          </div>
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
  onToggleStar,
  onTargetRoundChange,
  onTierChange,
}) {
  return (
    <section
      className={`${dark ? "bg-zinc-700" : "bg-white"} rounded-2xl shadow p-2 flex flex-col min-h-0 md:h-full md:overflow-hidden`}
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

      <div className="flex w-full overflow-hidden rounded-xl border border-slate-600 bg-slate-800 mb-1.5" aria-label="Position filters">
        {POSITION_FILTERS.map((tab, index) => {
          const active = posTab === tab.value;
          return (
            <Button
              key={tab.value}
              className={`min-w-0 ${FILTER_SEGMENT_WIDTHS[tab.label]} flex h-8 items-center justify-center rounded-none px-1 py-0 shadow-none text-[10px] font-medium leading-none ${
                index < POSITION_FILTERS.length - 1 ? "border-r border-slate-600" : ""
              } ${active ? "bg-teal-400 text-slate-950" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}`}
              style={{ paddingInline: "4px", paddingBlock: 0 }}
              onClick={() => onPosTabChange(tab.value)}
            >
              <span className="whitespace-nowrap font-medium leading-none">{tab.label}</span>
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
            {player.tier && player.tier !== players[index - 1]?.tier && (
              <li
                data-tier-divider={player.tier}
                className={`rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-600 ${dark ? "bg-slate-800 text-slate-300" : ""}`}
              >
                Tier {player.tier}
              </li>
            )}
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
              onToggleStar={onToggleStar}
              onTargetRoundChange={onTargetRoundChange}
              onTierChange={onTierChange}
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
