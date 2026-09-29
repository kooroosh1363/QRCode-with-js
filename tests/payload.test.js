import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeErrorLevel,
  normalizeInput,
  normalizeMode,
  normalizeSize,
  summarizePayload
} from "../src/payload.js";
import { clearHistory, pushHistory, readHistory } from "../src/history.js";

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key)
  };
}

test("URL payloads normalize to HTTPS and reject unsupported protocols", () => {
  assert.equal(
    normalizeInput("url", { url: "example.com/path" }).payload,
    "https://example.com/path"
  );
  assert.equal(
    normalizeInput("url", { url: "ftp://example.com" }).valid,
    false
  );
});

test("text payload enforces non-empty bounded input", () => {
  assert.equal(normalizeInput("text", { text: " hello " }).payload, "hello");
  assert.equal(normalizeInput("text", { text: "" }).valid, false);
  assert.equal(normalizeInput("text", { text: "x".repeat(1201) }).valid, false);
});

test("email payload builds a mailto URI safely", () => {
  const result = normalizeInput("email", {
    email: "Person@Example.com",
    subject: "Hello world",
    body: "Line one"
  });

  assert.equal(result.valid, true);
  assert.match(result.payload, /^mailto:person@example\.com\?/);
  assert.match(result.payload, /subject=Hello\+world/);
});

test("Wi-Fi payload escapes reserved characters", () => {
  const result = normalizeInput("wifi", {
    ssid: "Cafe;Guest",
    password: "pass:word",
    security: "WPA",
    hidden: true
  });

  assert.equal(result.valid, true);
  assert.match(result.payload, /S:Cafe\\;Guest/);
  assert.match(result.payload, /P:pass\\:word/);
  assert.match(result.payload, /H:true/);
});

test("mode size and error level normalize safely", () => {
  assert.equal(normalizeMode("unknown"), "url");
  assert.equal(normalizeErrorLevel("Z"), "M");
  assert.equal(normalizeSize(10), 160);
  assert.equal(normalizeSize(900), 512);
});

test("payload summaries expose useful human-readable labels", () => {
  assert.equal(summarizePayload("url", { url: "https://docs.example.com/a" }), "docs.example.com");
  assert.equal(summarizePayload("wifi", { ssid: "Office", password: "12345678", security: "WPA" }), "Office");
});

test("history is bounded, deduplicated, and clearable", () => {
  const storage = memoryStorage();

  for (let i = 0; i < 8; i += 1) {
    pushHistory({ mode:"text", payload:`item-${i}`, summary:`Item ${i}`, createdAt:i + 1 }, storage);
  }

  assert.equal(readHistory(storage).length, 6);

  pushHistory({ mode:"text", payload:"item-7", summary:"Newest", createdAt:99 }, storage);
  const history = readHistory(storage);
  assert.equal(history[0].summary, "Newest");
  assert.equal(history.filter((item) => item.payload === "item-7").length, 1);

  clearHistory(storage);
  assert.deepEqual(readHistory(storage), []);
});
