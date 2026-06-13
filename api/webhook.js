import { sendMessage } from '../src/lib/whatsapp.js';
import { getOrCreateContact, saveMessage, markEscalated } from '../src/lib/db.js';

function getResponse(text) {
  const lower = text.toLowerCase().trim();
  
  // Menu triggers
  if (lower === 'menu' || lower === 'hola' || lower === 'inicio' || lower === '0') {
    return `¡Hola! 👋 Bienvenido a *Campamento Onawa* 🌲
Soy tu asistente virtual y estoy aquí para ayudarte.

*¿Qué te gustaría conocer?*
1️⃣ *Preventa y Beneficios* - Membresías y precios
2️⃣ *Actividades* - Todo lo que puedes hacer
3️⃣ *Instalaciones* - Lo que ya tenemos listo
4️⃣ *Próximos Eventos* - Fechas importantes
5️⃣ *Hablar con un Asesor* - Atención personalizada

Escribe el número o tu pregunta 👇`;
  }
  
  // Number shortcuts
  if (lower === '1' || lower === '1️⃣') {
    return `*💰 Membresías Campamento Onawa*
Nuestras membresías te dan acceso *365 días del año* de 8:00 am a 6:00 pm.

*📋 Niveles disponibles:*
*Nivel Plata* 💎
$14,950 | 10 años | 10% descuento
*Nivel Oro* 🥇
$29,560 | 25 años | 15% descuento
*Nivel Platino* 🏆
$58,200 | 50 años | 20% descuento
*Nivel Diamante* 💎
$117,640 | 100 años | 25% descuento

*📌 Incluye:*
• Cuota de mantenimiento: $600/beneficiario, $300/familiar
• Membresía transferible, vendible y heredable
• Certificado de *Miembro Fundador*
• Primer pago de mantenimiento: *enero 2027*
*✅ El descuento aplica en:* Consumo, atracciones, servicios y promociones

¿Te gustaría que un asesor te contacte?`;
  }
  
  if (lower === '2' || lower === '2️⃣') {
    return `*🏃 Actividades Disponibles*

*🎯 Deportes y Aventura:*
• Exatlón (campo de obstáculos)
• Tiro con arco y tiro con hacha
• Gotcha
• Cancha de fútbol
• Senderismo entre pinos y encinos
*🌿 Naturaleza y Exploración:*
• Área de campamentos en el bosque
• Lago natural (peces, tortugas, ranas)
• Granja didáctica
• Paseo a caballo
*🎮 Juegos y Recreación:*
• Minigolf
• Juegos gigantes (ajedrez, dominó, jenga)
• Aqua Esferas
• Área infantil
• Brincolines
• Área de hamacas
*🍽️ Servicios Actuales:*
• Restaurante y Salón de Eventos (50% capacidad)
• Estacionamiento y sanitarios

*🔜 Próximamente:* Tirolesas, muro de escalar, pádel, tenis, tren, ciclismo y albercas

¿Te interesa alguna actividad?`;
  }
  
  if (lower === '3' || lower === '3️⃣') {
    return `*🏡 Instalaciones - Lo que ya tenemos listo*
• Restaurante y Salón de Eventos
• Área de campamentos en el bosque
• Lago natural
• Granja didáctica
• Cancha de fútbol
• Minigolf
• Campo de obstáculos (Exatlón)
• Estacionamiento
• Sanitarios

*🔨 Próximas etapas:*
• Cabañas
• Albercas

*📍 Ubicación:* Bosque de Villa del Carbón, Estado de México. A 2 km del centro del pueblo mágico.

¿Te gustaría agendar una visita?`;
  }
  
  if (lower === '4' || lower === '4️⃣') {
    return `*📆 Acceso y Horario*

*🕗 Horario:*
365 días del año
8:00 am - 6:00 pm

*🎁 Beneficios de Preventa:*
• Certificado de *Miembro Fundador*
• Primer pago de mantenimiento: *enero 2027*

*🍽️ Inauguración del Restaurante:* 30 de mayo de 2026

¿Te gustaría recibir más información?`;
  }
  
  if (lower === '5' || lower === '5️⃣') {
    return `*🎉 ¡Excelente elección!*
Para finalizar tu proceso y asegurar tus beneficios de *Miembro Fundador*, te conecto con nuestro Coordinador de Atención Personalizada.

*👤 Contacto directo:* https://wa.me/525530086410
*📱 O escribe al número:* 55 3008 6410

Mientras tanto, puedo seguir respondiendo tus preguntas.`;
  }
  
  // Text keywords
  if (lower.includes('precio') || lower.includes('costo') || lower.includes('cuanto') || lower.includes('membresia')) {
    return `*💰 Membresías Campamento Onawa*
Nuestras membresías te dan acceso *365 días del año* de 8:00 am a 6:00 pm.

*📋 Niveles disponibles:*
*Nivel Plata* 💎
$14,950 | 10 años | 10% descuento
*Nivel Oro* 🥇
$29,560 | 25 años | 15% descuento
*Nivel Platino* 🏆
$58,200 | 50 años | 20% descuento
*Nivel Diamante* 💎
$117,640 | 100 años | 25% descuento

*📌 Incluye:*
• Cuota de mantenimiento: $600/beneficiario, $300/familiar
• Membresía transferible, vendible y heredable
• Certificado de *Miembro Fundador*
• Primer pago de mantenimiento: *enero 2027*
*✅ El descuento aplica en:* Consumo, atracciones, servicios y promociones

¿Te gustaría que un asesor te contacte?`;
  }
  
  if (lower.includes('actividad')) {
    return `*🏃 Actividades Disponibles*

*🎯 Deportes y Aventura:*
• Exatlón (campo de obstáculos)
• Tiro con arco y tiro con hacha
• Gotcha
• Cancha de fútbol
• Senderismo entre pinos y encinos

*🌿 Naturaleza y Exploración:*
• Área de campamentos en el bosque
• Lago natural (peces, tortugas, ranas)
• Granja didáctica
• Paseo a caballo

*🎮 Juegos y Recreación:*
• Minigolf
• Juegos gigantes (ajedrez, dominó, jenga)
• Aqua Esferas
• Área infantil
• Brincolines
• Área de hamacas

*🍽️ Servicios Actuales:*
• Restaurante y Salón de Eventos (50% capacidad)
• Estacionamiento y sanitarios

*🔜 Próximamente:* Tirolesas, muro de escalar, pádel, tenis, tren, ciclismo y albercas

¿Te interesa alguna actividad?`;
  }
  
  if (lower.includes('instalacion')) {
    return `*🏡 Instalaciones - Lo que ya tenemos listo*
• Restaurante y Salón de Eventos
• Área de campamentos en el bosque
• Lago natural
• Granja didáctica
• Cancha de fútbol
• Minigolf
• Campo de obstáculos (Exatlón)
• Estacionamiento
• Sanitarios

*🔨 Próximas etapas:*
• Cabañas
• Albercas

*📍 Ubicación:* Bosque de Villa del Carbón, Estado de México. A 2 km del centro del pueblo mágico.

¿Te gustaría agendar una visita?`;
  }
  
  if (lower.includes('inscribir') || lower.includes('reservar') || lower.includes('interesa') || lower.includes('quiero') || lower.includes('asesor')) {
    return `*🎉 ¡Excelente elección!*
Para finalizar tu proceso y asegurar tus beneficios de *Miembro Fundador*, te conecto con nuestro Coordinador de Atención Personalizada.

*👤 Contacto directo:* https://wa.me/525530086410
*📱 O escribe al número:* 55 3008 6410

Mientras tanto, puedo seguir respondiendo tus preguntas.`;
  }
  
  if (lower.includes('fecha') || lower.includes('cuando') || lower.includes('evento')) {
    return `*📆 Acceso y Horario*

*🕗 Horario:*
365 días del año
8:00 am - 6:00 pm

*🎁 Beneficios de Preventa:*
• Certificado de *Miembro Fundador*
• Primer pago de mantenimiento: *enero 2027*

*🍽️ Inauguración del Restaurante:* 30 de mayo de 2026

¿Te gustaría recibir más información?`;
  }
  
  if (lower.includes('seguridad')) {
    return `*🛡️ Seguridad y Compromiso*
En Campamento Onawa diseñamos un espacio *sano y seguro* para que toda la familia disfrute de actividades al aire libre.

*🎯 Nuestra Visión:*
Ser reconocidos como el mejor espacio de la zona por nuestro compromiso con la seguridad y el medio ambiente.

*🏥 Próximas Mejoras:*
Etapa 2 de construcción (2026-2027): Integración de enfermería permanente

¿Tienes alguna preocupación específica?`;
  }
  
  if (lower.includes('edad') || lower.includes('requisito')) {
    return `*📄 Requisitos para Acceder*

*✅ Edad:*
Sin límite de edad. Somos un *club deportivo familiar* diseñado para todos.

*📋 Único requisito:*
Adquirir una membresía a largo plazo:
• Plata
• Oro
• Platino
• Diamante

*👨‍👩‍👧‍👦 Incluye:* Registro de familiares en tu membresía
*💰 Adicional:* Cuota de mantenimiento anual por beneficiario y familiar registrado

¿Te gustaría conocer los detalles de cada membresía?`;
  }
  
  if (lower.includes('ubicacion') || lower.includes('donde')) {
    return `*📍 Ubicación*
*Campamento Onawa* - Residencial Campestre y Club Deportivo
Estado de México, México

*📍 Coordenadas:* 19.726313, -99.437399
*🕗 Horario:* Lunes a domingo, 8:00 am a 6:00 pm
*📱 Contacto:* 55 3008 6410

*🔙 Volver al menú:* Escribe *menú* o *0* para regresar al inicio`;
  }
  
  if (lower.includes('gracias') || lower.includes('adios')) {
    return `*🙏 ¡Gracias por tu interés!*
Recuerda que estamos en etapa de *preventa* y es el mejor momento para asegurar tus beneficios de *Miembro Fundador*.

*📅 Cuándo quieras:*
• Agendar una visita familiar
• Hablar con un asesor
• Conocer más detalles

Aquí estaré para ayudarte.

*🌲 Campamento Onawa* - Tu espacio en armonía con la naturaleza
¡Que tengas un excelente día! ☀️`;
  }
  
  return `¡Hola! 👋 Bienvenido a *Campamento Onawa* 🌲
Soy tu asistente virtual y estoy aquí para ayudarte.

*¿Qué te gustaría conocer?*
1️⃣ *Preventa y Beneficios* - Membresías y precios
2️⃣ *Actividades* - Todo lo que puedes hacer
3️⃣ *Instalaciones* - Lo que ya tenemos listo
4️⃣ *Próximos Eventos* - Fechas importantes
5️⃣ *Hablar con un Asesor* - Atención personalizada

Escribe el número o tu pregunta 👇`;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    if (token === process.env.VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }
  
  if (req.method === 'POST') {
    try {
      const value = req.body.entry?.[0]?.changes?.[0]?.value;
      const message = value?.messages?.[0];
      if (!message) return res.status(200).send('OK');
      
      const phone = message.from;
      const profileName = value?.contacts?.[0]?.profile?.name || null;
      const messageType = message.type;
      
      await getOrCreateContact(phone, profileName);
      
      if (messageType !== 'text') {
        const fallback = `¡Hola! 👋 Por el momento solo puedo leer mensajes de *texto*. 

Escribe *menú* para ver las opciones o cuéntame tu pregunta con palabras y te ayudo.`;
        await sendMessage(phone, fallback);
        await saveMessage(phone, 'outbound', fallback, 'text');
        return res.status(200).send('OK');
      }
      
      const text = message.text?.body || '';
      await saveMessage(phone, 'inbound', text, 'text');
      
      const response = getResponse(text);
      await sendMessage(phone, response);
      await saveMessage(phone, 'outbound', response, 'text');
      
      const lower = text.toLowerCase();
      if (lower.includes('inscribir') || 
          lower.includes('reservar') || 
          lower.includes('interesa') ||
          lower.includes('quiero') ||
          lower.includes('asesor') ||
          lower.includes('hablar con')) {
        const advisorPhone = process.env.ADVISOR_PHONE;
        await markEscalated(phone, `Palabra clave detectada: "${text.slice(0, 50)}"`, advisorPhone);
        if (advisorPhone) {
          await sendMessage(advisorPhone, 
            `🚨 Nuevo lead - Campamento Onawa\n📱 ${phone}\n👤 ${profileName || 'Sin nombre'}\n💬 ${text}\n\nContactar urgente.`
          );
        }
      }
      
      return res.status(200).send('OK');
    } catch (error) {
      console.error('Error:', error);
      return res.status(200).send('OK');
    }
  }
  
  return res.status(405).send('Method Not Allowed');
}
