import QRCode from "qrcode";
import {
  MODES,
  normalizeErrorLevel,
  normalizeInput,
  normalizeMode,
  normalizeSize,
  summarizePayload
} from "./payload.js";
import { clearHistory, pushHistory, readHistory } from "./history.js";

const form=document.querySelector("#qr-form");
const modeInput=document.querySelector("#mode");
const sizeInput=document.querySelector("#size");
const levelInput=document.querySelector("#error-level");
const preview=document.querySelector("#qr-preview");
const status=document.querySelector("[data-status]");
const payloadOutput=document.querySelector("#payload-output");
const summaryOutput=document.querySelector("[data-summary]");
const historyList=document.querySelector("[data-history]");
const copyButton=document.querySelector("#copy-payload");
const downloadButton=document.querySelector("#download-png");
const clearHistoryButton=document.querySelector("#clear-history");
const modePanels=[...document.querySelectorAll("[data-mode-panel]")];

let lastDataUrl="";
let lastPayload="";
let history=readHistory();

function collectValues(){
  return {
    url:form.elements.url?.value,
    text:form.elements.text?.value,
    email:form.elements.email?.value,
    subject:form.elements.subject?.value,
    body:form.elements.body?.value,
    ssid:form.elements.ssid?.value,
    password:form.elements.password?.value,
    security:form.elements.security?.value,
    hidden:form.elements.hidden?.checked
  };
}

function announce(message){
  status.textContent="";
  requestAnimationFrame(()=>{ status.textContent=message; });
}

function renderMode(){
  const mode=normalizeMode(modeInput.value);
  modePanels.forEach((panel)=>{
    const active=panel.dataset.modePanel===mode;
    panel.hidden=!active;
    panel.querySelectorAll("input,textarea,select").forEach((field)=>{ field.disabled=!active; });
  });
}

function renderHistory(){
  historyList.replaceChildren();

  if(!history.length){
    const empty=document.createElement("p");
    empty.className="history-empty";
    empty.textContent="No locally saved QR payloads yet.";
    historyList.append(empty);
    clearHistoryButton.disabled=true;
    return;
  }

  clearHistoryButton.disabled=false;
  history.forEach((item)=>{
    const article=document.createElement("article");
    article.className="history-item";

    const copy=document.createElement("button");
    copy.type="button";
    copy.className="history-copy";
    copy.dataset.payload=item.payload;
    copy.textContent=item.summary || item.mode;

    const meta=document.createElement("span");
    meta.textContent=`${item.mode.toUpperCase()} · ${new Date(item.createdAt).toLocaleDateString()}`;

    article.append(copy,meta);
    historyList.append(article);
  });
}

async function generate(){
  const mode=normalizeMode(modeInput.value);
  const values=collectValues();
  const result=normalizeInput(mode,values);

  if(!result.valid){
    preview.replaceChildren();
    payloadOutput.textContent="—";
    summaryOutput.textContent=result.error;
    lastDataUrl="";
    lastPayload="";
    downloadButton.disabled=true;
    copyButton.disabled=true;
    announce(result.error);
    return;
  }

  const size=normalizeSize(sizeInput.value);
  const errorCorrectionLevel=normalizeErrorLevel(levelInput.value);

  try{
    const dataUrl=await QRCode.toDataURL(result.payload,{
      width:size,
      margin:2,
      errorCorrectionLevel,
      color:{dark:"#17201c",light:"#ffffff"}
    });

    const image=document.createElement("img");
    image.src=dataUrl;
    image.alt=`QR code for ${summarizePayload(mode,values) || mode}`;
    image.width=size;
    image.height=size;

    preview.replaceChildren(image);
    payloadOutput.textContent=result.payload;
    summaryOutput.textContent=`${mode.toUpperCase()} · ${size}px · error correction ${errorCorrectionLevel}`;
    lastDataUrl=dataUrl;
    lastPayload=result.payload;
    downloadButton.disabled=false;
    copyButton.disabled=false;

    history=pushHistory({
      mode,
      payload:result.payload,
      summary:summarizePayload(mode,values),
      createdAt:Date.now()
    });
    renderHistory();
    announce("QR code generated locally in your browser.");
  }catch{
    preview.replaceChildren();
    payloadOutput.textContent="—";
    summaryOutput.textContent="This payload could not be encoded.";
    lastDataUrl="";
    lastPayload="";
    downloadButton.disabled=true;
    copyButton.disabled=true;
    announce("QR generation failed.");
  }
}

form.addEventListener("submit",(event)=>{
  event.preventDefault();
  generate();
});

modeInput.addEventListener("change",()=>{
  renderMode();
  preview.replaceChildren();
  payloadOutput.textContent="—";
  summaryOutput.textContent="Choose values and generate a QR code.";
});

copyButton.addEventListener("click",async()=>{
  if(!lastPayload) return;
  try{
    await navigator.clipboard.writeText(lastPayload);
    announce("Payload copied.");
  }catch{
    announce("Clipboard access is unavailable.");
  }
});

downloadButton.addEventListener("click",()=>{
  if(!lastDataUrl) return;
  const anchor=document.createElement("a");
  anchor.href=lastDataUrl;
  anchor.download="qrforge-code.png";
  anchor.click();
  announce("PNG download started.");
});

historyList.addEventListener("click",async(event)=>{
  const button=event.target.closest("[data-payload]");
  if(!button) return;
  try{
    await navigator.clipboard.writeText(button.dataset.payload);
    announce("Saved payload copied.");
  }catch{
    announce("Clipboard access is unavailable.");
  }
});

clearHistoryButton.addEventListener("click",()=>{
  history=clearHistory();
  renderHistory();
  announce("Local QR history cleared.");
});

renderMode();
renderHistory();
