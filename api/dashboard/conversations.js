import { getAllContacts } from '../../src/lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { search, status } = req.query;
    let contacts = getAllContacts();
    
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

    contacts = contacts
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(c => ({
        ...c,
        message_count: c.messages.length
      }));

    return res.status(200).json({
      conversations: contacts,
      total: contacts.length
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Error', message: error.message });
  }
}
