export const MODES = Object.freeze(["url", "text", "email", "wifi"]);
export const ERROR_LEVELS = Object.freeze(["L", "M", "Q", "H"]);
export const WIFI_SECURITY_TYPES = Object.freeze(["WPA", "WEP", "nopass"]);

const MAX_TEXT_LENGTH = 1200;
const MAX_EMAIL_SUBJECT_LENGTH = 140;
const MAX_EMAIL_BODY_LENGTH = 600;
const MAX_SSID_BYTES = 32;

export function normalizeMode(value) {
  return MODES.includes(value) ? value : "url";
}

export function normalizeErrorLevel(value) {
  return ERROR_LEVELS.includes(value) ? value : "M";
}

export function normalizeSize(value) {
  const number = Math.round(Number(value) || 256);
  return Math.min(512, Math.max(160, number));
}

function utf8Length(value) {
  return new TextEncoder().encode(String(value)).length;
}

function normalizeEmailAddress(value) {
  const raw = String(value || "").trim();
  const firstAt = raw.indexOf("@");
  const lastAt = raw.lastIndexOf("@");

  if (!raw || firstAt <= 0 || firstAt !== lastAt || /\s/.test(raw)) return null;

  const localPart = raw.slice(0, firstAt);
  const domain = raw.slice(firstAt + 1).toLowerCase();

  if (!domain || !domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) return null;
  if (localPart.length > 64 || raw.length > 254) return null;
  if (!/^[a-z0-9.-]+$/i.test(domain) || domain.includes("..")) return null;

  return `${localPart}@${domain}`;
}

function validateWifiPassword(security, password) {
  if (security === "nopass") return { valid: true, error: "" };

  if (security === "WPA") {
    const isHexPsk = /^[0-9a-f]{64}$/i.test(password);
    if (isHexPsk || (password.length >= 8 && password.length <= 63)) {
      return { valid: true, error: "" };
    }
    return {
      valid: false,
      error: "WPA/WPA2 passwords must be 8–63 characters or a 64-digit hexadecimal key."
    };
  }

  const isAsciiWep = password.length === 5 || password.length === 13;
  const isHexWep = /^(?:[0-9a-f]{10}|[0-9a-f]{26})$/i.test(password);
  if (isAsciiWep || isHexWep) return { valid: true, error: "" };

  return {
    valid: false,
    error: "WEP keys must be 5 or 13 characters, or 10 or 26 hexadecimal digits."
  };
}

function escapeWifi(value) {
  return String(value).replace(/([\\;,:"])/g, "\\$1");
}

export function normalizeInput(mode, values = {}) {
  const currentMode = normalizeMode(mode);

  if (currentMode === "url") {
    const raw = String(values.url || "").trim();
    if (!raw) return { valid: false, error: "Enter a URL.", payload: "" };

    const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;

    try {
      const parsed = new URL(candidate);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return { valid: false, error: "Use an HTTP or HTTPS URL.", payload: "" };
      }
      if (parsed.username || parsed.password) {
        return {
          valid: false,
          error: "URLs with embedded usernames or passwords are not supported.",
          payload: ""
        };
      }
      return { valid: true, error: "", payload: parsed.toString() };
    } catch {
      return { valid: false, error: "Enter a valid URL.", payload: "" };
    }
  }

  if (currentMode === "text") {
    const text = String(values.text || "");
    if (!text.trim()) return { valid: false, error: "Enter text to encode.", payload: "" };
    if (text.length > MAX_TEXT_LENGTH) {
      return { valid: false, error: "Text is too long for this demo.", payload: "" };
    }
    return { valid: true, error: "", payload: text };
  }

  if (currentMode === "email") {
    const email = normalizeEmailAddress(values.email);
    const subject = String(values.subject || "").trim();
    const body = String(values.body || "").trim();

    if (!email) return { valid: false, error: "Enter a valid email address.", payload: "" };
    if (subject.length > MAX_EMAIL_SUBJECT_LENGTH) {
      return { valid: false, error: "Email subjects are limited to 140 characters.", payload: "" };
    }
    if (body.length > MAX_EMAIL_BODY_LENGTH) {
      return { valid: false, error: "Email bodies are limited to 600 characters.", payload: "" };
    }

    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (body) params.set("body", body);

    return {
      valid: true,
      error: "",
      payload: `mailto:${email}${params.toString() ? `?${params.toString()}` : ""}`
    };
  }

  const ssid = String(values.ssid || "");
  const password = String(values.password || "");
  const security = String(values.security || "WPA");
  const hidden = Boolean(values.hidden);

  if (!WIFI_SECURITY_TYPES.includes(security)) {
    return { valid: false, error: "Choose a supported Wi-Fi security type.", payload: "" };
  }
  if (!ssid || utf8Length(ssid) > MAX_SSID_BYTES) {
    return { valid: false, error: "Wi-Fi network names must be 1–32 UTF-8 bytes.", payload: "" };
  }

  const passwordValidation = validateWifiPassword(security, password);
  if (!passwordValidation.valid) {
    return { valid: false, error: passwordValidation.error, payload: "" };
  }

  const fields = [`WIFI:T:${security}`, `S:${escapeWifi(ssid)}`];
  if (security !== "nopass") fields.push(`P:${escapeWifi(password)}`);
  fields.push(`H:${hidden ? "true" : "false"}`);

  return {
    valid: true,
    error: "",
    payload: `${fields.join(";")};;`
  };
}

export function summarizePayload(mode, values = {}) {
  const result = normalizeInput(mode, values);
  if (!result.valid) return "";

  const normalized = normalizeMode(mode);
  if (normalized === "url") {
    try {
      return new URL(result.payload).hostname;
    } catch {
      return result.payload.slice(0, 48);
    }
  }
  if (normalized === "email") return result.payload.slice(7).split("?")[0];
  if (normalized === "wifi") return String(values.ssid || "");
  return result.payload.replace(/\s+/g, " ").trim().slice(0, 48);
}
