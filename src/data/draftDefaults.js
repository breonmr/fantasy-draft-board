export const STORAGE_KEY = "fantasy-draft-board-v10";
export const DARK_KEY = "fdb_dark";

export const DEFAULT_SETTINGS = {
  numTeams: 12,
  numRounds: 14,
  teamNames: Array.from({ length: 12 }, (_, index) => `Team ${index + 1}`),
  myTeam: null,
};

// A tiny starter list so the app renders first time. Replace via Import.
export const STARTERS = [
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

export const POSITION_FILTERS = [
  { value: "ALL", label: "ALL" },
  { value: "QB", label: "QB" },
  { value: "RB", label: "RB" },
  { value: "WR", label: "WR" },
  { value: "TE", label: "TE" },
  { value: "FLEX", label: "FLEX" },
  { value: "K", label: "K" },
  { value: "DEF", label: "DEF" },
];

export function positionClass(pos) {
  const normalizedPos = (pos || "").toUpperCase();
  if (normalizedPos === "WR") return "bg-blue-300 text-black";
  if (normalizedPos === "RB") return "bg-green-300 text-black";
  if (normalizedPos === "TE") return "bg-violet-300 text-black";
  if (normalizedPos === "QB") return "bg-pink-300 text-black";
  if (normalizedPos === "FLEX") return "bg-cyan-300 text-black";
  if (normalizedPos === "K") return "bg-yellow-300 text-black";
  return "bg-gray-300 text-black";
}

const TARGET_ROUND_CLASSES = {
  1: "bg-rose-500 text-white",
  2: "bg-orange-500 text-white",
  3: "bg-amber-400 text-amber-950",
  4: "bg-lime-400 text-lime-950",
  5: "bg-green-500 text-white",
  6: "bg-emerald-500 text-white",
  7: "bg-teal-500 text-white",
  8: "bg-cyan-500 text-cyan-950",
  9: "bg-sky-500 text-white",
  10: "bg-blue-500 text-white",
  11: "bg-indigo-500 text-white",
  12: "bg-violet-500 text-white",
  13: "bg-purple-500 text-white",
  14: "bg-fuchsia-500 text-white",
  15: "bg-pink-500 text-white",
  16: "bg-slate-600 text-white",
};

export function targetRoundClass(round) {
  return TARGET_ROUND_CLASSES[round] || "bg-slate-500 text-white";
}
