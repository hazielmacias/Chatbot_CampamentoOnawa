export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified successfully');
      return res.status(200).send(challenge);
    }
    console.log('Webhook verification failed');
    return res.status(403).send('Forbidden');
  }

  if (req.method === 'POST') {
    try {
      const entry = req.body.entry?.[0];
      const changes = entry?.changes?.[0];
      const message = changes?.value?.messages?.[0];

      if (!message) {
        return res.status(200).send('OK');
      }

      const phone = message.from;
      const text = message.text?.body || '';
      const messageId = message.id;

      console.log(`Received message from ${phone}: ${text}`);

      const { handleIncomingMessage } = await import('../src/bot/messageHandler.js');
      await handleIncomingMessage(phone, text, messageId);

      return res.status(200).send('OK');
    } catch (error) {
      console.error('Error processing webhook:', error);
      return res.status(200).send('OK');
    }
  }

  return res.status(405).send('Method Not Allowed');
}
