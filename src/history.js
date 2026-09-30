export const LEGACY_STORAGE_KEY = "qrforge:history:v1";
const MAX_ITEMS = 6;
const ALLOWED_MODES = new Set(["url", "text", "email", "wifi"]);
const MAX_PAYLOAD_LENGTH = 4096;
const MAX_SUMMARY_LENGTH = 80;

function normalizeHistoryItem(entry) {
  if (!entry || typeof entry !== "object") return null;

  const mode = String(entry.mode || "");
  const payload = String(entry.payload || "");
  const summary = String(entry.summary || "").slice(0, MAX_SUMMARY_LENGTH);
  const createdAt = Number(entry.createdAt);

  if (!ALLOWED_MODES.has(mode)) return null;
  if (!payload || payload.length > MAX_PAYLOAD_LENGTH) return null;
  if (!Number.isFinite(createdAt) || createdAt <= 0) return null;

  return { mode, payload, summary, createdAt };
}

export function sanitizeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeHistoryItem).filter(Boolean).slice(0, MAX_ITEMS);
}

export function appendHistory(history, entry) {
  const item = normalizeHistoryItem({ ...entry, createdAt: Number(entry?.createdAt) || Date.now() });
  const current = sanitizeHistory(history);
  if (!item) return current;

  return [item, ...current.filter((candidate) => candidate.payload !== item.payload)].slice(0, MAX_ITEMS);
}

export function clearHistory() {
  return [];
}

export function purgeLegacyHistory(storage) {
  try {
    const targetStorage = storage ?? globalThis.localStorage;
    targetStorage?.removeItem(LEGACY_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
