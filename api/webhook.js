import { sendMessage } from '../src/lib/whatsapp.js';
import { getOrCreateContact, saveMessage, markEscalated, renderTemplate, fetchBotMessages, getMenuOptions, upsertMessage } from '../src/lib/db.js';
import { getConfig } from '../src/bot/configCache.js';

const FOOTER_SKIP = new Set(['asesor', 'despedida', 'no_entendido']);
const INTEREST_KEY = 'asesor';

function numberEmoji(n) {
  return n + '️⃣';
}

function buildKeywordMap(messages) {
  const map = [];
  for (const [key, msg] of Object.entries(messages || {})) {
    if (msg && Array.isArray(msg.keywords) && msg.keywords.length > 0) {
      map.push({ match: msg.keywords, messageKey: key });
    }
  }
  return map;
}

// Construye keywords desde menuOptions (fuente de verdad del menú):
// - el número ("1", "2", ...) y su variante con emoji ("1️⃣")
// - el título en minúsculas
// - variante sin acentos del título
function buildMenuKeywordMap(menuOptions) {
  const map = [];
  for (const opt of (menuOptions || [])) {
    if (!opt || !opt.messageKey) continue;
    const kws = [];
    const n = Number(opt.number);
    if (n > 0) {
      kws.push(String(n));
      kws.push(numberEmoji(n));
    }
    const title = String(opt.title || '').toLowerCase().trim();
    if (title) {
      kws.push(title);
      const sinAcentos = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (sinAcentos && sinAcentos !== title) kws.push(sinAcentos);
    }
    if (kws.length > 0) {
      map.push({ match: kws, messageKey: opt.messageKey });
    }
  }
  return map;
}

