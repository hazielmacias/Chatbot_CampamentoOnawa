import { sendMessage } from '../lib/whatsapp.js';
import db from '../lib/db.js';
import { detectIntent, getResponse, isEscalationIntent, getEscalationReason } from './decisionTree.js';

export async function handleIncomingMessage(phone, text, messageId) {
  try {
    // 1. Buscar o crear contacto
    let contact = await db.contact.findUnique({
      where: { phone }
    });

    if (!contact) {
      contact = await db.contact.create({
        data: {
          phone,
          name: null,
          status: 'active',
          isEscalated: false,
          isInterested: false,
          firstContactAt: new Date(),
          lastMessageAt: new Date()
        }
      });
    } else {
      // Actualizar lastMessageAt
      await db.contact.update({
        where: { id: contact.id },
        data: { lastMessageAt: new Date() }
      });
    }

    // 2. Guardar mensaje entrante
    await db.message.create({
      data: {
        contactId: contact.id,
        direction: 'inbound',
        content: text,
        messageType: 'text',
        timestamp: new Date()
      }
    });

    // 3. Detectar intención
    const intent = detectIntent(text);
    const response = getResponse(intent);

    // 4. Enviar respuesta
    await sendMessage(phone, response);

    // 5. Guardar respuesta saliente
    await db.message.create({
      data: {
        contactId: contact.id,
        direction: 'outbound',
        content: response,
        messageType: 'text',
        timestamp: new Date()
      }
    });

    // 6. Verificar si necesita escalamiento
    if (isEscalationIntent(intent)) {
      await handleEscalation(contact, intent, text);
    }

    return { success: true, intent };
  } catch (error) {
    console.error('Error handling message:', error);
    
    // Enviar mensaje de error amigable
    try {
      await sendMessage(phone, 'Lo siento, hubo un error procesando tu mensaje. Por favor, intenta de nuevo o escribe "asesor" para hablar con alguien. 😊');
    } catch (sendError) {
      console.error('Error sending error message:', sendError);
    }
    
    return { success: false, error: error.message };
  }
}

async function handleEscalation(contact, intent, originalText) {
  const advisorPhone = process.env.ADVISOR_PHONE;
  
  if (!advisorPhone) {
    console.error('No advisor phone configured');
    return;
  }

  // Verificar si ya fue escalado recientemente (24h)
  const recentEscalation = await db.escalation.findFirst({
    where: {
      contactId: contact.id,
      escalatedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    }
  });

  if (recentEscalation) {
    console.log('Contact already escalated recently:', contact.phone);
    return;
  }

  // Crear registro de escalamiento
  const escalation = await db.escalation.create({
    data: {
      contactId: contact.id,
      reason: getEscalationReason(intent),
      escalatedAt: new Date(),
      advisorNotified: false,
      advisorPhone: advisorPhone
    }
  });

  // Actualizar contacto
  await db.contact.update({
    where: { id: contact.id },
    data: { 
      isEscalated: true,
      isInterested: intent === 'interest'
    }
  });

  // Notificar al asesor
  const lastMessages = await db.message.findMany({
    where: { contactId: contact.id },
    orderBy: { timestamp: 'desc' },
    take: 5
  });

  const conversationSummary = lastMessages
    .reverse()
    .map(m => `${m.direction === 'inbound' ? '👤' : '🤖'} ${m.content}`)
    .join('\n');

  const advisorMessage = `🚨 *Nuevo lead - Campamento Onawa*

📱 *Teléfono:* ${contact.phone}
📅 *Fecha:* ${new Date().toLocaleString('es-MX')}
🎯 *Motivo:* ${escalation.reason}
💬 *Mensaje original:* ${originalText}

*Última conversación:*
${conversationSummary}

*Acción:* Contactar al interesado lo antes posible.`;

  try {
    await sendMessage(advisorPhone, advisorMessage);
    
    await db.escalation.update({
      where: { id: escalation.id },
      data: { advisorNotified: true }
    });
    
    console.log('Advisor notified successfully:', advisorPhone);
  } catch (error) {
    console.error('Error notifying advisor:', error);
  }
}

export default { handleIncomingMessage };
