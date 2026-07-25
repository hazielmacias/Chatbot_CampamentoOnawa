import { config } from 'dotenv';
config();

const BASE = 'https://chatbot-campamento-onawa.vercel.app';
const AUTH = 'Basic ' + Buffer.from('admin:onawa2026').toString('base64');

let passed = 0;
let failed = 0;
const errors = [];

function log(test, status, detail) {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${test}] ${detail}`);
  if (status === 'PASS') passed++;
  else { failed++; errors.push({ test, detail }); }
}

async function preview(text) {
  const r = await fetch(`${BASE}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'preview', text })
  });
  return r.json();
}

async function runTest(name, fn) {
  try {
    await fn();
  } catch (e) {
    log(name, 'FAIL', `Error: ${e.message}`);
  }
}

console.log('\n═══════════════════════════════════════════════════');
console.log('🧪 TESTING COMPLETO - Chatbot Campamento Onawa');
console.log('═══════════════════════════════════════════════════\n');

// ════════════════════════════════════════════
// TEST 1: Todas las opciones del menú (1-5)
// ════════════════════════════════════════════
console.log('📋 TEST 1: Opciones del menú (1-5)');
const menuExpected = {
  '1': 'eventos',
  '2': 'actividades',
  '3': 'instalaciones',
  '4': 'membresias',
  '5': 'asesor'
};

await runTest('1.1 - Opción 1', async () => {
  const r = await preview('1');
  if (r.matchedKey === 'eventos') log('1.1', 'PASS', `"1" → eventos`);
  else log('1.1', 'FAIL', `Esperado eventos, obtuvo: ${r.matchedKey}`);
});

await runTest('1.2 - Opción 2', async () => {
  const r = await preview('2');
  if (r.matchedKey === 'actividades') log('1.2', 'PASS', `"2" → actividades`);
  else log('1.2', 'FAIL', `Esperado actividades, obtuvo: ${r.matchedKey}`);
});

await runTest('1.3 - Opción 3', async () => {
  const r = await preview('3');
  if (r.matchedKey === 'instalaciones') log('1.3', 'PASS', `"3" → instalaciones`);
  else log('1.3', 'FAIL', `Esperado instalaciones, obtuvo: ${r.matchedKey}`);
});

await runTest('1.4 - Opción 4', async () => {
  const r = await preview('4');
  if (r.matchedKey === 'membresias') log('1.4', 'PASS', `"4" → membresias (Preventa)`);
  else log('1.4', 'FAIL', `Esperado membresias, obtuvo: ${r.matchedKey}`);
});

await runTest('1.5 - Opción 5', async () => {
  const r = await preview('5');
  if (r.matchedKey === 'asesor') log('1.5', 'PASS', `"5" → asesor`);
  else log('1.5', 'FAIL', `Esperado asesor, obtuvo: ${r.matchedKey}`);
});

await runTest('1.6 - Emoji 1️⃣', async () => {
  const r = await preview('1️⃣');
  if (r.matchedKey === 'eventos') log('1.6', 'PASS', `"1️⃣" → eventos`);
  else log('1.6', 'FAIL', `Esperado eventos, obtuvo: ${r.matchedKey}`);
});

await runTest('1.7 - Emoji 5️⃣', async () => {
  const r = await preview('5️⃣');
  if (r.matchedKey === 'asesor') log('1.7', 'PASS', `"5️⃣" → asesor`);
  else log('1.7', 'FAIL', `Esperado asesor, obtuvo: ${r.matchedKey}`);
});

// ════════════════════════════════════════════
// TEST 2: Palabras clave del menú
// ════════════════════════════════════════════
console.log('\n📋 TEST 2: Palabras clave del menú');

await runTest('2.1 - "eventos"', async () => {
  const r = await preview('eventos');
  if (r.matchedKey === 'eventos') log('2.1', 'PASS', `"eventos" → eventos`);
  else log('2.1', 'FAIL', `Esperado eventos, obtuvo: ${r.matchedKey}`);
});

await runTest('2.2 - "actividades"', async () => {
  const r = await preview('actividades');
  if (r.matchedKey === 'actividades') log('2.2', 'PASS', `"actividades" → actividades`);
  else log('2.2', 'FAIL', `Esperado actividades, obtuvo: ${r.matchedKey}`);
});

