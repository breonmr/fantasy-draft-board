import { targetRoundClass } from "../data/draftDefaults.js";

export function TargetRoundBadge({ round }) {
  if (!round) return null;

  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${targetRoundClass(round)}`}
      title={`Target round ${round}`}
    >
      {round}
    </span>
  );
}
