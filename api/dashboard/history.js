import { getAllContacts } from '../../src/lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { days = 30 } = req.query;
    const contacts = getAllContacts();
    const daysInt = parseInt(days);
    
    // Generate date range
    const today = new Date();
    const dates = [];
    for (let i = daysInt - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    // Calculate daily stats
    const dailyStats = dates.map(date => {
      const dayConversations = contacts.filter(c => {
        const cDate = new Date(c.createdAt).toISOString().split('T')[0];
        return cDate === date;
      });
      
      const dayMessages = contacts.reduce((acc, c) => {
        const cMsgs = c.messages.filter(m => {
          const mDate = new Date(m.timestamp).toISOString().split('T')[0];
          return mDate === date;
        });
        return acc + cMsgs.length;
      }, 0);
      
      const inboundMessages = contacts.reduce((acc, c) => {
        const cMsgs = c.messages.filter(m => {
          const mDate = new Date(m.timestamp).toISOString().split('T')[0];
          return mDate === date && m.direction === 'inbound';
        });
        return acc + cMsgs.length;
      }, 0);
      
      const outboundMessages = contacts.reduce((acc, c) => {
        const cMsgs = c.messages.filter(m => {
          const mDate = new Date(m.timestamp).toISOString().split('T')[0];
          return mDate === date && m.direction === 'outbound';
        });
        return acc + cMsgs.length;
      }, 0);
      
      return {
        date,
        conversations: dayConversations.length,
        messages: dayMessages,
        inbound: inboundMessages,
        outbound: outboundMessages
      };
    });
    
    // Calculate status distribution
    const statusDistribution = {
      active: contacts.filter(c => !c.isEscalated && !c.isInterested).length,
      interested: contacts.filter(c => c.isInterested && !c.isEscalated).length,
      escalated: contacts.filter(c => c.isEscalated).length
    };
    
    // Calculate hourly activity (last 24h)
    const hourlyActivity = Array.from({ length: 24 }, (_, i) => {
      const hourMessages = contacts.reduce((acc, c) => {
        const cMsgs = c.messages.filter(m => {
          const mDate = new Date(m.timestamp);
          const mHour = mDate.getHours();
          return mHour === i;
        });
        return acc + cMsgs.length;
      }, 0);
      
      return { hour: i, messages: hourMessages };
    });
    
    // Calculate top keywords (from inbound messages)
    const allMessages = contacts.flatMap(c => c.messages.filter(m => m.direction === 'inbound'));
    const keywords = {};
    const interestWords = ['precio', 'costo', 'reservar', 'reservacion', 'actividades', 'ubicacion', 'cuando', 'disponible', 'informacion', 'hola', 'gracias'];
    
    allMessages.forEach(msg => {
      const words = msg.content.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (interestWords.some(kw => word.includes(kw))) {
          const cleanWord = word.replace(/[^a-záéíóúñ]/g, '');
          if (cleanWord.length > 2) {
            keywords[cleanWord] = (keywords[cleanWord] || 0) + 1;
          }
        }
      });
    });
    
    const topKeywords = Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
    
    return res.status(200).json({
      dailyStats,
      statusDistribution,
      hourlyActivity,
      topKeywords,
      summary: {
        totalConversations: contacts.length,
        totalMessages: contacts.reduce((acc, c) => acc + c.messages.length, 0),
        avgMessagesPerConversation: contacts.length > 0 
          ? (contacts.reduce((acc, c) => acc + c.messages.length, 0) / contacts.length).toFixed(1)
          : 0,
        responseRate: contacts.length > 0
          ? ((contacts.filter(c => c.messages.some(m => m.direction === 'outbound')).length / contacts.length) * 100).toFixed(1)
          : 0
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Error', message: error.message });
  }
}
