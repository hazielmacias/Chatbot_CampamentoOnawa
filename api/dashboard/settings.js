import { getAllContacts } from '../../src/lib/db.js';

// Default settings
const defaultSettings = {
  welcomeMessage: '¡Hola! Bienvenido a Campamento Onawa. Soy tu asistente virtual y te ayudaré con toda la información que necesites. ¿En qué puedo ayudarte?',
  autoResponses: [
    { keyword: 'precio', response: 'Nuestros paquetes van desde $2,500 hasta $8,500 MXN por persona. Puedo enviarte más detalles o conectarte con un asesor.' },
    { keyword: 'ubicacion', response: 'Estamos ubicados en Valle de Bravo, Estado de México. A solo 2 horas de la CDMX.' },
    { keyword: 'actividades', response: 'Contamos con más de 20 actividades: tirolesa, cabalgatas, kayak, pesca, fogatas, senderismo, y muchas más.' },
    { keyword: 'reservar', response: 'Puedes hacer tu reservación directamente por aquí o conectarte con un asesor para asistencia personalizada.' }
  ],
  interestKeywords: ['precio', 'costo', 'reservar', 'reservacion', 'cita', 'visitar', 'interesado', 'me interesa', 'quiero ir', 'cuando'],
  advisorNumber: '+5215530086410',
  escalationMessage: 'Te voy a conectar con un asesor especializado que te brindará toda la información personalizada.',
  escalationThreshold: 5,
  notifications: {
    newConversations: true,
    escalated: true,
    interested: true,
    soundEnabled: false
  }
};

// In-memory settings storage (will reset on server restart)
let settings = { ...defaultSettings };

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      return res.status(200).json({
        settings,
        defaults: defaultSettings
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Error', message: error.message });
    }
  }
  
  if (req.method === 'POST') {
    try {
      const { setting, value } = req.body;
      
      if (setting) {
        // Update specific setting
        settings[setting] = value;
      } else {
        // Update all settings
        settings = { ...settings, ...req.body };
      }
      
      return res.status(200).json({ 
        success: true, 
        settings,
        message: 'Configuración guardada exitosamente'
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Error', message: error.message });
    }
  }
  
  if (req.method === 'DELETE') {
    try {
      settings = { ...defaultSettings };
      return res.status(200).json({ 
        success: true, 
        settings,
        message: 'Configuración restaurada a valores por defecto'
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Error', message: error.message });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
