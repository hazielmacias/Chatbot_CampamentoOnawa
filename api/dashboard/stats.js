import { getAllContacts } from '../../src/lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const contacts = await getAllContacts();

    const totalConversations = contacts.length;
    const totalMessages = contacts.reduce((acc, c) => acc + c.messages.length, 0);
    const escalatedCount = contacts.filter(c => c.isEscalated).length;
    const interestedCount = contacts.filter(c => c.isInterested).length;

    const recentConversations = contacts
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        phone: c.phone,
        name: c.name,
        status: c.status,
        isEscalated: c.isEscalated,
        isInterested: c.isInterested,
        createdAt: c.createdAt,
        lastMessageAt: c.lastMessageAt,
        message_count: c.messages.length
      }));

    return res.status(200).json({
      stats: {
        totalConversations,
        totalMessages,
        escalatedCount,
        interestedCount
      },
      recentConversations
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Error', message: error.message });
  }
}
