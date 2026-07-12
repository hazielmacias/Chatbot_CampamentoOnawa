import { fetchBotMessages, getMenuOptions } from "../lib/db.js";

// Sin cache: en Vercel serverless, cada funcion tiene su propia copia
// en memoria, asi que un cache local no se invalida entre el dashboard
// y el webhook. Fetch en cada llamada (query trivial, ~50ms).
export async function getConfig() {
  const messages = await fetchBotMessages();
  const menuOptions = await getMenuOptions();
  return { messages, menuOptions, loadedAt: new Date().toISOString() };
}

export function invalidate() {
  // No-op: no hay cache que invalidar
}

export function getCacheMeta() {
  return { loadedAt: new Date().toISOString(), noCache: true };
}