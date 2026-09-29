export const MODES = Object.freeze(["url", "text", "email", "wifi"]);
export const ERROR_LEVELS = Object.freeze(["L", "M", "Q", "H"]);

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

export function normalizeInput(mode, values = {}) {
  const currentMode = normalizeMode(mode);

  if (currentMode === "url") {
    const raw = String(values.url || "").trim();
    if (!raw) return { valid:false, error:"Enter a URL.", payload:"" };

    const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;

    try {
      const parsed = new URL(candidate);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return { valid:false, error:"Use an HTTP or HTTPS URL.", payload:"" };
      }
      return { valid:true, error:"", payload:parsed.toString() };
    } catch {
      return { valid:false, error:"Enter a valid URL.", payload:"" };
    }
  }

  if (currentMode === "text") {
    const text = String(values.text || "").trim();
    if (!text) return { valid:false, error:"Enter text to encode.", payload:"" };
    if (text.length > 1200) return { valid:false, error:"Text is too long for this demo.", payload:"" };
    return { valid:true, error:"", payload:text };
  }

  if (currentMode === "email") {
    const email = String(values.email || "").trim().toLowerCase();
    const subject = String(values.subject || "").trim().slice(0, 140);
    const body = String(values.body || "").trim().slice(0, 600);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { valid:false, error:"Enter a valid email address.", payload:"" };
    }

    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (body) params.set("body", body);

    return {
      valid:true,
      error:"",
      payload:`mailto:${email}${params.toString() ? `?${params.toString()}` : ""}`
    };
  }

  const ssid = String(values.ssid || "").trim();
  const password = String(values.password || "");
  const security = ["WPA", "WEP", "nopass"].includes(values.security) ? values.security : "WPA";
  const hidden = Boolean(values.hidden);

  if (!ssid) return { valid:false, error:"Enter a Wi-Fi network name.", payload:"" };
  if (security !== "nopass" && password.length < 8) {
    return { valid:false, error:"Wi-Fi passwords must be at least 8 characters in this demo.", payload:"" };
  }

  const escapeWifi = (value) => String(value).replace(/([\\;,:"])/g, "\\$1");

  return {
    valid:true,
    error:"",
    payload:`WIFI:T:${security};S:${escapeWifi(ssid)};P:${escapeWifi(password)};H:${hidden ? "true" : "false"};;`
  };
}

export function summarizePayload(mode, values = {}) {
  const result = normalizeInput(mode, values);
  if (!result.valid) return "";

  const normalized = normalizeMode(mode);
  if (normalized === "url") {
    try { return new URL(result.payload).hostname; } catch { return result.payload.slice(0, 48); }
  }
  if (normalized === "email") return String(values.email || "").trim().toLowerCase();
  if (normalized === "wifi") return String(values.ssid || "").trim();
  return result.payload.slice(0, 48);
}
