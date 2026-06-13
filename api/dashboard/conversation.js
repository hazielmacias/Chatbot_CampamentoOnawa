import { getContact } from '../../src/lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ error: 'Phone is required' });
    }

    const contact = await getContact(phone);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    return res.status(200).json({ contact });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Error', message: error.message });
  }
}
