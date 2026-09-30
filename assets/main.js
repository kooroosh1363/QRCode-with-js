import QRCode from "qrcode";
import {
  normalizeErrorLevel,
  normalizeInput,
  normalizeMode,
  normalizeSize,
  summarizePayload
} from "../src/payload.js";
import { appendHistory, clearHistory, purgeLegacyHistory } from "../src/history.js";

const form = document.querySelector("#qr-form");
const modeInput = document.querySelector("#mode");
const sizeInput = document.querySelector("#size");
const levelInput = document.querySelector("#error-level");
const preview = document.querySelector("#qr-preview");
const status = document.querySelector("[data-status]");
const payloadOutput = document.querySelector("#payload-output");
const summaryOutput = document.querySelector("[data-summary]");
const historyList = document.querySelector("[data-history]");
const copyButton = document.querySelector("#copy-payload");
const downloadButton = document.querySelector("#download-png");
const clearHistoryButton = document.querySelector("#clear-history");
const modePanels = [...document.querySelectorAll("[data-mode-panel]")];
const wifiPassword = form.elements.password;
const wifiSecurity = form.elements.security;

let lastDataUrl = "";
let lastPayload = "";
let history = [];
let generationVersion = 0;

purgeLegacyHistory();

function collectValues() {
  return {
    url: form.elements.url?.value,
    text: form.elements.text?.value,
    email: form.elements.email?.value,
    subject: form.elements.subject?.value,
    body: form.elements.body?.value,
    ssid: form.elements.ssid?.value,
    password: form.elements.password?.value,
    security: form.elements.security?.value,
    hidden: form.elements.hidden?.checked
  };
}

function announce(message) {
  status.textContent = "";
  requestAnimationFrame(() => {
    status.textContent = message;
  });
}

function resetPreview(message = "Choose values and generate a QR code.") {
  const placeholder = document.createElement("p");
  placeholder.textContent = "Generate a payload to render a QR code.";
  preview.replaceChildren(placeholder);
  preview.setAttribute("aria-busy", "false");
  payloadOutput.textContent = "—";
  summaryOutput.textContent = message;
  lastDataUrl = "";
  lastPayload = "";
  downloadButton.disabled = true;
  copyButton.disabled = true;
}

function invalidateGeneratedState(message = "Values changed. Generate again to update the QR code.") {
  generationVersion += 1;
  if (lastPayload || preview.getAttribute("aria-busy") === "true") resetPreview(message);
}

function renderMode() {
  const mode = normalizeMode(modeInput.value);
  modePanels.forEach((panel) => {
    const active = panel.dataset.modePanel === mode;
    panel.hidden = !active;
    panel.querySelectorAll("input,textarea,select").forEach((field) => {
      field.disabled = !active;
    });
  });
  syncWifiPasswordState();
}

function syncWifiPasswordState() {
  if (normalizeMode(modeInput.value) !== "wifi") return;
  const isOpen = wifiSecurity.value === "nopass";
  wifiPassword.disabled = isOpen;
  if (isOpen) wifiPassword.value = "";
}

function renderHistory() {
  historyList.replaceChildren();

  if (!history.length) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "No QR codes generated in this tab yet.";
    historyList.append(empty);
    clearHistoryButton.disabled = true;
    return;
  }

  clearHistoryButton.disabled = false;
  history.forEach((item) => {
    const article = document.createElement("article");
    article.className = "history-item";

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "history-copy";
    copy.dataset.payload = item.payload;
    copy.textContent = item.summary || item.mode;
    copy.setAttribute("aria-label", `Copy ${item.mode} payload: ${item.summary || "generated item"}`);

    const meta = document.createElement("span");
    meta.textContent = `${item.mode.toUpperCase()} · ${new Date(item.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })}`;

    article.append(copy, meta);
    historyList.append(article);
  });
}

async function generate() {
  const requestId = ++generationVersion;
  const mode = normalizeMode(modeInput.value);
  const values = collectValues();
  const result = normalizeInput(mode, values);

  if (!result.valid) {
    resetPreview(result.error);
    announce(result.error);
    return;
  }

  const size = normalizeSize(sizeInput.value);
  const errorCorrectionLevel = normalizeErrorLevel(levelInput.value);
  preview.setAttribute("aria-busy", "true");
  summaryOutput.textContent = "Generating QR code…";

  try {
    const dataUrl = await QRCode.toDataURL(result.payload, {
      width: size,
      margin: 2,
      errorCorrectionLevel,
      color: { dark: "#17201c", light: "#ffffff" }
    });

    if (requestId !== generationVersion) return;

    const image = document.createElement("img");
    image.src = dataUrl;
    image.alt = `QR code for ${summarizePayload(mode, values) || mode}`;
    image.width = size;
    image.height = size;

    preview.replaceChildren(image);
    preview.setAttribute("aria-busy", "false");
    payloadOutput.textContent = result.payload;
    summaryOutput.textContent = `${mode.toUpperCase()} · ${size}px · error correction ${errorCorrectionLevel}`;
    lastDataUrl = dataUrl;
    lastPayload = result.payload;
    downloadButton.disabled = false;
    copyButton.disabled = false;

    history = appendHistory(history, {
      mode,
      payload: result.payload,
      summary: summarizePayload(mode, values),
      createdAt: Date.now()
    });
    renderHistory();
    announce("QR code generated locally in your browser.");
  } catch {
    if (requestId !== generationVersion) return;
    resetPreview("This payload could not be encoded at the selected settings.");
    announce("QR generation failed.");
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  generate();
});

form.addEventListener("input", (event) => {
  if (event.target === modeInput) return;
  invalidateGeneratedState();
});

form.addEventListener("change", (event) => {
  if (event.target === modeInput) {
    generationVersion += 1;
    renderMode();
    resetPreview();
    return;
  }

  if (event.target === wifiSecurity) syncWifiPasswordState();
  invalidateGeneratedState();
});

copyButton.addEventListener("click", async () => {
  if (!lastPayload) return;
  try {
    await navigator.clipboard.writeText(lastPayload);
    announce("Payload copied.");
  } catch {
    announce("Clipboard access is unavailable in this browser context.");
  }
});

downloadButton.addEventListener("click", () => {
  if (!lastDataUrl) return;
  const anchor = document.createElement("a");
  anchor.href = lastDataUrl;
  anchor.download = "qrforge-code.png";
  anchor.click();
  announce("PNG download started.");
});

historyList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-payload]");
  if (!button) return;
  try {
    await navigator.clipboard.writeText(button.dataset.payload);
    announce("Session payload copied.");
  } catch {
    announce("Clipboard access is unavailable in this browser context.");
  }
});

clearHistoryButton.addEventListener("click", () => {
  history = clearHistory();
  renderHistory();
  announce("Session QR history cleared.");
});

renderMode();
renderHistory();
resetPreview();
