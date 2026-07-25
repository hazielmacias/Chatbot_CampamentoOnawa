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
    let restored = 0;
    const changes = [];

    // Restaurar contenido, title, description de cada mensaje desde defaults
    for (const [key, defMsg] of Object.entries(defaults)) {
      if (key === 'menuOptions' || key === 'footer') continue;
      if (!messages[key]) {
        // Si no existe, crearlo
        messages[key] = JSON.parse(JSON.stringify(defMsg));
        changes.push(`${key}: creado`);
        restored++;
        continue;
      }
      // Sobrescribir contenido desde defaults
      if (defMsg.content && messages[key].content !== defMsg.content) {
        const oldPreview = messages[key].content ? messages[key].content.slice(0, 50) : '';
        messages[key].content = defMsg.content;
        changes.push(`${key}: contenido actualizado desde "${oldPreview}..."`);
        restored++;
      }
      // Sobrescribir title si cambió
      if (defMsg.title && messages[key].title !== defMsg.title) {
        messages[key].title = defMsg.title;
        restored++;
      }
      // Sobrescribir description si cambió
      if (defMsg.description && messages[key].description !== defMsg.description) {
        messages[key].description = defMsg.description;
        restored++;
      }
    }

    // Guardar
    await saveBotMessages(messages);

    return res.status(200).json({
      ok: true,
      restored,
      changes,
      message: 'Contenido restaurado desde defaults'
    });
  } catch (error) {
    console.error('reset_content error:', error);
    return res.status(500).json({ error: 'Error', message: error.message });
  }
}