// FALLBACK NUCLEAR: si el número del menú existe en menuOptions, usarlo
// aunque todos los demás sistemas fallen. Esta es la red de seguridad.
function matchByNumberOnly(text, menuOptions) {
  const trimmed = String(text || '').trim();
  // Acepta "1", "1️⃣", "1."
  const m = trimmed.match(/^(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n < 1 || n > 99) return null;
  const opt = (menuOptions || []).find(o => Number(o.number) === n);
  return opt ? opt.messageKey : null;
}

function withFooter(text, footer) {
  if (!footer) return text;
  return `${text}${footer}`;
}

function getResponse(text, cfg) {
  const lower = text.toLowerCase().trim();
  const keywordMap = buildKeywordMap(cfg.messages);
  const menuMap = buildMenuKeywordMap(cfg.menuOptions);
  let key = null;
  let matchedBy = 'none';

  // 1) Keywords de los mensajes (compatibilidad con horario, ubicacion, etc.)
  for (const entry of keywordMap) {
    if (entry.match.some(kw => lower === kw || lower.includes(kw))) {
      key = entry.messageKey;
      matchedBy = 'msg-keywords';
      break;
    }
  }

  // 2) Keywords del menú (número / título desde menuOptions)
  if (!key) {
    for (const entry of menuMap) {
      if (entry.match.some(kw => lower === kw || lower.includes(kw))) {
        key = entry.messageKey;
        matchedBy = 'menu-keywords';
        break;
      }
    }
  }

  // 3) FALLBACK NUCLEAR: número directo del menú
  if (!key) {
    const nk = matchByNumberOnly(text, cfg.menuOptions);
    if (nk) {
      key = nk;
      matchedBy = 'menu-number-fallback';
    }
  }

  // 4) Si no hubo match, no_entendido
  if (!key) {
    key = 'no_entendido';
    matchedBy = 'fallback';
  }

  const msg = cfg.messages[key];
  if (!msg) {
    const fallback = cfg.messages.no_entendido?.content || '';
    return { text: renderTemplate(fallback, cfg.menuOptions), matchedBy, key };
  }
  const rendered = renderTemplate(msg.content, cfg.menuOptions);
  const final = FOOTER_SKIP.has(key) ? rendered : withFooter(rendered, cfg.messages.footer?.content || '');
  return { text: final, matchedBy, key };
}

function getInterestKeywords(cfg) {
  const asesor = cfg.messages?.[INTEREST_KEY];
  if (!asesor || !Array.isArray(asesor.keywords)) return [];
  return asesor.keywords;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (token === process.env.VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  if (req.method === 'POST') {
    try {
      if (req.body?.type === 'preview') {
        const text = req.body?.text || '';
        const cfg = await getConfig();
        const result = getResponse(text, cfg);
        return res.status(200).json({
          ok: true,
          text,
          response: result.text,
          matchedBy: result.matchedBy,
          matchedKey: result.key
        });
      }

      if (req.body?.type === 'manual_reply') {
        const { phone, message: text } = req.body;
        if (!phone || !text) {
          return res.status(400).json({ error: 'phone y message requeridos' });
        }
        try {
          await getOrCreateContact(phone);
          await sendMessage(phone, text);
          await saveMessage(phone, 'outbound', text, 'text');
          return res.status(200).json({ ok: true, sent: text });
        } catch (sendErr) {
          const metaError = sendErr.response?.data || null;
          console.error('Meta sendMessage error:', metaError || sendErr.message);
          return res.status(500).json({
            error: 'Error enviando mensaje',
            message: sendErr.message,
            meta: metaError
          });
        }
      }

      // Endpoint de debug para ver qué pasa con la config
      if (req.body?.type === 'debug_config') {
        const messages = await fetchBotMessages();
        const menuOptions = await getMenuOptions();
        const safeMessages = {};
        for (const [k, v] of Object.entries(messages)) {
          if (k === 'menuOptions') continue;
          safeMessages[k] = {
            key: v.key,
            title: v.title,
            keywords: v.keywords,
            hasContent: !!v.content,
            contentPreview: String(v.content || '').slice(0, 80)
          };
        }
        return res.status(200).json({
          ok: true,
          menuOptions,
          messages: safeMessages
        });
      }

      // Endpoint para forzar la migración manualmente
      if (req.body?.type === 'force_migrate') {
        const messages = await fetchBotMessages();
        // Sincronizar keywords de las opciones del menú con el número
        let synced = 0;
        for (const opt of (messages.menuOptions || [])) {
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
          if (titleLower && !kws.includes(titleLower)) kws.push(titleLower);
          if (kws.length !== before) {
            await upsertMessage({
              key: msg.key,
              title: msg.title,
              content: msg.content,
              description: msg.description,
              sortOrder: msg.sortOrder,
              keywords: kws
            });
            synced++;
          }
        }
        return res.status(200).json({ ok: true, synced, menuOptions: messages.menuOptions });
      }

      const value = req.body.entry?.[0]?.changes?.[0]?.value;
      const message = value?.messages?.[0];
      if (!message) return res.status(200).send('OK');

      const phone = message.from;
      const profileName = value?.contacts?.[0]?.profile?.name || null;
      const messageType = message.type;

      await getOrCreateContact(phone, profileName);

      const cfg = await getConfig();
      const bienvenidaMsg = renderTemplate(
        cfg.messages.bienvenida?.content || '¡Hola! 👋 Bienvenido a *Campamento Onawa*',
        cfg.menuOptions
      );

      if (messageType !== 'text') {
        const fallback = `¡Hola! 👋 Por el momento solo puedo leer mensajes de *texto*.\n\n${bienvenidaMsg}`;
        await sendMessage(phone, fallback);
        await saveMessage(phone, 'outbound', fallback, 'text');
        return res.status(200).send('OK');
      }

      const text = message.text?.body || '';
      await saveMessage(phone, 'inbound', text, 'text');

      const result = getResponse(text, cfg);
      console.log(`[webhook] from=${phone} text="${text}" matchedBy=${result.matchedBy} key=${result.key}`);
      await sendMessage(phone, result.text);
      await saveMessage(phone, 'outbound', result.text, 'text');

      const lower = text.toLowerCase();
      const interestKeywords = getInterestKeywords(cfg);
      const triggered = interestKeywords.length > 0 && interestKeywords.some(kw => lower.includes(kw));

      if (triggered) {
        const advisorPhone = process.env.ADVISOR_PHONE;
        await markEscalated(phone, `Palabra clave detectada: "${text.slice(0, 50)}"`, advisorPhone);
        if (advisorPhone) {
          await sendMessage(
            advisorPhone,
            `🚨 Nuevo lead - Campamento Onawa\n📱 ${phone}\n👤 ${profileName || 'Sin nombre'}\n💬 ${text}\n\nContactar urgente.`
          );
        }
      }

      return res.status(200).send('OK');
    } catch (error) {
      console.error('Error:', error);
      if (req.body?.type === 'manual_reply') {
        return res.status(500).json({ error: 'Error enviando mensaje', message: error.message });
      }
      return res.status(200).send('OK');
    }
  }

  return res.status(405).send('Method Not Allowed');
}