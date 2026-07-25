import { config } from 'dotenv';
config();

const BASE = 'https://chatbot-campamento-onawa.vercel.app';
const PHONE = '525555555555'; // Número de prueba
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

async function sendRealMessage(text) {
  const payload = {
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: PHONE,
            type: 'text',
            text: { body: text }
          }],
          contacts: [{
            profile: { name: 'Test User' }
          }]
        }
      }]
    }]
  };
  const r = await fetch(`${BASE}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return r.status;
}

async function getRecentMessages() {
  const r = await fetch(`${BASE}/api/dashboard/conversation?phone=${PHONE}`, {
    headers: { 'Authorization': AUTH }
  });
  const j = await r.json();
  return { messages: j.contact?.onawaMessages || [] };
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getLastBotMessage() {
  await wait(2500);
  const conv = await getRecentMessages();
  const messages = conv.messages || [];
  return messages.filter(m => m.direction === 'outbound').pop();
}

async function runTest(name, fn) {
  try {
    await fn();
  } catch (e) {
    log(name, 'FAIL', `Error: ${e.message}`);
  }
}

console.log('\n═══════════════════════════════════════════════════');
console.log('🧪 TESTING INTEGRACIÓN - Webhook Real');
console.log('═══════════════════════════════════════════════════\n');

// ════════════════════════════════════════════
// TEST 1: Flujo básico
// ════════════════════════════════════════════
console.log('📋 TEST 1: Flujo básico');

await runTest('1.1 - "eventos" envía lista de eventos', async () => {
  await sendRealMessage('eventos');
  const lastBot = await getLastBotMessage();
  if (lastBot?.content?.includes('Próximos Eventos')) log('1.1', 'PASS', `Lista enviada`);
  else log('1.1', 'FAIL', `Sin contenido de eventos`);
});

await runTest('1.2 - "5" envía asesor', async () => {
  await sendRealMessage('5');
  const lastBot = await getLastBotMessage();
  if (lastBot?.content?.includes('Coordinador')) log('1.2', 'PASS', `Asesor enviado`);
  else log('1.2', 'FAIL', `Sin asesor: ${lastBot?.content?.slice(0,100)}`);
});

await runTest('1.3 - "gracias" envía despedida', async () => {
  await sendRealMessage('gracias');
  const lastBot = await getLastBotMessage();
  if (lastBot?.content?.includes('Gracias')) log('1.3', 'PASS', `Despedida enviada`);
  else log('1.3', 'FAIL', `Sin despedida`);
});

// ════════════════════════════════════════════
// TEST 2: Mensajes no-texto
// ════════════════════════════════════════════
console.log('\n📋 TEST 2: Mensajes no-texto');

await runTest('2.1 - Audio', async () => {
  const payload = {
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: PHONE,
            type: 'audio',
            audio: { id: 'test123' }
          }]
        }
      }]
    }]
  };
  await fetch(`${BASE}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const lastBot = await getLastBotMessage();
  if (lastBot?.content?.includes('texto')) log('2.1', 'PASS', `Audio manejado`);
  else log('2.1', 'FAIL', `Audio no manejado: ${lastBot?.content?.slice(0,100)}`);
});

await runTest('2.2 - Imagen', async () => {
  const payload = {
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: PHONE,
            type: 'image',
            image: { id: 'test456' }
          }]
        }
      }]
    }]
  };
  await fetch(`${BASE}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const lastBot = await getLastBotMessage();
  if (lastBot?.content?.includes('texto')) log('2.2', 'PASS', `Imagen manejada`);
  else log('2.2', 'FAIL', `Imagen no manejada`);
});

// ════════════════════════════════════════════
// TEST 3: Flujo con contexto conversacional
// ════════════════════════════════════════════
console.log('\n📋 TEST 3: Flujo con contexto');

await runTest('3.1 - Usuario pregunta por eventos', async () => {
  await sendRealMessage('eventos');
  const lastBot = await getLastBotMessage();
  if (lastBot?.content?.includes('Karaoke')) log('3.1', 'PASS', `Eventos enviados`);
  else log('3.1', 'FAIL', `Sin eventos`);
});

await runTest('3.2 - Usuario responde "si" tras eventos', async () => {
  await sendRealMessage('si');
  const lastBot = await getLastBotMessage();
  if (lastBot?.content?.includes('Coordinador') || lastBot?.content?.includes('asesor')) {
    log('3.2', 'PASS', `Contexto detectado → asesor`);
  } else {
    log('3.2', 'FAIL', `Sin contexto: ${lastBot?.content?.slice(0,100)}`);
  }
});

await runTest('3.3 - Usuario dice nombre de evento', async () => {
  await sendRealMessage('eventos');
  await getLastBotMessage();
  await sendRealMessage('Karaoke');
  const lastBot = await getLastBotMessage();
  if (lastBot?.content?.includes('Coordinador') || lastBot?.content?.includes('asesor')) {
    log('3.3', 'PASS', `Karaoke detectado como interés`);
  } else {
    log('3.3', 'FAIL', `Karaoke no escaló: ${lastBot?.content?.slice(0,100)}`);
  }
});

// ════════════════════════════════════════════
// TEST 4: Conversación con keywords
// ════════════════════════════════════════════
console.log('\n📋 TEST 4: Conversación con keywords');

await runTest('4.1 - "horario" envía info de horario', async () => {
  await sendRealMessage('horario');
  const lastBot = await getLastBotMessage();
  if (lastBot?.content?.includes('8:00 am')) log('4.1', 'PASS', `Horario enviado`);
  else log('4.1', 'FAIL', `Sin horario: ${lastBot?.content?.slice(0,100)}`);
});

await runTest('4.2 - "donde" envía ubicación', async () => {
  await sendRealMessage('donde');
  const lastBot = await getLastBotMessage();
  if (lastBot?.content?.includes('Villa del Carbón')) log('4.2', 'PASS', `Ubicación enviada`);
  else log('4.2', 'FAIL', `Sin ubicación: ${lastBot?.content?.slice(0,100)}`);
});

// ════════════════════════════════════════════
// RESUMEN
// ════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════');
console.log(`📊 RESUMEN INTEGRACIÓN: ${passed} pasaron, ${failed} fallaron`);
console.log('═══════════════════════════════════════════════════\n');

if (failed > 0) {
  console.log('❌ ERRORES:');
  errors.forEach(e => console.log(`  - [${e.test}] ${e.detail}`));
}

process.exit(failed > 0 ? 1 : 0);
