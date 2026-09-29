const KEY="qrforge:history:v1";
const MAX_ITEMS=6;

export function readHistory(storage=globalThis.localStorage) {
  try {
    const parsed=JSON.parse(storage?.getItem(KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item)=>item && typeof item==="object" && typeof item.payload==="string").slice(0,MAX_ITEMS)
      : [];
  } catch {
    return [];
  }
}

export function pushHistory(entry, storage=globalThis.localStorage) {
  const next=[
    { ...entry, createdAt:Number(entry.createdAt)||Date.now() },
    ...readHistory(storage).filter((item)=>item.payload!==entry.payload)
  ].slice(0,MAX_ITEMS);

  try { storage?.setItem(KEY,JSON.stringify(next)); } catch {}
  return next;
}

export function clearHistory(storage=globalThis.localStorage) {
  try { storage?.removeItem(KEY); } catch {}
  return [];
}
