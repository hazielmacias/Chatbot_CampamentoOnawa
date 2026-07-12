const tests = [
  {
    name: 'URL viejo manual_reply (debe funcionar con fallback)',
    url: 'https://chatbot-campamento-onawa.vercel.app/api/webhook',
    method: 'POST',
    body: JSON.stringify({ type: 'manual_reply', phone: '5215528426523', message: 'test con fallback ' + Date.now() })
  },
  {
    name: 'URL nuevo manual_reply (sigue funcionando)',
    url: 'https://chatbot-campamento-onawa-ly3i.vercel.app/api/webhook',
    method: 'POST',
    body: JSON.stringify({ type: 'manual_reply', phone: '5215528426523', message: 'test nuevo ' + Date.now() })
  }
];

for (const t of tests) {
  console.log(`\n=== ${t.name} ===`);
  try {
    const response = await fetch(t.url, {
      method: t.method,
      headers: { 'Content-Type': 'application/json' },
      body: t.body
    });
    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Body:', text);
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}
process.exit(0);
