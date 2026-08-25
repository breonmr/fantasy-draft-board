import { positionClass } from "../data/draftDefaults.js";

export function DragOverlay({ drag, player }) {
  if (!drag || !player) return null;

  return (
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
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${positionClass(player.pos)}`}>
            {player.pos || "POS"}
          </span>
          <span className="font-semibold text-[12px]">{player.name}</span>
          <span className="text-[11px] opacity-70">{player.team || ""}</span>
        </div>
      </div>
    </div>
  );
}