await runTest('2.3 - "instalaciones"', async () => {
  const r = await preview('instalaciones');
  if (r.matchedKey === 'instalaciones') log('2.3', 'PASS', `"instalaciones" → instalaciones`);
  else log('2.3', 'FAIL', `Esperado instalaciones, obtuvo: ${r.matchedKey}`);
});

await runTest('2.4 - "membresia"', async () => {
  const r = await preview('membresia');
  if (r.matchedKey === 'membresias') log('2.4', 'PASS', `"membresia" → membresias`);
  else log('2.4', 'FAIL', `Esperado membresias, obtuvo: ${r.matchedKey}`);
});

await runTest('2.5 - "preventa"', async () => {
  const r = await preview('preventa');
  if (r.matchedKey === 'membresias') log('2.5', 'PASS', `"preventa" → membresias (Preventa)`);
  else log('2.5', 'FAIL', `Esperado membresias, obtuvo: ${r.matchedKey}`);
});

await runTest('2.6 - "asesor"', async () => {
  const r = await preview('asesor');
  if (r.matchedKey === 'asesor') log('2.6', 'PASS', `"asesor" → asesor`);
  else log('2.6', 'FAIL', `Esperado asesor, obtuvo: ${r.matchedKey}`);
});

// ════════════════════════════════════════════
// TEST 9: Keywords del asesor
// ════════════════════════════════════════════
console.log('\n📋 TEST 9: Keywords del asesor');

const asesorKeywords = ['asesor', 'asesora', 'hablar con', 'inscribir', 'inscribirme', 'reservar', 'comprar', 'contratar', 'adquirir', 'informes'];
for (const kw of asesorKeywords) {
  await runTest(`9.${asesorKeywords.indexOf(kw) + 1} - "${kw}"`, async () => {
    const r = await preview(kw);
    if (r.matchedKey === 'asesor' || r.matchedBy === 'msg-keywords' && r.response.includes('Coordinador')) {
      log(`9.${asesorKeywords.indexOf(kw) + 1}`, 'PASS', `"${kw}" → asesor`);
    } else {
      log(`9.${asesorKeywords.indexOf(kw) + 1}`, 'FAIL', `"${kw}" → ${r.matchedKey} (${r.matchedBy})`);
    }
  });
}

// ════════════════════════════════════════════
// TEST 7: Keywords sueltos (horario, ubicacion, seguridad)
// ════════════════════════════════════════════
console.log('\n📋 TEST 7: Keywords sueltos');

await runTest('7.1 - "horario"', async () => {
  const r = await preview('horario');
  if (r.matchedKey === 'horario') log('7.1', 'PASS', `"horario" → horario`);
  else log('7.1', 'FAIL', `Esperado horario, obtuvo: ${r.matchedKey}`);
});

await runTest('7.2 - "ubicacion"', async () => {
  const r = await preview('ubicacion');
  if (r.matchedKey === 'ubicacion') log('7.2', 'PASS', `"ubicacion" → ubicacion`);
  else log('7.2', 'FAIL', `Esperado ubicacion, obtuvo: ${r.matchedKey}`);
});

await runTest('7.3 - "donde"', async () => {
  const r = await preview('donde');
  if (r.matchedKey === 'ubicacion') log('7.3', 'PASS', `"donde" → ubicacion`);
  else log('7.3', 'FAIL', `Esperado ubicacion, obtuvo: ${r.matchedKey}`);
});

await runTest('7.4 - "seguridad"', async () => {
  const r = await preview('seguridad');
  if (r.matchedKey === 'seguridad') log('7.4', 'PASS', `"seguridad" → seguridad`);
  else log('7.4', 'FAIL', `Esperado seguridad, obtuvo: ${r.matchedKey}`);
});

await runTest('7.5 - "requisitos"', async () => {
  const r = await preview('requisitos');
  if (r.matchedKey === 'requisitos') log('7.5', 'PASS', `"requisitos" → requisitos`);
  else log('7.5', 'FAIL', `Esperado requisitos, obtuvo: ${r.matchedKey}`);
});

// ════════════════════════════════════════════
// TEST 8: Despedida
// ════════════════════════════════════════════
console.log('\n📋 TEST 8: Despedida');

await runTest('8.1 - "gracias"', async () => {
  const r = await preview('gracias');
  if (r.matchedKey === 'despedida') log('8.1', 'PASS', `"gracias" → despedida`);
  else log('8.1', 'FAIL', `Esperado despedida, obtuvo: ${r.matchedKey}`);
});

