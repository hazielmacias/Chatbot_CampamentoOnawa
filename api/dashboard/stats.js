import db from '../../src/lib/db.js';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Estadísticas generales
    const totalConversations = await db.contact.count();
    const totalMessages = await db.message.count();
    const escalatedCount = await db.contact.count({
      where: { isEscalated: true }
    });
    const interestedCount = await db.contact.count({
      where: { isInterested: true }
    });

    // Mensajes de hoy
    const messagesToday = await db.message.count({
      where: {
        timestamp: { gte: today }
      }
    });

    // Conversaciones nuevas hoy
    const newConversationsToday = await db.contact.count({
      where: {
        firstContactAt: { gte: today }
      }
    });

    // Escalamientos esta semana
    const escalationsThisWeek = await db.escalation.count({
      where: {
        escalatedAt: { gte: weekAgo }
      }
    });

    // Conversaciones recientes (últimas 10)
    const recentConversations = await db.contact.findMany({
      orderBy: { lastMessageAt: 'desc' },
      take: 10,
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });

    // Conversaciones por día (últimos 7 días)
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
};

export default handler;
