import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oqhoebtjqvbgwhdxszmk.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xaG9lYnRqcXZiZ3doZHhzem1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MDIxMDQsImV4cCI6MjA5NjM3ODEwNH0.nb-jzuCTV4p-G7LccFnUoZNkyaOHmLExT7inoISKfJY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CONFIG_PHONE = '__bot_config__';

function toCamel(obj) {
  if (!obj) return obj;
  const out = {};
  for (const key of Object.keys(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = obj[key];
  }
  return out;
}


function loadDefaultMessages() {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, '../bot/messages.default.json'),
    resolve(here, 'messages.default.json'),
    resolve(process.cwd(), 'src/bot/messages.default.json')
  ];
  for (const p of candidates) {
    try { return JSON.parse(readFileSync(p, 'utf8')); } catch (_) {}
  }
  throw new Error('messages.default.json no encontrado');
}

const KEYWORDS_REGEX = /keywords?:\s*([^\n.]+)/i;

function extractKeywordsFromDescription(description) {
  if (!description || typeof description !== 'string') return [];
  const match = description.match(KEYWORDS_REGEX);
  if (!match) return [];
  return match[1]
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

async function backfillKeywordsIfNeeded(messages) {
  let dirty = false;
  for (const [key, msg] of Object.entries(messages)) {
    if (!Array.isArray(msg.keywords) || msg.keywords.length === 0) {
      const extracted = extractKeywordsFromDescription(msg.description);
      if (extracted.length > 0) {
        msg.keywords = extracted;
        dirty = true;
      } else if (!Array.isArray(msg.keywords)) {
        msg.keywords = [];
        dirty = true;
      }
    }
  }
  if (dirty) {
    try {
      await saveBotMessages(messages);
    } catch (e) {
      console.error('backfill keywords error:', e.message);
    }
  }
  return messages;
}

export async function getOrCreateContact(phone, name = null) {
  const { data: existing, error: findErr } = await supabase
    .from('onawa_contacts')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (findErr) throw findErr;

  if (existing) {
    const c = toCamel(existing);
    if (name && !c.name) {
      const { data, error } = await supabase
        .from('onawa_contacts')
        .update({ name })
        .eq('id', c.id)
        .select()
        .single();
      if (error) throw error;
      return toCamel(data);
    }
    return c;
  }

  const { data, error } = await supabase
    .from('onawa_contacts')
    .insert({ phone, name })
    .select()
    .single();

  if (error) throw error;
  return toCamel(data);
}

export async function saveMessage(phone, direction, content, messageType = 'text') {
  const contact = await getOrCreateContact(phone);
  const { data, error } = await supabase
    .from('onawa_messages')
    .insert({
      contact_id: contact.id,
      direction,
      content,
      message_type: messageType
    })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('onawa_contacts')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', contact.id);

  return toCamel(data);
}

export async function getAllContacts() {
  const { data, error } = await supabase
    .from('onawa_contacts')
    .select('*, onawa_messages(*)')
    .order('last_message_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(c => {
    const camel = toCamel(c);
    camel.messages = (c.onawa_messages || [])
      .map(toCamel)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return camel;
  });
}

export async function getContact(phone) {
  const { data, error } = await supabase
    .from('onawa_contacts')
    .select('*, onawa_messages(*)')
    .eq('phone', phone)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const camel = toCamel(data);
  camel.messages = (data.onawa_messages || [])
    .map(toCamel)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return camel;
}

export async function markEscalated(phone, reason = 'Interest detected', advisorPhone = null) {
  const { data, error } = await supabase
    .from('onawa_contacts')
    .update({
      is_escalated: true,
      is_interested: true,
      status: 'escalated'
    })
    .eq('phone', phone)
    .select()
    .single();

  if (error) throw error;

  if (data) {
    await supabase.from('onawa_escalations').insert({
      contact_id: data.id,
      reason,
      advisor_notified: !!advisorPhone,
      advisor_phone: advisorPhone
    });
  }

  return toCamel(data);
}

// ============================================================
// Config del bot: almacenada en onawa_contacts como JSON en `name`
// del contacto fantasma CONFIG_PHONE. Asi nos saltamos PostgREST
// schema cache (que no afecta a tablas ya existentes) y Storage RLS.
// ============================================================

