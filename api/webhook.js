import { sendMessage } from '../src/lib/whatsapp.js';
import { getOrCreateContact, saveMessage, getRecentMessages, markEscalated, renderTemplate, fetchBotMessages, getMenuOptions, upsertMessage } from '../src/lib/db.js';
import { getConfig } from '../src/bot/configCache.js';
import { responderConIA, isGroqEnabled } from '../src/ai/groq.js';

const FOOTER_SKIP = new Set(['asesor', 'despedida', 'no_entendido']);
const INTEREST_KEY = 'asesor';

// Palabras clave que indican interés afirmativo (respuesta a preguntas del bot)
const AFFIRMATIVE_KEYWORDS = [
  'si', 'sí', 'yes', 'ok', 'dale', 'va', 'perfecto', 'me interesa', 'quiero',
  'interesado', 'interesada', 'genial', 'excelente', 'me gustaría', 'claro',
  'por supuesto', 'obvio', 'listo', 'vamos', 'cuando', 'dónde', 'donde', 'como',
  'cómo', 'comprar', 'adquirir', 'contratar', 'reservar', 'agendar', 'visitar',
  'cuanto', 'cuánto', 'precio', 'costo', 'info', 'información', 'mas info',
  'más info', 'detalles', 'me encanta', 'suena bien', 'me late', 'padrísimo',
  'padrisimo', 'chido', 'buena onda', 'me llama', 'llama la atención',
  'pasa info', 'pasa información', 'pasame info', 'pasame información'
];

// Palabras clave que indican rechazo
const NEGATIVE_KEYWORDS = [
  'no', 'nop', 'nope', 'no gracias', 'paso', 'ahora no', 'tal vez después',
  'quizás luego', 'no por ahora', 'tal vez mas tarde', 'no me interesa',
  'no gracias', 'paso por ahora', 'después', 'despues', 'otra vez'
];

// Nombres de eventos específicos — si el usuario los menciona tras ver la lista de eventos,
// se interpreta como interés directo en ese evento
const EVENT_NAMES = [
  'karaoke', 'michelada', 'mezclada', 'pozole', 'pozolero', 'pozoleros',
  'campamento', 'verano', 'noche mexicana', 'fiesta patria', 'patria',
  'festival', 'tiro', 'deportivo', 'tiro deportivo', 'agosto', 'septiembre',
  'octubre', 'sabado', 'domingo', 'cena', 'baile', 'musica', 'música', 'show'
];

function detectarIntencion(text, contextoKey = null) {
  const lower = text.toLowerCase().trim();
  // Eliminar signos de puntuación para matching más limpio
  const clean = lower.replace(/[¡!¿?. ,]+/g, '');
  
  // Si el contexto es eventos y el usuario menciona un evento específico → interés
  if (contextoKey === 'eventos') {
    for (const kw of EVENT_NAMES) {
      if (clean === kw || lower.includes(kw)) return 'interes';
    }
  }
  
  for (const kw of AFFIRMATIVE_KEYWORDS) {
    if (clean === kw || lower.includes(kw)) return 'interes';
  }
  for (const kw of NEGATIVE_KEYWORDS) {
    if (clean === kw || lower.includes(kw)) return 'rechazo';
  }
  return null;
}

const MENSAJE_INTERES = `¡Me encanta tu interés! 🎉
Te conecto con nuestro Coordinador de Atención Personalizada para darte toda la información:

*👤 Contacto directo:* https://wa.me/525530086410
*📱 O escribe al número:* 55 3008 6410

⏱️ _Te responderemos a la brevedad_`;

const MENSAJE_RECHAZO = `¡Entendido! 😊 Cuando quieras saber más, aquí estaré.

{{MENU}}`;

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

  // 1) PRIORIDAD: menú principal. El menú es la fuente de verdad
  //    para los números (1, 2, 3...) y los títulos de las opciones.
  //    Si el cliente escribe algo que matchea una opción, gana ella.
  for (const entry of menuMap) {
    if (entry.match.some(kw => lower === kw || lower.includes(kw))) {
      key = entry.messageKey;
      matchedBy = 'menu-keywords';
      break;
    }
  }

  // 2) Mensajes sueltos: horario, ubicacion, despedida, etc.
  //    Solo si no se matcheó una opción del menú.
  if (!key) {
    for (const entry of keywordMap) {
      if (entry.match.some(kw => lower === kw || lower.includes(kw))) {
        key = entry.messageKey;
        matchedBy = 'msg-keywords';
        break;
      }
    }
  }

  // 3) FALLBACK NUCLEAR: número directo del menú (1, 2, 3...)
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

