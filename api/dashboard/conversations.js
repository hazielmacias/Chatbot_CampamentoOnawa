import { getAllContacts } from '../../src/lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { search, status } = req.query;
    let contacts = await getAllContacts();

    if (search) {
      const lowerSearch = search.toLowerCase();
      contacts = contacts.filter(c =>
        c.phone.toLowerCase().includes(lowerSearch)
      );
    }

    if (status === 'escalated') {
      contacts = contacts.filter(c => c.isEscalated);
    } else if (status === 'interested') {
      contacts = contacts.filter(c => c.isInterested);
    }

    const conversations = contacts.map(c => ({
      id: c.id,
      phone: c.phone,
      name: c.name,
      status: c.status,
      isEscalated: c.isEscalated,
      isInterested: c.isInterested,
      createdAt: c.createdAt,
      lastMessageAt: c.lastMessageAt,
      message_count: c.messages.length,
      last_message: c.messages.length > 0
        ? c.messages[c.messages.length - 1].content.slice(0, 100)
        : null,
      messages: c.messages.map(m => ({
        id: m.id,
        direction: m.direction,
        content: m.content,
        timestamp: m.timestamp,
        messageType: m.messageType
      }))
    }));

    return res.status(200).json({
      conversations,
      total: conversations.length
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Error', message: error.message });
  }
}
