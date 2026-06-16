import { sendMessage } from '../src/lib/whatsapp.js';
import { getOrCreateContact, saveMessage, markEscalated } from '../src/lib/db.js';

const FOOTER = `\n━━━━━━━━━━━━━━━\n0️⃣ Volver al menú principal\n💬 O escribe tu pregunta con tus palabras`;

const BIENVENIDA = `🌲 *CAMPAMENTO ONAWA* 🌲

¡Hola! 👋 Bienvenido
Soy tu asistente virtual y estoy aquí para ayudarte.

*¿Qué te gustaría conocer?*
1️⃣ *Preventa y Beneficios* — Membresías y precios
2️⃣ *Actividades* — Lo que puedes hacer
3️⃣ *Instalaciones* — Lo que ya tenemos listo
4️⃣ *Próximos Eventos* — Fechas importantes
5️⃣ *Hablar con un Asesor* — Atención personalizada

💡 Escribe el número o cuéntame con tus palabras`;

const MEMBRESIAS = `*💰 Preventa y Beneficios*
Nuestras membresías te dan acceso *365 días del año* de 8:00 am a 6:00 pm.

*📋 Niveles disponibles:*
🥈 *Nivel Plata* · $14,950 · 10 años · 10% descuento
🥇 *Nivel Oro* · $29,560 · 25 años · 15% descuento
🏆 *Nivel Platino* · $58,200 · 50 años · 20% descuento
💎 *Nivel Diamante* · $117,640 · 100 años · 25% descuento

*📌 Incluye:*
• Cuota de mantenimiento: $600/beneficiario, $300/familiar
• Membresía transferible, vendible y heredable
• Certificado de *Miembro Fundador*
• Primer pago de mantenimiento: *enero 2027*
*✅ El descuento aplica en:* Consumo, atracciones, servicios y promociones

¿Te gustaría que un asesor te contacte?`;

const ACTIVIDADES = `*🏃 Actividades Disponibles*
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

¿Te interesa alguna actividad en especial?`;

const INSTALACIONES = `*🏡 Instalaciones*
*✅ Lo que ya tenemos listo:*
• Restaurante y Salón de Eventos
• Área de campamentos en el bosque
• Lago natural
• Granja didáctica
• Cancha de fútbol
• Minigolf
• Campo de obstáculos (Exatlón)
• Estacionamiento
• Sanitarios

*🔨 Próximas etapas:* Cabañas · Albercas

*📍 Ubicación:* Bosque de Villa del Carbón, Estado de México
A 2 km del centro del pueblo mágico

¿Te gustaría agendar una visita?`;

const EVENTOS = `*📆 Próximos Eventos*
*👨 Día del Padre* — Domingo 21 de junio · 🎤 Show en vivo
*🎤 Sábados de Karaoke* — 12:00 pm a 3:00 pm · 🍹 Micheladas y 🍹 Mezcladas 2x1

¿Te gustaría asistir a alguno?`;

const HORARIO = `*🕗 Horario de Atención*
*📅 Días:* 365 días del año
*⏰ Horario:* 8:00 am a 6:00 pm

*📍 Ubicación:* Bosque de Villa del Carbón, Estado de México
A 2 km del centro del pueblo mágico

💡 _Te recomendamos llegar antes de las 5:00 pm para aprovechar al máximo tu visita_

¿Te gustaría agendar tu visita?`;

const ASESOR = `*🎉 ¡Excelente elección!*
Para finalizar tu proceso y asegurar tus beneficios de *Miembro Fundador*, te conecto con nuestro Coordinador de Atención Personalizada.

*👤 Contacto directo:* https://wa.me/525530086410
*📱 O escribe al número:* 55 3008 6410

⏱️ _Te responderemos a la brevedad_

Mientras tanto, puedo seguir respondiendo tus preguntas.`;

const SEGURIDAD = `*🛡️ Seguridad y Compromiso*
En Campamento Onawa diseñamos un espacio *sano y seguro* para que toda la familia disfrute de actividades al aire libre.

*🎯 Nuestra Visión:* Ser reconocidos como el mejor espacio de la zona por nuestro compromiso con la seguridad y el medio ambiente.

*🏥 Próximas Mejoras:* Etapa 2 de construcción (2026-2027): Integración de enfermería permanente

¿Tienes alguna preocupación específica?`;

const REQUISITOS = `*📄 Requisitos para Acceder*
*✅ Edad:* Sin límite de edad. Somos un *club deportivo familiar* diseñado para todos.

*📋 Único requisito:* Adquirir una membresía a largo plazo: 🥈 Plata · 🥇 Oro · 🏆 Platino · 💎 Diamante

*👨‍👩‍👧‍👦 Incluye:* Registro de familiares en tu membresía
*💰 Adicional:* Cuota de mantenimiento anual por beneficiario y familiar registrado

¿Te gustaría conocer los detalles de cada membresía?`;

const UBICACION = `*📍 Ubicación*
*Campamento Onawa* — Residencial Campestre y Club Deportivo, Estado de México, México
*🗺️ Coordenadas:* 19.726313, -99.437399
*🕗 Horario:* Lunes a domingo, 8:00 am a 6:00 pm
*📱 Contacto:* 55 3008 6410`;

const DESPEDIDA = `*🙏 ¡Gracias por tu interés!*
Recuerda que estamos en etapa de *preventa* y es el mejor momento para asegurar tus beneficios de *Miembro Fundador*.

*📅 Cuándo quieras:* agendar una visita familiar, hablar con un asesor o conocer más detalles. Aquí estaré para ayudarte.

*🌲 Campamento Onawa* — Tu espacio en armonía con la naturaleza
¡Que tengas un excelente día! ☀️`;

