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

export const POS_LIST = ["ALL", "RB", "WR", "QB", "TE", "K", "DST"];

export function positionClass(pos) {
  const normalizedPos = (pos || "").toUpperCase();
  if (normalizedPos === "WR") return "bg-blue-300 text-black";
  if (normalizedPos === "RB") return "bg-green-300 text-black";
  if (normalizedPos === "TE") return "bg-orange-300 text-black";
  if (normalizedPos === "QB") return "bg-pink-300 text-black";
  return "bg-gray-300 text-black";
}
