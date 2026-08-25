import { DARK_KEY, DEFAULT_SETTINGS, STARTERS, STORAGE_KEY } from "../data/draftDefaults.js";
import { parseImportLine } from "./parsers.js";
import { createPlayers } from "./players.js";

function defaultSettings() {
  return { ...DEFAULT_SETTINGS, teamNames: [...DEFAULT_SETTINGS.teamNames] };
}

export function createDefaultDraftState() {
  return {
    players: createPlayers(STARTERS.map(parseImportLine)),
    history: [],
    settings: defaultSettings(),
    adp: {},
    stats: {},
  };
}

export function loadDraftState(storage = localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("No saved state");
    const saved = JSON.parse(raw);
    if (Array.isArray(saved)) {
      return { players: saved, history: [], settings: defaultSettings(), adp: {}, stats: {} };
    }
    return {
      players: saved.players || [],
      history: saved.history || [],
      settings: { ...defaultSettings(), ...(saved.settings || {}) },
      adp: saved.adp || {},
      stats: saved.stats || {},
    };
  } catch {
    return createDefaultDraftState();
  }
}

export function saveDraftState(state, storage = localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore unavailable browser storage.
  }
}

export function loadDarkMode(storage = localStorage) {
  try {
    return storage.getItem(DARK_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveDarkMode(dark, storage = localStorage) {
  try {
    storage.setItem(DARK_KEY, dark ? "1" : "0");
  } catch {
    // Ignore unavailable browser storage.
  }
}
