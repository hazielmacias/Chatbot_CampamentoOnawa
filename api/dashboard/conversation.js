import db from '../../src/lib/db.js';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    const contact = await db.contact.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' }
        },
        escalations: {
          orderBy: { escalatedAt: 'desc' }
        }
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    return res.status(200).json({ contact });
  } catch (error) {
    console.error('Error getting conversation details:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default handler;