function withFooter(text) {
  return `${text}${FOOTER}`;
}

function getResponse(text) {
  const lower = text.toLowerCase().trim();

  if (['menu', 'menú', 'hola', 'inicio', '0', 'volver', 'regresar', 'salir'].includes(lower)) {
    return withFooter(BIENVENIDA);
  }

  switch (lower) {
    case '1':
    case '1️⃣':
      return withFooter(MEMBRESIAS);
    case '2':
    case '2️⃣':
      return withFooter(ACTIVIDADES);
    case '3':
    case '3️⃣':
      return withFooter(INSTALACIONES);
    case '4':
    case '4️⃣':
      return withFooter(EVENTOS);
    case '5':
    case '5️⃣':
      return ASESOR;
  }

  if (
    lower.includes('precio') || lower.includes('costo') ||
    lower.includes('cuanto') || lower.includes('cuánto') ||
    lower.includes('membresia') || lower.includes('membresía') ||
    lower.includes('plan') || lower.includes('nivel')
  ) {
    return withFooter(MEMBRESIAS);
  }

  if (lower.includes('actividad') || lower.includes('deporte') || lower.includes('aventura')) {
    return withFooter(ACTIVIDADES);
  }

  if (lower.includes('instalacion') || lower.includes('instalación')) {
    return withFooter(INSTALACIONES);
  }

  if (
    lower.includes('evento') || lower.includes('promocion') || lower.includes('promoción') ||
    lower.includes('karaoke') || lower.includes('michelada') || lower.includes('padre') ||
    lower.includes('show') || lower.includes('2x1') || lower.includes('mezclada')
  ) {
    return withFooter(EVENTOS);
  }

  if (
    lower.includes('horario') || lower.includes('hora') ||
    lower.includes('abren') || lower.includes('abierto') || lower.includes('abre')
  ) {
    return withFooter(HORARIO);
  }

  if (
    lower.includes('inscribir') || lower.includes('reservar') || lower.includes('interesa') ||
    lower.includes('quiero') || lower.includes('asesor') || lower.includes('hablar con') ||
    lower.includes('contratar') || lower.includes('comprar') || lower.includes('adquirir')
  ) {
    return ASESOR;
  }

  if (lower.includes('fecha') || lower.includes('cuando') || lower.includes('cuándo')) {
    return withFooter(EVENTOS);
  }

  if (
    lower.includes('seguridad') || lower.includes('seguro') ||
    lower.includes('medico') || lower.includes('médico') ||
    lower.includes('enfermeria') || lower.includes('enfermería')
  ) {
    return withFooter(SEGURIDAD);
  }

  if (lower.includes('edad') || lower.includes('requisito')) {
    return withFooter(REQUISITOS);
  }

  if (
    lower.includes('ubicacion') || lower.includes('ubicación') ||
    lower.includes('donde') || lower.includes('dónde') ||
    lower.includes('direccion') || lower.includes('dirección') ||
    lower.includes('como llegar') || lower.includes('cómo llegar') ||
    lower.includes('mapa')
  ) {
    return withFooter(UBICACION);
  }

  if (
    lower.includes('gracias') || lower.includes('adios') || lower.includes('adiós') ||
    lower.includes('bye') || lower.includes('chao') || lower.includes('hasta luego')
  ) {
    return DESPEDIDA;
  }

  return withFooter(`🤔 No identifiqué tu pregunta, pero puedo ayudarte con esto:

${BIENVENIDA}`);
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
      if (req.body?.type === 'manual_reply') {
        const { phone, message: text } = req.body;
        if (!phone || !text) {
          return res.status(400).json({ error: 'phone y message requeridos' });
        }
        try {
          await getOrCreateContact(phone);
          await sendMessage(phone, text);
          await saveMessage(phone, 'outbound', text, 'text');
          return res.status(200).json({ ok: true, sent: text });
        } catch (sendErr) {
          const metaError = sendErr.response?.data || null;
          console.error('Meta sendMessage error:', metaError || sendErr.message);
          return res.status(500).json({
            error: 'Error enviando mensaje',
            message: sendErr.message,
            meta: metaError
          });
        }
      }

      const value = req.body.entry?.[0]?.changes?.[0]?.value;
      const message = value?.messages?.[0];
      if (!message) return res.status(200).send('OK');

      const phone = message.from;
      const profileName = value?.contacts?.[0]?.profile?.name || null;
      const messageType = message.type;

      await getOrCreateContact(phone, profileName);

      if (messageType !== 'text') {
        const fallback = `¡Hola! 👋 Por el momento solo puedo leer mensajes de *texto*.\n\n${BIENVENIDA}`;
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
      if (
        lower.includes('inscribir') || lower.includes('reservar') ||
        lower.includes('interesa') || lower.includes('quiero') ||
        lower.includes('asesor') || lower.includes('hablar con') ||
        lower.includes('contratar') || lower.includes('comprar') ||
        lower.includes('adquirir')
      ) {
        const advisorPhone = process.env.ADVISOR_PHONE;
        await markEscalated(phone, `Palabra clave detectada: "${text.slice(0, 50)}"`, advisorPhone);
        if (advisorPhone) {
          await sendMessage(
            advisorPhone,
            `🚨 Nuevo lead - Campamento Onawa\n📱 ${phone}\n👤 ${profileName || 'Sin nombre'}\n💬 ${text}\n\nContactar urgente.`
          );
        }
      }

      return res.status(200).send('OK');
    } catch (error) {
      console.error('Error:', error);
      if (req.body?.type === 'manual_reply') {
        return res.status(500).json({ error: 'Error enviando mensaje', message: error.message });
      }
      return res.status(200).send('OK');
    }
  }

  return res.status(405).send('Method Not Allowed');
}
