import pool from '../../src/lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { search, status } = req.query;
    let where = 'WHERE 1=1';
    
    if (search) {
      where += ` AND (phone ILIKE '%${search}%' OR name ILIKE '%${search}%')`;
    }
    
    if (status === 'escalated') {
      where += ' AND is_escalated = true';
    } else if (status === 'interested') {
      where += ' AND is_interested = true';
    }

    const result = await pool.query(
      `SELECT c.*, COUNT(m.id) as message_count 
       FROM onawa_contacts c 
       LEFT JOIN onawa_messages m ON c.id = m.contact_id 
       ${where}
       GROUP BY c.id 
       ORDER BY c.last_message_at DESC 
       LIMIT 50`
    );

    return res.status(200).json({
      conversations: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Database error', message: error.message });
  }
}
