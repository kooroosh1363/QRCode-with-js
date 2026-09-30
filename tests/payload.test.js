import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeErrorLevel,
  normalizeInput,
  normalizeMode,
  normalizeSize,
  summarizePayload
} from "../src/payload.js";

test("URL payloads normalize to HTTPS and reject unsupported protocols", () => {
  assert.equal(normalizeInput("url", { url: "example.com/path" }).payload, "https://example.com/path");
  assert.equal(normalizeInput("url", { url: "ftp://example.com" }).valid, false);
});

test("URL payloads reject embedded credentials", () => {
  const result = normalizeInput("url", { url: "https://user:secret@example.com/private" });
  assert.equal(result.valid, false);
  assert.match(result.error, /embedded usernames or passwords/i);
});

test("text payloads preserve intentional whitespace while rejecting blank input", () => {
  assert.equal(normalizeInput("text", { text: "  hello  " }).payload, "  hello  ");
  assert.equal(normalizeInput("text", { text: "   " }).valid, false);
  assert.equal(normalizeInput("text", { text: "x".repeat(1201) }).valid, false);
});

test("email payloads preserve local-part case and normalize the domain", () => {
  const result = normalizeInput("email", {
    email: "Person.Name@Example.COM",
    subject: "Hello world",
    body: "Line one"
  });

  assert.equal(result.valid, true);
  assert.match(result.payload, /^mailto:Person\.Name@example\.com\?/);
  assert.match(result.payload, /subject=Hello\+world/);
});

test("email payloads reject oversized subject and body values instead of truncating", () => {
  assert.equal(normalizeInput("email", { email: "a@example.com", subject: "x".repeat(141) }).valid, false);
  assert.equal(normalizeInput("email", { email: "a@example.com", body: "x".repeat(601) }).valid, false);
});

test("Wi-Fi payloads escape reserved characters", () => {
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

test("WPA validates passphrases and 64-digit hexadecimal keys", () => {
  assert.equal(normalizeInput("wifi", { ssid: "Office", password: "12345678", security: "WPA" }).valid, true);
  assert.equal(normalizeInput("wifi", { ssid: "Office", password: "short", security: "WPA" }).valid, false);
  assert.equal(normalizeInput("wifi", { ssid: "Office", password: "a".repeat(64), security: "WPA" }).valid, true);
  assert.equal(normalizeInput("wifi", { ssid: "Office", password: "z".repeat(64), security: "WPA" }).valid, false);
});

test("WEP validates legacy ASCII and hexadecimal key lengths", () => {
  assert.equal(normalizeInput("wifi", { ssid: "Legacy", password: "abcde", security: "WEP" }).valid, true);
  assert.equal(normalizeInput("wifi", { ssid: "Legacy", password: "0123456789", security: "WEP" }).valid, true);
  assert.equal(normalizeInput("wifi", { ssid: "Legacy", password: "12345678", security: "WEP" }).valid, false);
});

test("open Wi-Fi payloads omit password fields", () => {
  const result = normalizeInput("wifi", {
    ssid: "Guest",
    password: "should-not-appear",
    security: "nopass"
  });

  assert.equal(result.valid, true);
  assert.doesNotMatch(result.payload, /;P:/);
});

test("Wi-Fi SSIDs enforce the 32-byte protocol boundary", () => {
  assert.equal(normalizeInput("wifi", { ssid: "a".repeat(32), password: "12345678", security: "WPA" }).valid, true);
  assert.equal(normalizeInput("wifi", { ssid: "😀".repeat(9), password: "12345678", security: "WPA" }).valid, false);
});

test("mode size and error-level inputs normalize safely", () => {
  assert.equal(normalizeMode("unknown"), "url");
  assert.equal(normalizeErrorLevel("Z"), "M");
  assert.equal(normalizeSize(10), 160);
  assert.equal(normalizeSize(900), 512);
});

test("payload summaries expose useful labels without changing payload semantics", () => {
  assert.equal(summarizePayload("url", { url: "https://docs.example.com/a" }), "docs.example.com");
  assert.equal(summarizePayload("email", { email: "Person@Example.com" }), "Person@example.com");
  assert.equal(summarizePayload("text", { text: "  line one\nline two  " }), "line one line two");
});
