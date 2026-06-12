import db from '../../src/lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const totalConversations = await db.contact.count();
    const totalMessages = await db.message.count();
    const escalatedCount = await db.contact.count({
      where: { isEscalated: true }
    });
    const interestedCount = await db.contact.count({
      where: { isInterested: true }
    });

    const messagesToday = await db.message.count({
      where: {
        timestamp: { gte: today }
      }
    });

    const newConversationsToday = await db.contact.count({
      where: {
        firstContactAt: { gte: today }
      }
    });

    const escalationsThisWeek = await db.escalation.count({
      where: {
        escalatedAt: { gte: weekAgo }
      }
    });

    const recentConversations = await db.contact.findMany({
      orderBy: { lastMessageAt: 'desc' },
      take: 10,
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });

    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const count = await db.contact.count({
        where: {
          firstContactAt: {
            gte: date,
            lt: nextDate
          }
        }
      });
      
      dailyStats.push({
        date: date.toISOString().split('T')[0],
        conversations: count
      });
    }

    return res.status(200).json({
      stats: {
        totalConversations,
        totalMessages,
        escalatedCount,
        interestedCount,
        messagesToday,
        newConversationsToday,
        escalationsThisWeek
      },
      recentConversations,
      dailyStats
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