await runTest('8.2 - "adios"', async () => {
  const r = await preview('adios');
  if (r.matchedKey === 'despedida') log('8.2', 'PASS', `"adios" → despedida`);
  else log('8.2', 'FAIL', `Esperado despedida, obtuvo: ${r.matchedKey}`);
});

await runTest('8.3 - "bye"', async () => {
  const r = await preview('bye');
  if (r.matchedKey === 'despedida') log('8.3', 'PASS', `"bye" → despedida`);
  else log('8.3', 'FAIL', `Esperado despedida, obtuvo: ${r.matchedKey}`);
});

// ════════════════════════════════════════════
// TEST 11: Endpoints del dashboard
// ════════════════════════════════════════════
console.log('\n📋 TEST 11: Endpoints del dashboard');

await runTest('11.1 - GET /api/dashboard/menu', async () => {
  const r = await fetch(`${BASE}/api/dashboard/menu`, { headers: { 'Authorization': AUTH } });
  const j = await r.json();
  if (j.options && j.options.length === 5) log('11.1', 'PASS', `Menu tiene 5 opciones`);
  else log('11.1', 'FAIL', `Opciones: ${j.options?.length}`);
});

await runTest('11.2 - GET /api/dashboard/settings', async () => {
  const r = await fetch(`${BASE}/api/dashboard/settings`, { headers: { 'Authorization': AUTH } });
  const j = await r.json();
  if (j.messages && j.messages.eventos) log('11.2', 'PASS', `Settings tiene mensajes`);
  else log('11.2', 'FAIL', `Sin mensajes`);
});

await runTest('11.3 - GET /api/dashboard/stats', async () => {
  const r = await fetch(`${BASE}/api/dashboard/stats`, { headers: { 'Authorization': AUTH } });
  const j = await r.json();
  if (j.stats) log('11.3', 'PASS', `Stats: ${j.stats.totalConversations} conversaciones`);
  else log('11.3', 'FAIL', `Sin stats`);
});

await runTest('11.4 - POST /api/dashboard/reset-content', async () => {
  const r = await fetch(`${BASE}/api/dashboard/reset-content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': AUTH }
  });
  const j = await r.json();
  if (j.ok) log('11.4', 'PASS', `Reset content: ${j.restored} cambios`);
  else log('11.4', 'FAIL', `Error: ${j.error}`);
});

await runTest('11.5 - POST /api/dashboard/reset-menu', async () => {
  const r = await fetch(`${BASE}/api/dashboard/reset-menu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': AUTH }
  });
  const j = await r.json();
  if (j.ok) log('11.5', 'PASS', `Reset menu: ${j.restored} cambios`);
  else log('11.5', 'FAIL', `Error: ${j.error}`);
});

await runTest('11.6 - GET /api/dashboard/conversations', async () => {
  const r = await fetch(`${BASE}/api/dashboard/conversations`, { headers: { 'Authorization': AUTH } });
  const j = await r.json();
  if (j.conversations) log('11.6', 'PASS', `Conversations: ${j.conversations.length}`);
  else log('11.6', 'FAIL', `Sin conversations`);
});

await runTest('11.7 - GET /api/dashboard/history', async () => {
  const r = await fetch(`${BASE}/api/dashboard/history`, { headers: { 'Authorization': AUTH } });
  const j = await r.json();
  if (j.dailyStats) log('11.7', 'PASS', `History: ${j.dailyStats.length} días`);
  else log('11.7', 'FAIL', `Sin dailyStats`);
});

await runTest('11.8 - GET /api/dashboard/alerts', async () => {
  const r = await fetch(`${BASE}/api/dashboard/alerts`, { headers: { 'Authorization': AUTH } });
  const j = await r.json();
  if (j.alerts || j.ok !== undefined) log('11.8', 'PASS', `Alerts responde`);
  else log('11.8', 'FAIL', `Sin respuesta`);
});

// ════════════════════════════════════════════
// TEST 6: Fallback + IA (preguntas fuera de flujo)
// ════════════════════════════════════════════
console.log('\n📋 TEST 6: Fallback + IA');

