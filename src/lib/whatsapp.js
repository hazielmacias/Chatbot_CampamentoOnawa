import axios from 'axios';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0';

const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN;

export async function sendMessage(to, text) {
  const url = `${WHATSAPP_API_URL}/${PHONE_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: formatPhoneNumber(to),
    type: 'text',
    text: { body: text }
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    throw error;
  }
}

export async function sendTemplateMessage(to, templateName, components = []) {
  const url = `${WHATSAPP_API_URL}/${PHONE_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: formatPhoneNumber(to),
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'es_MX' },
      components
    }
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error sending template message:', error.response?.data || error.message);
    throw error;
  }
}

function formatPhoneNumber(phone) {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned.startsWith('52')) {
    cleaned = '52' + cleaned;
  }
  if (!cleaned.startsWith('521')) {
    cleaned = '521' + cleaned.slice(2);
  }
  return cleaned;
}

export default { sendMessage, sendTemplateMessage };