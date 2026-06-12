import { sendMessage } from '../src/lib/whatsapp.js';
import { getOrCreateContact, saveMessage, markEscalated } from '../src/lib/db.js';

function getResponse(text) {
  const lower = text.toLowerCase();
  
  if (lower.includes('precio') || lower.includes('costo') || lower.includes('cuanto')) {
    return `*💰 Precios Verano 2025*

• 3 días: $7,000 MXN
• 1 semana: $14,000 MXN  
• 2 semanas: $25,000 MXN
• 3 semanas: $32,000 MXN

🎁 Descuentos: 10% pronto pago, 10% hermanos

📆 Del 30 junio al 20 julio 2025`;
  }
  
  if (lower.includes('actividad')) {
    return `*🏊 Actividades*

Kayak, canotaje, natación, vela, basketball, tenis, fútbol, tiro con arco, cabalgatas, campismo, baile, teatro, cerámica, paddle, escalódromo`;
  }
  
  if (lower.includes('instalacion')) {
    return `*🏡 Instalaciones*

10 hectáreas: alberca, lago privado, cabañas, canchas, comedor, enfermería 24/7, seguridad 24/7`;
  }
  
  if (lower.includes('inscribir') || lower.includes('reservar') || lower.includes('interesa') || lower.includes('quiero') || lower.includes('asesor')) {
    return `¡Que emoción! 🎉

Te conecto con un asesor personal:
📱 +52 1 55 3008 6410

Te contactará pronto.`;
  }
  
  if (lower.includes('fecha') || lower.includes('cuando')) {
    return `*📆 Temporadas 2025*

• Inicio: 30 junio
• Fin: 20 julio

Opciones: 3 días, 1, 2 o 3 semanas`;
  }
  
  if (lower.includes('seguridad')) {
    return `*🛡️ Seguridad*

• Seguridad 24h
• Enfermería 24/7
• Seguro médico incluido
• Personal capacitado`;
  }
  
  if (lower.includes('edad') || lower.includes('requisito')) {
    return `*📄 Requisitos*

• Edad: 6 a 17 años
• Certificado médico
• Lista de equipamiento
• Ganas de divertirse`;
  }
  
  if (lower.includes('ubicacion') || lower.includes('donde')) {
    return `*📍 Ubicación*

Valle de Bravo, Estado de México

🚐 Transporte incluido desde CdMx (Polanco)`;
  }
  
  if (lower.includes('gracias') || lower.includes('adios')) {
    return `¡Gracias por contactar Campamento Onawa! 🏕️

¿Algo más en lo que pueda ayudarte?`;
  }
  
  return `¡Hola! 👋 Soy el asistente de *Campamento Onawa* 🏕️

¿En qué puedo ayudarte?

• Precios 💰
• Actividades 🏊  
• Instalaciones 🏡
• Fechas 📆
• Seguridad 🛡️
• Edad/Requisitos 📄
• Ubicación 📍

Escribe tu pregunta o "asesor" para hablar con alguien 👨‍💼`;
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
      const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (!message) return res.status(200).send('OK');
      
      const phone = message.from;
      const text = message.text?.body || '';
      
      getOrCreateContact(phone);
      saveMessage(phone, 'inbound', text);
      
      const response = getResponse(text);
      await sendMessage(phone, response);
      saveMessage(phone, 'outbound', response);
      
      if (text.toLowerCase().includes('inscribir') || 
          text.toLowerCase().includes('reservar') || 
          text.toLowerCase().includes('interesa') ||
          text.toLowerCase().includes('quiero') ||
          text.toLowerCase().includes('asesor')) {
        markEscalated(phone);
        const advisorPhone = process.env.ADVISOR_PHONE;
        if (advisorPhone) {
          await sendMessage(advisorPhone, 
            `🚨 Nuevo lead - Campamento Onawa\n📱 ${phone}\n💬 ${text}\n\nContactar urgente.`
          );
        }
      }
      
      return res.status(200).send('OK');
    } catch (error) {
      console.error('Error:', error);
      return res.status(200).send('OK');
    }
  }
  
  return res.status(405).send('Method Not Allowed');
}