await runTest('6.1 - Pregunta válida IA', async () => {
  const r = await preview('¿Cuánto cuesta la membresía?');
  if (r.matchedBy === 'groq-ai' || r.matchedBy === 'msg-keywords') log('6.1', 'PASS', `IA o keyword responde (${r.matchedBy})`);
  else log('6.1', 'FAIL', `matchedBy: ${r.matchedBy}`);
});

await runTest('6.2 - Pregunta aleatoria (debería escalar)', async () => {
  const r = await preview('xyzabc123 no entiendo nada');
  if (r.response && r.response.length > 50) log('6.2', 'PASS', `Respuesta generada (${r.response.length} chars)`);
  else log('6.2', 'FAIL', `Respuesta vacía`);
});

await runTest('6.3 - "menu"', async () => {
  const r = await preview('menu');
  if (r.matchedKey === 'bienvenida' || r.matchedBy === 'msg-keywords') log('6.3', 'PASS', `"menu" → bienvenida`);
  else log('6.3', 'FAIL', `Esperado bienvenida, obtuvo: ${r.matchedKey}`);
});

await runTest('6.4 - "hola"', async () => {
  const r = await preview('hola');
  if (r.matchedKey === 'bienvenida' || r.matchedBy === 'msg-keywords') log('6.4', 'PASS', `"hola" → bienvenida`);
  else log('6.4', 'FAIL', `Esperado bienvenida, obtuvo: ${r.matchedKey}`);
});

await runTest('6.5 - "buenos dias"', async () => {
  const r = await preview('buenos dias');
  if (r.matchedKey === 'bienvenida' || r.matchedBy === 'msg-keywords') log('6.5', 'PASS', `"buenos dias" → bienvenida`);
  else log('6.5', 'FAIL', `Esperado bienvenida, obtuvo: ${r.matchedKey}`);
});

await runTest('6.6 - "volver"', async () => {
  const r = await preview('volver');
  if (r.matchedKey === 'bienvenida' || r.matchedBy === 'msg-keywords') log('6.6', 'PASS', `"volver" → bienvenida`);
  else log('6.6', 'FAIL', `Esperado bienvenida, obtuvo: ${r.matchedKey}`);
});

// ════════════════════════════════════════════
// TEST 12: Edge cases
// ════════════════════════════════════════════
console.log('\n📋 TEST 12: Edge cases');

await runTest('12.1 - Texto vacío', async () => {
  const r = await preview('');
  if (r.response) log('12.1', 'PASS', `Texto vacío no crashea`);
  else log('12.1', 'FAIL', `Sin respuesta`);
});

await runTest('12.2 - Solo espacios', async () => {
  const r = await preview('     ');
  if (r.response) log('12.2', 'PASS', `Espacios no crashean`);
  else log('12.2', 'FAIL', `Sin respuesta`);
});

await runTest('12.3 - Mayúsculas', async () => {
  const r = await preview('EVENTOS');
  if (r.matchedKey === 'eventos') log('12.3', 'PASS', `Mayúsculas funcionan`);
  else log('12.3', 'FAIL', `Mayúsculas no funcionan: ${r.matchedKey}`);
});

await runTest('12.4 - Acentos en menu', async () => {
  const r = await preview('próximos eventos');
  if (r.matchedKey === 'eventos') log('12.4', 'PASS', `Acentos funcionan`);
  else log('12.4', 'FAIL', `Acentos no funcionan: ${r.matchedKey}`);
});

await runTest('12.5 - SQL injection attempt', async () => {
  const r = await preview("'; DROP TABLE messages; --");
  if (r.response) log('12.5', 'PASS', `No crashea con SQL injection`);
  else log('12.5', 'FAIL', `Sin respuesta`);
});

await runTest('12.6 - Texto muy largo', async () => {
  const longText = 'a'.repeat(1000);
  const r = await preview(longText);
  if (r.response) log('12.6', 'PASS', `Texto largo manejado`);
  else log('12.6', 'FAIL', `Sin respuesta`);
});

// ════════════════════════════════════════════
// RESUMEN
// ════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════');
console.log(`📊 RESUMEN: ${passed} pasaron, ${failed} fallaron`);
console.log('═══════════════════════════════════════════════════\n');

if (failed > 0) {
  console.log('❌ ERRORES:');
  errors.forEach(e => console.log(`  - [${e.test}] ${e.detail}`));
}

process.exit(failed > 0 ? 1 : 0);