// Inferir contexto a partir de los últimos mensajes de la conversación
async function inferirContexto(phone, cfg) {
  try {
    const messages = await getRecentMessages(phone, 5);
    // Buscar el último mensaje outbound que tenga contexto
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.direction === 'outbound') {
        // Si el mensaje tiene metadata con context_key, usarlo
        if (msg.metadata?.context_key) {
          return msg.metadata.context_key;
        }
        // Intentar inferir por contenido del mensaje
        const content = msg.content || '';
        for (const opt of (cfg.menuOptions || [])) {
          const mk = opt.messageKey;
          if (!mk) continue;
          const msgDef = cfg.messages[mk];
          if (!msgDef?.content) continue;
          // Si el mensaje enviado contiene el título de la opción o sus keywords
          const title = msgDef.title || '';
          if (content.includes(title) || content.includes(`*${title}*`)) {
            return mk;
          }
        }
      }
    }
    return null;
  } catch (e) {
    console.error('[context] Error inferiendo contexto:', e.message);
    return null;
  }
}

// Respuestas contextuales basadas en el último tema conversado
const RESPUESTAS_CONTEXTUALES = {
  eventos: {
    interes: `¡Genial! 🎉 Me encanta que quieras asistir.\n\nPara reservar tu lugar o conocer más detalles de cualquier evento, te conecto con nuestro asesor:\n\n*👤 Contacto:* https://wa.me/525530086410\n*📱 Teléfono:* 55 3008 6410`,
    rechazo: `¡Entendido! 😊 Cuando quieras asistir a alguno de nuestros eventos, aquí estaré para ayudarte.\n\n{{MENU}}`
  },
  actividades: {
    interes: `¡Excelente elección! 🏃 Hay muchas actividades increíbles.\n\nPara conocer disponibilidad, precios o agendar alguna actividad, te conecto con nuestro asesor:\n\n*👤 Contacto:* https://wa.me/525530086410\n*📱 Teléfono:* 55 3008 6410`,
    rechazo: `¡Sin problema! 😊 Cuando quieras conocer más de nuestras actividades, aquí estaré.\n\n{{MENU}}`
  },
  instalaciones: {
    interes: `¡Perfecto! 🏡 Te va a encantar conocer el lugar en persona.\n\nPara agendar una visita guiada, te conecto con nuestro asesor:\n\n*👤 Contacto:* https://wa.me/525530086410\n*📱 Teléfono:* 55 3008 6410`,
    rechazo: `¡Entendido! 😊 Cuando quieras agendar una visita para conocer las instalaciones, aquí estaré.\n\n{{MENU}}`
  },
  membresias: {
    interes: `¡Me encanta tu interés! 🎫 Las membresías son una inversión increíble.\n\nPara conocer todos los detalles y asegurar tu membresía, te conecto con nuestro asesor:\n\n*👤 Contacto:* https://wa.me/525530086410\n*📱 Teléfono:* 55 3008 6410`,
    rechazo: `¡Sin problema! 😊 Cuando quieras conocer más sobre nuestras membresías, aquí estaré.\n\n{{MENU}}`
  },
  preventa: {
    interes: `¡Excelente decisión! 💰 La preventa es la mejor oportunidad para asegurar tus beneficios de Miembro Fundador.\n\nPara finalizar tu proceso y asegurar tus beneficios, te conecto con nuestro asesor:\n\n*👤 Contacto:* https://wa.me/525530086410\n*📱 Teléfono:* 55 3008 6410`,
    rechazo: `¡Entendido! 😊 Cuando quieras conocer más sobre la preventa y sus beneficios, aquí estaré.\n\n{{MENU}}`
  }
};

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
        let result = getResponse(text, cfg);

        // Si es fallback, detectar intención afirmativa/negativa primero
        if (result.matchedBy === 'fallback') {
          const intencion = detectarIntencion(text);
          if (intencion === 'interes') {
            result = { text: MENSAJE_INTERES, matchedBy: 'intencion-interes', key: 'asesor' };
          } else if (intencion === 'rechazo') {
            const menu = renderTemplate(MENSAJE_RECHAZO, cfg.menuOptions);
            result = { text: menu, matchedBy: 'intencion-rechazo', key: 'bienvenida' };
          } else if (isGroqEnabled()) {
            const ia = await responderConIA(text);
            if (ia.respuesta && !ia.esFallback) {
              const footer = cfg.messages.footer?.content || '';
              result = {
                text: `${ia.respuesta}${footer}`,
                matchedBy: 'groq-ai',
                key: 'ia_generativa'
              };
            } else {
              // IA no pudo responder → escalar al asesor
              result = { text: MENSAJE_INTERES, matchedBy: 'ia-escalado', key: 'asesor' };
            }
          }
        }

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
        return res.status(200).json({
          ok: true,
          menuOptions: messages.menuOptions,
          menuFromDefaults: messages.menuOptions?.map(o => `${o.number}. ${o.emoji} ${o.title}`),
          version: '2.0'
        });
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
        await saveMessage(phone, 'outbound', fallback, 'text', 'bienvenida');
        return res.status(200).send('OK');
      }

      const text = message.text?.body || '';
      await saveMessage(phone, 'inbound', text, 'text');

      let result = getResponse(text, cfg);
      let escalated = false;
      let escalationReason = '';

      // Si es fallback, detectar intención afirmativa/negativa CON CONTEXTO primero, luego IA
      if (result.matchedBy === 'fallback') {
        // Buscar contexto de la conversación (último tema que el bot preguntó) PRIMERO
        const contextoKey = await inferirContexto(phone, cfg);
        console.log(`[webhook] Contexto inferido: ${contextoKey || 'ninguno'}`);
        
        // Detectar intención pasando el contexto (permite detectar nombres de eventos, etc.)
        const intencion = detectarIntencion(text, contextoKey);
        
        if (intencion === 'interes' && contextoKey && RESPUESTAS_CONTEXTUALES[contextoKey]) {
          // El usuario dijo "sí" o mencionó un evento específico en contexto de un tema → respuesta contextual
          console.log(`[webhook] Interés contextual detectado: ${contextoKey}`);
          const respuestaContextual = RESPUESTAS_CONTEXTUALES[contextoKey].interes;
          result = { text: respuestaContextual, matchedBy: 'contexto-interes', key: 'asesor' };
          escalated = true;
          escalationReason = `Interés contextual (${contextoKey}): "${text.slice(0, 50)}"`;
        } else if (intencion === 'interes') {
          // Interés pero sin contexto claro → respuesta genérica de interés
          console.log(`[webhook] Intención de interés detectada (sin contexto): "${text}"`);
          result = { text: MENSAJE_INTERES, matchedBy: 'intencion-interes', key: 'asesor' };
          escalated = true;
          escalationReason = `Respuesta afirmativa/intención de interés: "${text.slice(0, 50)}"`;
        } else if (intencion === 'rechazo' && contextoKey && RESPUESTAS_CONTEXTUALES[contextoKey]) {
          // El usuario dijo "no" en contexto de un tema específico → respuesta contextual amable
          console.log(`[webhook] Rechazo contextual detectado: ${contextoKey}`);
          const respuestaContextual = renderTemplate(RESPUESTAS_CONTEXTUALES[contextoKey].rechazo, cfg.menuOptions);
          result = { text: respuestaContextual, matchedBy: 'contexto-rechazo', key: 'bienvenida' };
        } else if (intencion === 'rechazo') {
          // Rechazo pero sin contexto claro
          console.log(`[webhook] Intención de rechazo detectada (sin contexto): "${text}"`);
          const menu = renderTemplate(MENSAJE_RECHAZO, cfg.menuOptions);
          result = { text: menu, matchedBy: 'intencion-rechazo', key: 'bienvenida' };
        } else if (isGroqEnabled()) {
          console.log(`[webhook] Intentando respuesta con IA para: "${text}"`);
          const ia = await responderConIA(text);
          if (ia.respuesta && !ia.esFallback) {
            const footer = cfg.messages.footer?.content || '';
            result = {
              text: `${ia.respuesta}${footer}`,
              matchedBy: 'groq-ai',
              key: 'ia_generativa'
            };
            console.log(`[webhook] IA respondió (${ia.tokens} tokens): "${ia.respuesta.slice(0, 80)}..."`);
          } else {
            // IA no pudo responder con certeza → escalar al asesor
            console.log(`[webhook] IA no pudo responder, escalando a asesor`);
            result = { text: MENSAJE_INTERES, matchedBy: 'ia-escalado', key: 'asesor' };
            escalated = true;
            escalationReason = `IA no pudo responder con certeza: "${text.slice(0, 50)}"`;
          }
        }
      }

      console.log(`[webhook] from=${phone} text="${text}" matchedBy=${result.matchedBy} key=${result.key}`);
      await sendMessage(phone, result.text);
      // Guardar mensaje outbound CON contexto para rastrear la conversación
      await saveMessage(phone, 'outbound', result.text, 'text', result.key);

      // Escalar si no se escaló ya por intención/IA
      if (!escalated) {
        const lower = text.toLowerCase();
        const interestKeywords = getInterestKeywords(cfg);
        const triggered = interestKeywords.length > 0 && interestKeywords.some(kw => lower.includes(kw));
        if (triggered) {
          escalated = true;
          escalationReason = `Palabra clave detectada: "${text.slice(0, 50)}"`;
        }
      }

      if (escalated) {
        const advisorPhone = process.env.ADVISOR_PHONE;
        await markEscalated(phone, escalationReason, advisorPhone);
        if (advisorPhone) {
          await sendMessage(
            advisorPhone,
            `🚨 Nuevo lead - Campamento Onawa\n📱 ${phone}\n👤 ${profileName || 'Sin nombre'}\n💬 ${text}\n📌 Motivo: ${escalationReason}\n\nContactar urgente.`
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