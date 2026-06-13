import { getAllContacts } from '../../src/lib/db.js';

// Generate alerts automatically based on conversations
async function generateAlerts() {
  const contacts = await getAllContacts();
  const alerts = [];

  contacts.forEach(contact => {
    // Alert for new conversation
    if (contact.messages.length === 1) {
      alerts.push({
        id: `new_${contact.phone}`,
        type: 'new_conversation',
        title: 'Nueva conversación',
        description: `${contact.phone} inició una conversación`,
        phone: contact.phone,
        timestamp: contact.messages[0].timestamp,
        read: false,
        severity: 'info'
      });
    }

    // Alert for escalated conversation
    if (contact.isEscalated) {
      const lastMsg = contact.messages[contact.messages.length - 1];
      alerts.push({
        id: `escalated_${contact.phone}`,
        type: 'escalated',
        title: 'Conversación escalada',
        description: `${contact.phone} fue derivado al asesor`,
        phone: contact.phone,
        timestamp: lastMsg.timestamp,
        read: false,
        severity: 'high'
      });
    }

    // Alert for interested user
    if (contact.isInterested && !contact.isEscalated) {
      const lastMsg = contact.messages[contact.messages.length - 1];
      alerts.push({
        id: `interested_${contact.phone}`,
        type: 'interested',
        title: 'Usuario interesado',
        description: `${contact.phone} mostró interés en el campamento`,
        phone: contact.phone,
        timestamp: lastMsg.timestamp,
        read: false,
        severity: 'medium'
      });
    }

    // Alert for many messages (high engagement)
    if (contact.messages.length >= 5 && !contact.isEscalated) {
      const lastMsg = contact.messages[contact.messages.length - 1];
      alerts.push({
        id: `engaged_${contact.phone}`,
        type: 'engaged',
        title: 'Alta interacción',
        description: `${contact.phone} tiene ${contact.messages.length} mensajes`,
        phone: contact.phone,
        timestamp: lastMsg.timestamp,
        read: false,
        severity: 'low'
      });
    }
  });

  // Sort by timestamp desc
  return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { type, read } = req.query;
      let alerts = await generateAlerts();

      if (type) {
        alerts = alerts.filter(a => a.type === type);
      }

      if (read !== undefined) {
        const isRead = read === 'true';
        alerts = alerts.filter(a => a.read === isRead);
      }

      return res.status(200).json({
        alerts,
        total: alerts.length,
        unread: alerts.filter(a => !a.read).length
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Error', message: error.message });
    }
  }
  
  if (req.method === 'POST') {
    // Mark alert as read (simulated - in real app would persist to DB)
    try {
      const { alertId } = req.body;
      return res.status(200).json({ success: true, message: 'Alert marked as read' });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Error', message: error.message });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
