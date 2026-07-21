import {
  fetchBotMessages,
  saveBotMessages,
  saveMenuOptions,
  upsertMessage,
  slugifyKey
} from '../../src/lib/db.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const DEFAULT_MENU = [
  { number: 1, emoji: '📆', title: 'Próximos Eventos', messageKey: 'eventos' },
  { number: 2, emoji: '🏃', title: 'Actividades', messageKey: 'actividades' },
  { number: 3, emoji: '🏡', title: 'Instalaciones', messageKey: 'instalaciones' },
  { number: 4, emoji: '🎫', title: 'Membresías', messageKey: 'membresias' },
  { number: 5, emoji: '💰', title: 'Preventa y Beneficios', messageKey: 'preventa' },
  { number: 6, emoji: '🙋', title: 'Hablar con un Asesor', messageKey: 'asesor' }
];

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

    // 1) Restaurar mensajes que falten
    for (const [key, defMsg] of Object.entries(defaults)) {
      if (key === 'menuOptions') continue;
      if (!messages[key]) {
        messages[key] = JSON.parse(JSON.stringify(defMsg));
        restored++;
      }
    }

    // 2) Restaurar contenido y keywords de cada mensaje desde los defaults
    for (const [key, defMsg] of Object.entries(defaults)) {
      if (key === 'menuOptions') continue;
      if (!messages[key]) continue;
      // Restaurar contenido si el default tiene contenido
      if (defMsg.content && messages[key].content !== defMsg.content) {
        messages[key].content = defMsg.content;
        restored++;
      }
      // Restaurar keywords
      if (Array.isArray(defMsg.keywords)) {
        const userExtras = (messages[key].keywords || []).filter(
          k => !defMsg.keywords.includes(k) && !String(k).match(/^\d+[️⃣]?$/)
        );
        const oldLen = (messages[key].keywords || []).length;
        messages[key].keywords = [...defMsg.keywords, ...userExtras];
        if (messages[key].keywords.length !== oldLen) restored++;
      }
    }

    // 3) Resetear menuOptions
    messages.menuOptions = DEFAULT_MENU.map(o => ({ ...o }));

    // 4) Guardar
    await saveBotMessages(messages);

    return res.status(200).json({
      ok: true,
      restored,
      menuOptions: messages.menuOptions,
      messagesRestored: Object.keys(messages).filter(k => k !== 'menuOptions').length
    });
  } catch (error) {
    console.error('reset_menu error:', error);
    return res.status(500).json({ error: 'Error', message: error.message });
  }
}
