import db from '../../src/lib/db.js';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { search, status, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    
    if (search) {
      where.OR = [
        { phone: { contains: search } },
        { name: { contains: search } }
      ];
    }
    
    if (status === 'escalated') {
      where.isEscalated = true;
    } else if (status === 'interested') {
      where.isInterested = true;
    } else if (status === 'active') {
      where.isEscalated = false;
    }

    const [conversations, total] = await Promise.all([
      db.contact.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          _count: {
            select: { messages: true }
          }
        }
      }),
      db.contact.count({ where })
    ]);

    return res.status(200).json({
      conversations,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default handler;
