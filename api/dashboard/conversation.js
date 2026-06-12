import pool from '../../src/lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    const contact = (await pool.query(
      'SELECT * FROM onawa_contacts WHERE id = $1',
      [id]
    )).rows[0];

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const messages = (await pool.query(
      `SELECT * FROM onawa_messages WHERE contact_id = $1 ORDER BY timestamp ASC`,
      [id]
    )).rows;

    return res.status(200).json({ contact: { ...contact, messages } });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Database error', message: error.message });
  }
}
