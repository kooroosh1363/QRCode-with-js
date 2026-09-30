import test from "node:test";
import assert from "node:assert/strict";
import {
  LEGACY_STORAGE_KEY,
  appendHistory,
  clearHistory,
  purgeLegacyHistory,
  sanitizeHistory
} from "../src/history.js";

test("session history is bounded and deduplicated", () => {
  let history = [];
  for (let i = 0; i < 8; i += 1) {
    history = appendHistory(history, { mode: "text", payload: `item-${i}`, summary: `Item ${i}`, createdAt: i + 1 });
  }

  assert.equal(history.length, 6);
  history = appendHistory(history, { mode: "text", payload: "item-7", summary: "Newest", createdAt: 99 });
  assert.equal(history[0].summary, "Newest");
  assert.equal(history.filter((item) => item.payload === "item-7").length, 1);
  assert.deepEqual(clearHistory(), []);
});

test("session history rejects malformed entries", () => {
  const history = sanitizeHistory([
    null,
    { mode: "unknown", payload: "bad", createdAt: 1 },
    { mode: "url", payload: "https://example.com", summary: "Example", createdAt: 2 }
  ]);

  assert.deepEqual(history, [
    { mode: "url", payload: "https://example.com", summary: "Example", createdAt: 2 }
  ]);
});

test("legacy localStorage history is purged without writing new payload data", () => {
  const removed = [];
  const storage = { removeItem: (key) => removed.push(key) };

  assert.equal(purgeLegacyHistory(storage), true);
  assert.deepEqual(removed, [LEGACY_STORAGE_KEY]);
});
