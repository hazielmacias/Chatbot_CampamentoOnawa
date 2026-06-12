import pool from '../../src/lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const totalConversations = (await pool.query('SELECT COUNT(*) FROM onawa_contacts')).rows[0].count;
    const totalMessages = (await pool.query('SELECT COUNT(*) FROM onawa_messages')).rows[0].count;
    const escalatedCount = (await pool.query('SELECT COUNT(*) FROM onawa_contacts WHERE is_escalated = true')).rows[0].count;
    const interestedCount = (await pool.query('SELECT COUNT(*) FROM onawa_contacts WHERE is_interested = true')).rows[0].count;

    const recentConversations = (await pool.query(
      `SELECT c.*, COUNT(m.id) as message_count 
       FROM onawa_contacts c 
       LEFT JOIN onawa_messages m ON c.id = m.contact_id 
       GROUP BY c.id 
       ORDER BY c.last_message_at DESC 
       LIMIT 10`
    )).rows;

    return res.status(200).json({
      stats: {
        totalConversations: parseInt(totalConversations),
        totalMessages: parseInt(totalMessages),
        escalatedCount: parseInt(escalatedCount),
        interestedCount: parseInt(interestedCount)
      },
      recentConversations
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Database error', message: error.message });
  }
}
