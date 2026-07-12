import {
  getMenuOptions,
  saveMenuOptions,
  fetchBotMessages,
  saveBotMessages,
  buildMenuText,
  slugifyKey
} from '../../src/lib/db.js';

const EMOJI_DEFAULT_BY_NUMBER = {
  1: '1️⃣', 2: '2️⃣', 3: '3️⃣', 4: '4️⃣', 5: '5️⃣',
  6: '6️⃣', 7: '7️⃣', 8: '8️⃣', 9: '9️⃣', 10: '🔟'
};

function emojiForNumber(n) {
  return EMOJI_DEFAULT_BY_NUMBER[n] || (n + '️⃣');
}

function numberEmoji(n) {
  return n + '️⃣';
}

function validateOption(opt) {
  if (!opt || typeof opt !== 'object') return 'opción inválida';
  const number = Number(opt.number);
  if (!Number.isInteger(number) || number < 1 || number > 99) {
    return 'El número debe estar entre 1 y 99';
  }
  const title = String(opt.title || '').trim();
  if (!title) return 'El título es obligatorio';
  if (title.length > 80) return 'El título es demasiado largo (máx 80)';
  return null;
}

async function nextAvailableNumber(current) {
  const used = new Set(current.map(o => Number(o.number)));
  for (let i = 1; i < 100; i++) {
    if (!used.has(i)) return i;
  }
  return current.length + 1;
}

function autoKeywords(title, number) {
  const out = [];
  const num = Number(number);
  if (Number.isInteger(num)) {
    out.push(String(num), numberEmoji(num));
  }
  const t = String(title || '').toLowerCase().trim();
  if (t) {
    // agregar el título en singular y plural simple
    out.push(t);
    if (!t.endsWith('s') && !t.endsWith('es')) out.push(t + 's');
  }
  return Array.from(new Set(out));
}

async function ensureMessageForOption(messages, opt, oldKey) {
  // Si hay messageKey, no tocar. Si no, crear mensaje nuevo.
  if (opt.messageKey && messages[opt.messageKey]) {
    return { messages, key: opt.messageKey };
  }
  let key = slugifyKey(opt.title);
  let suffix = 1;
  while (messages[key]) {
    suffix += 1;
    key = slugifyKey(opt.title) + '_' + suffix;
  }
  messages[key] = {
    key,
    title: opt.title,
    description: `Opción ${opt.number} del menú principal.`,
    content: `*${opt.title}*\n\nEscribe la información de esta opción aquí. Puedes editarla después en Mensajes sueltos.`,
    keywords: autoKeywords(opt.title, opt.number),
    sortOrder: 90 + (opt.number || 0)
  };
  return { messages, key };
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const options = await getMenuOptions();
      const preview = buildMenuText(options);
      return res.status(200).json({ options, preview });
    }

    if (req.method === 'PUT') {
      // Reemplazar TODA la lista
      const list = Array.isArray(req.body?.options) ? req.body.options : null;
      if (!list) return res.status(400).json({ error: 'Falta el campo "options"' });
      for (const opt of list) {
        const err = validateOption(opt);
        if (err) return res.status(400).json({ error: err, option: opt });
      }
      // Asignar emojis por defecto si no vienen
      const cleaned = list.map(o => ({
        ...o,
        emoji: (o.emoji && String(o.emoji).trim()) || emojiForNumber(Number(o.number))
      })).sort((a, b) => a.number - b.number);
      const saved = await saveMenuOptions(cleaned);
      return res.status(200).json({ ok: true, options: saved, preview: buildMenuText(saved) });
    }

    if (req.method === 'POST') {
      // Crear una nueva opción
      const current = await getMenuOptions();
      const incoming = req.body || {};
      const number = Number(incoming.number) || await nextAvailableNumber(current);
      const opt = {
        number,
        title: String(incoming.title || '').trim(),
        emoji: String(incoming.emoji || '').trim() || emojiForNumber(number),
        messageKey: incoming.messageKey || null
      };
      const err = validateOption(opt);
      if (err) return res.status(400).json({ error: err });
      if (current.some(o => Number(o.number) === number)) {
        return res.status(409).json({ error: `Ya existe la opción ${number}` });
      }
      // Crear mensaje asociado si no tiene key
      const messages = await fetchBotMessages();
      const { messages: msgs2, key: mkey } = await ensureMessageForOption(messages, opt);
      opt.messageKey = mkey;
      await saveBotMessages(msgs2);
      const updated = await saveMenuOptions([...current, opt]);
      return res.status(201).json({ ok: true, option: opt, options: updated, preview: buildMenuText(updated) });
    }

    if (req.method === 'PATCH') {
      // Editar una opción existente
      const { number, title, emoji, messageKey } = req.body || {};
      const n = Number(number);
      if (!Number.isInteger(n) || n < 1) {
        return res.status(400).json({ error: 'Falta el número de la opción' });
      }
      const current = await getMenuOptions();
      const idx = current.findIndex(o => Number(o.number) === n);
      if (idx === -1) return res.status(404).json({ error: `No existe la opción ${n}` });
      const opt = current[idx];
      if (title !== undefined) {
        if (!String(title).trim()) return res.status(400).json({ error: 'Título vacío' });
        opt.title = String(title).trim();
      }
      if (emoji !== undefined) opt.emoji = String(emoji || '').trim() || emojiForNumber(n);
      if (messageKey !== undefined) opt.messageKey = messageKey || null;
      const err = validateOption(opt);
      if (err) return res.status(400).json({ error: err });
      current[idx] = opt;
      const updated = await saveMenuOptions(current);
      return res.status(200).json({ ok: true, option: opt, options: updated, preview: buildMenuText(updated) });
    }

    if (req.method === 'DELETE') {
      const number = Number(req.query?.number ?? req.body?.number);
      if (!Number.isInteger(number) || number < 1) {
        return res.status(400).json({ error: 'Falta el número a eliminar' });
      }
      const current = await getMenuOptions();
      const target = current.find(o => Number(o.number) === number);
      if (!target) return res.status(404).json({ error: `No existe la opción ${number}` });
      const remaining = current.filter(o => Number(o.number) !== number);
      await saveMenuOptions(remaining);
      return res.status(200).json({ ok: true, deleted: number, options: remaining, preview: buildMenuText(remaining) });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('menu.js error:', error);
    return res.status(500).json({ error: 'Error', message: error.message });
  }
}
