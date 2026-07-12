// Smoke test: tabla onawa_contacts (fantasma) + cache + logica del bot
import { createClient } from '@supabase/supabase-js';
import * as db from './src/lib/db.js';
import { getConfig, invalidate, getCacheMeta } from './src/bot/configCache.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

let pass = 0, fail = 0;
const log = (ok, msg) => { console.log((ok ? '✅' : '❌') + ' ' + msg); ok ? pass++ : fail++; };

console.log('\n=== 1. Tabla onawa_contacts legible ===\n');
const { data: c, error: e1 } = await supabase.from('onawa_contacts').select('phone').eq('phone', '__bot_config__').maybeSingle();
if (e1) log(false, 'onawa_contacts: ' + e1.message);
else log(true, 'onawa_contacts responde correctamente (PostgREST no está roto)');

console.log('\n=== 2. fetchBotMessages (lee/crea fantasma) ===\n');
try {
  const m = await db.fetchBotMessages();
  log(Object.keys(m).length >= 13, `fetchBotMessages() devuelve ${Object.keys(m).length} mensajes`);
  log(m.bienvenida && m.bienvenida.content, 'mensaje "bienvenida" presente y con contenido');
  log(m.footer && m.footer.content, 'mensaje "footer" presente y con contenido');
  console.log('     keys:', Object.keys(m).sort().join(', '));
} catch (e) {
  log(false, 'fetchBotMessages: ' + e.message);
}

console.log('\n=== 3. configCache (TTL 10s) ===\n');
try {
  invalidate();
  const c1 = await getConfig({ force: true });
  log(c1.messages.bienvenida !== undefined, 'getConfig() carga mensajes');
  const meta = getCacheMeta();
  log(meta && meta.loadedAt, 'getCacheMeta() expone loadedAt');
  const c2 = await getConfig();
  log(c2.messages.bienvenida.content === c1.messages.bienvenida.content, 'Segunda llamada devuelve mensajes consistentes');
  const c3 = await getConfig();
  log(c3.messages.bienvenida.content === c1.messages.bienvenida.content, 'Tercera llamada consistente (sin cache, siempre live)');
} catch (e) {
  log(false, 'configCache: ' + e.message);
}

console.log('\n=== 4. Simulación de getResponse (lógica del webhook) ===\n');
const cfg = await getConfig({ force: true });
const FOOTER_SKIP = new Set(['asesor', 'despedida', 'no_entendido']);
const KEYWORD_MAP = [
  { match: ['menu','menú','hola','inicio','0','volver','regresar','salir'], key: 'bienvenida' },
  { match: ['1','1️⃣'], key: 'membresias' },
  { match: ['2','2️⃣'], key: 'actividades' },
  { match: ['3','3️⃣'], key: 'instalaciones' },
  { match: ['4','4️⃣'], key: 'eventos' },
  { match: ['5','5️⃣'], key: 'asesor' },
  { match: ['precio','costo','cuanto','cuánto','membresia','membresía','plan','nivel'], key: 'membresias' },
  { match: ['actividad','actividades','deporte','deportes','aventura'], key: 'actividades' },
  { match: ['instalacion','instalación','instalaciones'], key: 'instalaciones' },
  { match: ['evento','eventos','promocion','promoción','karaoke','michelada','padre','show','2x1','mezclada','fecha','cuando','cuándo'], key: 'eventos' },
  { match: ['horario','hora','horas','abren','abierto','abre'], key: 'horario' },
  { match: ['inscribir','reservar','interesa','interesado','quiero','asesor','hablar con','contratar','comprar','adquirir'], key: 'asesor' },
  { match: ['seguridad','seguro','medico','médico','enfermeria','enfermería'], key: 'seguridad' },
  { match: ['edad','requisito','requisitos'], key: 'requisitos' },
  { match: ['ubicacion','ubicación','donde','dónde','direccion','dirección','como llegar','cómo llegar','mapa'], key: 'ubicacion' },
  { match: ['gracias','adios','adiós','bye','chao','hasta luego'], key: 'despedida' }
];
function getResp(text, cfg) {
  const lower = text.toLowerCase().trim();
  let key = null;
  for (const e of KEYWORD_MAP) if (e.match.some(k => lower === k || lower.includes(k))) { key = e.key; break; }
  if (!key) key = 'no_entendido';
  const m = cfg.messages[key];
  if (!m) return '';
  if (FOOTER_SKIP.has(key)) return m.content;
  return m.content + (cfg.messages.footer?.content || '');
}
const tests = [
  ['hola','bienvenida'],['menu','bienvenida'],['1','membresias'],['5','asesor'],
  ['precio','membresias'],['cuanto cuesta','membresias'],['actividad','actividades'],
  ['evento','eventos'],['horario','horario'],['reservar','asesor'],['quiero ir','asesor'],
  ['gracias','despedida'],['asdf qwerty','no_entendido'],['ubicacion','ubicacion'],
  ['seguridad','seguridad'],['2','actividades']
];
for (const [input, expected] of tests) {
  const r = getResp(input, cfg);
  const exp = cfg.messages[expected]?.content + (FOOTER_SKIP.has(expected) ? '' : (cfg.messages.footer?.content || ''));
  log(r === exp, `"${input}" → ${expected}`);
}

console.log('\n=== 5. Upsert real (escritura) ===\n');
try {
  const original = cfg.messages.bienvenida.content;
  const newContent = original + '\n\n[TEST ' + Date.now() + ']';
  const saved = await db.upsertMessage({ key: 'bienvenida', title: cfg.messages.bienvenida.title, content: newContent, sortOrder: 1 });
  log(saved.content === newContent, 'upsertMessage escribe el nuevo contenido');
  const c2 = await getConfig({ force: true });
  log(c2.messages.bienvenida.content === newContent, 'getConfig recarga y refleja el cambio');
  await db.upsertMessage({ key: 'bienvenida', title: cfg.messages.bienvenida.title, content: original, sortOrder: 1 });
  const c3 = await getConfig({ force: true });
  log(c3.messages.bienvenida.content === original, 'Reversión: el contenido vuelve al original');
  invalidate();
} catch (e) {
  log(false, 'upsertMessage: ' + e.message);
}

console.log('\n=== Resumen ===\n');
console.log(`Pasaron: ${pass} · Fallaron: ${fail}`);
process.exit(fail > 0 ? 1 : 0);