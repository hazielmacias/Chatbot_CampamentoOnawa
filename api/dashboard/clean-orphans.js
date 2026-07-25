import {
  fetchBotMessages,
  saveBotMessages
} from '../../src/lib/db.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

function loadDefaults() {
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  try {
    const messages = await fetchBotMessages();
    const defaults = loadDefaults();

    const menuKeys = new Set((messages.menuOptions || []).map(o => o.messageKey).filter(Boolean));
    const defaultKeys = new Set(Object.keys(defaults).filter(k => k !== 'menuOptions' && k !== 'footer'));
    const protectedKeys = new Set(['menuOptions', 'footer', 'bienvenida', 'no_entendido']);

    const removed = [];
    for (const key of Object.keys(messages)) {
      if (protectedKeys.has(key)) continue;
      // Mantener si está en el menú o en los defaults
      if (menuKeys.has(key) || defaultKeys.has(key)) continue;
      // Si no está en ninguno, es huérfano → eliminar
      delete messages[key];
      removed.push(key);
    }

    if (removed.length > 0) {
      await saveBotMessages(messages);
    }

    return res.status(200).json({
      ok: true,
      removed,
      message: removed.length > 0
        ? `${removed.length} mensajes huérfanos eliminados`
        : 'No hay mensajes huérfanos'
    });
  } catch (error) {
    console.error('clean-orphans error:', error);
    return res.status(500).json({ error: 'Error', message: error.message });
  }
}