async function readConfigRow() {
  const { data, error } = await supabase
    .from('onawa_contacts')
    .select('id, name, updated_at')
    .eq('phone', CONFIG_PHONE)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchBotMessages() {
  const row = await readConfigRow();
  if (row && row.name) {
    try {
      const parsed = JSON.parse(row.name);
      // Una sola migración que hace todo: menuOptions, bienvenida/no_entendido, keywords
      const migrated = await migrateMenuConfig(parsed);
      return await backfillKeywordsIfNeeded(migrated);
    } catch (e) {
      return loadDefaultMessages();
    }
  }
  // Primera vez: sembrar con defaults
  const defaults = loadDefaultMessages();
  await saveBotMessages(defaults);
  const seeded = await migrateMenuConfig(defaults);
  return await backfillKeywordsIfNeeded(seeded);
}

export async function saveBotMessages(messages) {
  const body = JSON.stringify(messages);
  const existing = await readConfigRow();
  if (existing) {
    const { error } = await supabase
      .from('onawa_contacts')
      .update({ name: body, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('onawa_contacts')
      .insert({ phone: CONFIG_PHONE, name: body });
    if (error) throw error;
  }
  return { ok: true };
}

// ============================================================
// Menú principal: lista de opciones que se muestra al cliente.
// Se almacena en el mismo JSON de configuración, bajo la clave
// "menuOptions". Una sola migración la primera vez reescribe
// bienvenida/no_entendido al formato {{MENU}} y sincroniza los
// keywords de cada opción con su número y título.
// ============================================================

function numberEmoji(n) {
  return n + '️⃣';
}

export function getDefaultMenuOptions() {
  const defaults = loadDefaultMessages();
  return Array.isArray(defaults.menuOptions) ? defaults.menuOptions : [];
}

function parseMenuFromBienvenida(text) {
  if (!text || typeof text !== 'string') return null;
  const re = /^\s*(\d+)\S*\s*\*?([^*\n]+?)\*?\s*$/gm;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const number = parseInt(m[1], 10);
    const title = m[2].trim();
    if (number > 0 && number < 100 && title && title.length < 80) {
      out.push({ number, emoji: numberEmoji(number), title, messageKey: null });
    }
  }
  return out.length > 0 ? out : null;
}

// Una sola pasada: agrega menuOptions si falta, reescribe
// bienvenida/no_entendido al formato {{MENU}} y sincroniza los
// keywords de cada opción con su número y título.
async function migrateMenuConfig(messages) {
  if (!messages || typeof messages !== 'object') return messages;

  // 1) menuOptions — siempre sincronizar con los defaults para reflejar cambios de orden/título/emoji
  const defaults = getDefaultMenuOptions();
  if (defaults.length > 0) {
    messages.menuOptions = JSON.parse(JSON.stringify(defaults));
  }

  // 2) bienvenida / no_entendido al formato {{MENU}}
  for (const key of ['bienvenida', 'no_entendido']) {
    const m = messages[key];
    if (!m) continue;
    const c = String(m.content || '');
    if (c.includes('{{MENU}}')) continue;
    m.content = key === 'bienvenida'
      ? '¡Hola! 👋 Bienvenido a *Campamento Onawa* 🌲\nSoy tu asistente virtual y estoy aquí para ayudarte.\n\n{{MENU}}\n\n💡 Escribe el número de la opción'
      : '🤔 No identifiqué tu pregunta, pero puedo ayudarte con esto:\n\n{{MENU}}\n\n💡 Escribe el número de la opción';
  }

  // 3) Sincronizar keywords de las opciones del menú
  const menuOptions = messages.menuOptions || [];
  for (const opt of menuOptions) {
    if (!opt || !opt.messageKey) continue;
    const msg = messages[opt.messageKey];
    if (!msg) continue;
    const n = Number(opt.number);
    const kws = Array.isArray(msg.keywords) ? [...msg.keywords] : [];
    const before = kws.length;
    if (n > 0) {
      if (!kws.includes(String(n))) kws.push(String(n));
      if (!kws.includes(numberEmoji(n))) kws.push(numberEmoji(n));
    }
    const titleLower = String(opt.title || '').toLowerCase().trim();
    if (titleLower && !kws.includes(titleLower)) {
      kws.push(titleLower);
      const sinAcentos = titleLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (sinAcentos !== titleLower && !kws.includes(sinAcentos)) {
        kws.push(sinAcentos);
      }
    }
    if (kws.length !== before) msg.keywords = kws;
  }

  // 4) Guardar una sola vez al final
  try { await saveBotMessages(messages); } catch (e) { /* silencioso */ }
  return messages;
}

function normalizeMenuOption(opt) {
  const number = Number(opt.number) || 0;
  const title = String(opt.title || '').trim();
  const emoji = String(opt.emoji || numberEmoji(number)).trim() || numberEmoji(number);
  const messageKey = String(opt.messageKey || '').trim() || null;
  return { number, title, emoji, messageKey };
}

export async function getMenuOptions() {
  const messages = await fetchBotMessages();
  const list = Array.isArray(messages.menuOptions) ? messages.menuOptions : [];
  return list.map(normalizeMenuOption);
}

export async function saveMenuOptions(options) {
  if (!Array.isArray(options)) throw new Error('menuOptions debe ser un arreglo');
  const cleaned = options
    .map(normalizeMenuOption)
    .filter(o => o.number > 0 && o.title)
    .sort((a, b) => a.number - b.number);
  const messages = await fetchBotMessages();
  messages.menuOptions = cleaned;
  await saveBotMessages(messages);
  return cleaned;
}

export function slugifyKey(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 40) || 'opcion';
}

export function buildMenuText(menuOptions, opts = {}) {
  const list = Array.isArray(menuOptions) ? menuOptions : [];
  if (list.length === 0) return '(sin opciones configuradas)';
  const header = opts.header || '¿Qué te gustaría conocer?';
  const lines = list
    .slice()
    .sort((a, b) => a.number - b.number)
    .map(o => `${o.number}. ${o.emoji || o.number + '️⃣'} *${o.title}*`);
  return `*${header}*\n${lines.join('\n')}`;
}

export function renderTemplate(text, menuOptions) {
  if (!text || typeof text !== 'string') return text;
  if (!text.includes('{{MENU}}')) return text;
  return text.replace(/\{\{MENU\}\}/g, buildMenuText(menuOptions));
}

export async function upsertMessage({ key, title, content, description, sortOrder, keywords }) {
  const messages = await fetchBotMessages();
  const existing = messages[key];
  messages[key] = {
    key,
    title,
    content,
    description: description ?? existing?.description ?? '',
    sortOrder: sortOrder ?? existing?.sortOrder ?? 0,
    keywords: Array.isArray(keywords)
      ? keywords
      : (existing?.keywords ?? [])
  };
  await saveBotMessages(messages);
  return messages[key];
}

export class DuplicateKeyError extends Error {
  constructor(key) {
    super(`Ya existe un mensaje con la key "${key}"`);
    this.code = 'DUPLICATE_KEY';
    this.key = key;
  }
}

export class ProtectedKeyError extends Error {
  constructor(key) {
    super(`La key "${key}" está protegida y no se puede eliminar`);
    this.code = 'PROTECTED_KEY';
    this.key = key;
  }
}

export class MessageNotFoundError extends Error {
  constructor(key) {
    super(`No existe un mensaje con la key "${key}"`);
    this.code = 'NOT_FOUND';
    this.key = key;
  }
}

export const PROTECTED_KEYS = new Set(['bienvenida', 'footer', 'no_entendido']);

export async function createMessage({ key, title, content, description, sortOrder, keywords }) {
  const messages = await fetchBotMessages();
  if (messages[key]) throw new DuplicateKeyError(key);
  messages[key] = {
    key,
    title,
    content,
    description: description ?? '',
    sortOrder: sortOrder ?? 99,
    keywords: Array.isArray(keywords) ? keywords : []
  };
  await saveBotMessages(messages);
  return messages[key];
}

export async function deleteMessage(key) {
  if (PROTECTED_KEYS.has(key)) throw new ProtectedKeyError(key);
  const messages = await fetchBotMessages();
  if (!messages[key]) throw new MessageNotFoundError(key);
  delete messages[key];
  await saveBotMessages(messages);
  return { ok: true, deletedKey: key };
}

export default {
  getOrCreateContact,
  saveMessage,
  getAllContacts,
  getContact,
  markEscalated,
  fetchBotMessages,
  saveBotMessages,
  upsertMessage,
  createMessage,
  deleteMessage,
  getMenuOptions,
  saveMenuOptions,
  getDefaultMenuOptions,
  slugifyKey,
  buildMenuText,
  renderTemplate,
  PROTECTED_KEYS
};