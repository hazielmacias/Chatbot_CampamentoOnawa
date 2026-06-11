import { sendMessage } from '../lib/whatsapp.js';
import db from '../lib/db.js';

// Normalizar texto para comparación
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

// Detectar palabras clave
function containsKeywords(text, keywords) {
  const normalized = normalizeText(text);
  return keywords.some(keyword => {
    const normalizedKeyword = normalizeText(keyword);
    return normalized.includes(normalizedKeyword) || 
           normalizedKeyword.includes(normalized);
  });
}

// Respuestas del bot
const responses = {
  welcome: `¡Hola! 👋 Soy el asistente virtual de *Campamento Onawa* 🏕️

Con más de 40 años de experiencia, ofrecemos campamentos de verano inolvidables para niños y jóvenes de 6 a 17 años en Valle de Bravo, Estado de México.

¿En qué puedo ayudarte hoy?

1️⃣ *Precios y temporadas* 💰
2️⃣ *Instalaciones* 🏡
3️⃣ *Actividades* 🏊
4️⃣ *Qué incluye* 📋
5️⃣ *Ubicación y transporte* 🚌
6️⃣ *Seguridad* 🛡️
7️⃣ *Requisitos* 📄
8️⃣ *Cancelaciones* ⚠️
9️⃣ *Hablar con un asesor* 👨‍💼

Escribe el número o tu pregunta 🙂`,

  prices: `*💰 Precios Verano 2025*

📅 *Temporadas:*
• 3 días: $7,000 MXN
• 1 semana: $14,000 MXN
• 2 semanas: $25,000 MXN
• 3 semanas: $32,000 MXN

🎁 *Descuentos:*
• Pronto pago (antes del 15 de marzo): 10% descuento
• Hermano(s): 10% adicional por cada hermano

📆 *Fechas:* Del 30 de junio al 20 de julio de 2025

¿Te gustaría inscribirte o tienes más preguntas? 😊`,

  dates: `*📆 Temporadas Verano 2025*

• Inicio: 30 de junio de 2025
• Fin: 20 de julio de 2025

Opciones:
• 3 días (30 jun - 2 jul)
• 1 semana (30 jun - 6 jul)
• 2 semanas (30 jun - 13 jul)
• 3 semanas (30 jun - 20 jul)

Las inscripciones están abiertas 🎉`,

  facilities: `*🏡 Instalaciones*

Contamos con 10 hectáreas de terreno natural:
• 🏊 Alberca climatizada
• 🛶 Lago privado para actividades acuáticas
• 🐴 Caballerizas
• 🏕️ Cabañas de madera
• 🏀 Canchas de basketball, tenis, voleibol y fútbol
• 🎯 Tiro con arco
• 🧗 Escalódromo
• 🍽️ Comedor con alimentación completa
• 🏥 Enfermería 24/7
• 🔒 Seguridad 24/7
• 🎭 Teatro al aire libre`,

  activities: `*🏊 Actividades*

Más de 20 actividades para todos los gustos:

*Náuticas:*
• Kayak, canotaje, vela, waterpolo
• Natación, torneo de castillos
• Pista de patinaje

*Deportivas:*
• Basketball, tenis, voleibol, fútbol
• Tiro con arco, golf, yoga, paddle

*Aventura:*
• Cabalgatas, campismo, tiro con arco
• Escalódromo, circuito de acuatlón
• Campfire, campamento nocturno

*Arte y Creatividad:*
• Baile, teatro, música, cerámica
• Pintura, escultura, artes marziali
• Fotografía, programación

*Equitación:*
• Clases de equitación, polo
• Competencias, cabalgatas`,

  includes: `*📋 ¿Qué incluye?*

✅ *Incluye:*
• Hospedaje en cabañas de madera
• Alimentación completa (5 tiempos al día)
• Transporte desde CdMx (Polanco)
• Actividades acuáticas, deportivas, aventura, arte
• Equitación
• Seguridad 24 horas
• Enfermería 24/7
• Seguro médico
• Kit de bienvenida

❌ *NO incluye:*
• Transporte foráneo a Valle de Bravo
• Gastos personales
• Lavandería
• Servicios de enfermería (están incluidos pero consultas especiales no)`,

  location: `*🚌 Ubicación y Transporte*

📍 *Ubicación:*
Valle de Bravo, Estado de México

🚐 *Transporte:*
Incluido desde la Ciudad de México (Punto de salida: Polanco)

Si vienes de otro estado o país, nos puedes contactar para coordinar 🌍`,

  security: `*🛡️ Seguridad*

• Seguridad 24 horas en todo el campamento
• Enfermería 24/7 con personal médico calificado
• Seguro médico incluido
• Personal capacitado en primeros auxilios
• Cabañas supervisadas por monitores
• Sistema de comunicación en todo el campamento
• Protocolos de emergencia establecidos

¡Tu hijo está en las mejores manos! 💪`,

  requirements: `*📄 Requisitos*

• Edad: 6 a 17 años
• Certificado médico (actualizado)
• Copia de identificación oficial
• Llenar formato de inscripción
• Lista de equipamiento completa

*Lista de equipamiento:*
• Ropa de baño (2 trajes de baño)
• Ropa deportiva (5 camisetas, 5 shorts, 2 pants)
• Ropa casual (3 outfits)
• Ropa para frío (chamarra, suéter, gorro)
• Zapatos: tennis, tenis de agua, zapatos cerrados
• Artículos de higiene personal
• Toalla, bloqueador solar, repelente
• Lámpara, linterna, sleeping bag
• Cuaderno, lápices, libreta de direcciones
• Dinero para gastos personales (recomendado: $500-1000)
• Medicamentos (si aplica, con receta)

*NO traer:*
• Celulares, tabletas, laptops
• Joyas, dinero en exceso
• Armas, sustancias`,

  cancellation: `*⚠️ Políticas de Cancelación*

• *Más de 15 días antes:* 80% de reembolso
• *7-14 días antes:* 50% de reembolso
• *Menos de 7 días:* Sin reembolso

*Nota:* El reembolso se aplica sobre el monto total pagado, menos la inscripción ($2,000 MXN no reembolsable).

¿Te gustaría hablar con un asesor sobre las fechas? 👨‍💼`,

  food: `*🍽️ Alimentación*

5 tiempos de comida al día:
• Desayuno
• Almuerzo
• Comida
• Merienda
• Cena

Menú balanceado y nutritivo, diseñado por nutriólogos.

Si tu hijo tiene restricciones alimentarias (alergias, vegetarianismo, etc.), ¡avísanos con anticipación! 🥗`,

  advisor: `*👨‍💼 Asesor Personal*

¡Perfecto! Te conecto con un asesor personal que te ayudará con todo el proceso de inscripción.

Por favor, espera un momento mientras te contacto con:
📱 *+52 1 55 3008 6410*

También puedes contactarlo directamente por WhatsApp.

Un asesor te atenderá lo antes posible 🌟`,

  fallback: `Lo siento, no entendí bien tu pregunta 😅

Soy un asistente virtual y aún estoy aprendiendo. ¿Puedes reformular tu pregunta? O si prefieres, te puedo conectar con un asesor humano.

Escribe *"asesor"* o *"humano"* para hablar con alguien del equipo 👨‍💼

¿Qué te gustaría saber? Puedo ayudarte con:
• Precios y temporadas
• Instalaciones
• Actividades
• Inscripción`,

  thanks: `¡De nada! 😊

Si tienes más preguntas, aquí estoy. ¿Algo más en lo que pueda ayudarte?

O si prefieres, escribe *"asesor"* para hablar con un humano.`,

  goodbye: `¡Hasta luego! 👋

Espero verte pronto en Campamento Onawa 🏕️✨

¡Que tengas un excelente día!`,

  menu: `¿Qué te gustaría saber?

1️⃣ *Precios* 💰
2️⃣ *Instalaciones* 🏡
3️⃣ *Actividades* 🏊
4️⃣ *Qué incluye* 📋
5️⃣ *Ubicación* 🚌
6️⃣ *Seguridad* 🛡️
7️⃣ *Requisitos* 📄
8️⃣ *Cancelaciones* ⚠️
9️⃣ *Asesor* 👨‍💼

Escribe el número o tu pregunta 🙂`,

  interest: `¡Que emoción! 🎉

Veo que te interesa Campamento Onawa. Para brindarte una atención más personalizada, te conecto con un asesor que te ayudará con:

✅ Proceso de inscripción
✅ Fechas disponibles
✅ Formas de pago
✅ Descuentos

📱 *+52 1 55 3008 6410*

Un asesor te contactará pronto. ¡Gracias por tu interés! 🌟`
};

// Detectar la intención del mensaje
function detectIntent(text) {
  const normalized = normalizeText(text);
  
  // Saludos
  if (containsKeywords(text, ['hola', 'buenos', 'buenas', 'saludos', 'hey', 'hi', 'hello'])) {
    return 'welcome';
  }
  
  // Precios
  if (containsKeywords(text, ['precio', 'costo', 'cuanto', 'vale', 'cuanto cuesta', 'precios', 'tarifa', 'tarifas', 'pago', 'dinero', 'cuanto sale', 'cuanto vale'])) {
    return 'prices';
  }
  
  // Fechas
  if (containsKeywords(text, ['fecha', 'cuando', 'temporada', 'fechas', 'calendario', 'programa', 'programas', 'dias', 'duracion', 'cuanto dura'])) {
    return 'dates';
  }
  
  // Instalaciones
  if (containsKeywords(text, ['instalacion', 'instalaciones', 'lugar', 'terreno', 'campamento', 'cabaña', 'cabana', 'alberca', 'lago', 'canchas', 'comedor', 'enfermeria'])) {
    return 'facilities';
  }
  
  // Actividades
  if (containsKeywords(text, ['actividad', 'actividades', 'que hacen', 'que hay', 'que hacen los niños', 'deportes', 'deportivas', 'acuaticas', 'aventura', 'arte', 'equitacion', 'caballo', 'caballos', 'nadar', 'natacion', 'kayak', 'canotaje'])) {
    return 'activities';
  }
  
  // Qué incluye
  if (containsKeywords(text, ['incluye', 'que incluye', 'que tiene', 'que incluye el precio', 'que viene', 'que se incluye', 'servicios', 'que ofrecen'])) {
    return 'includes';
  }
  
  // Ubicación
  if (containsKeywords(text, ['ubicacion', 'donde', 'donde esta', 'lugar', 'valle de bravo', 'estado de mexico', 'como llegar', 'transporte', 'bus', 'camion', 'avion', 'aeropuerto'])) {
    return 'location';
  }
  
  // Seguridad
  if (containsKeywords(text, ['seguridad', 'seguro', 'medico', 'enfermeria', 'enfermera', 'doctor', 'medicos', 'seguros', 'proteccion', 'cuidado', 'seguro medico', 'enfermeria'])) {
    return 'security';
  }
  
  // Requisitos
  if (containsKeywords(text, ['requisito', 'requisitos', 'edad', 'que necesito', 'que llevo', 'equipamiento', 'lista', 'ropa', 'zapatos', 'mochila', 'maleta', 'que debo llevar'])) {
    return 'requirements';
  }
  
  // Cancelaciones
  if (containsKeywords(text, ['cancelacion', 'cancelar', 'reembolso', 'devolucion', 'devolver', 'cancelo', 'me cancelo', 'politica', 'politicas', 'cancelaciones'])) {
    return 'cancellation';
  }
  
  // Comida
  if (containsKeywords(text, ['comida', 'alimentos', 'alimentacion', 'menu', 'comer', 'desayuno', 'almuerzo', 'comida', 'cena', 'merienda', 'nutricion', 'vegetariano', 'alergia'])) {
    return 'food';
  }
  
  // Asesor / Humano
  if (containsKeywords(text, ['asesor', 'humano', 'persona', 'agente', 'vendedor', 'contacto', 'hablar con alguien', 'llamar', 'telefono', 'numero', 'hablar con una persona', 'me puedes llamar', 'necesito ayuda'])) {
    return 'advisor';
  }
  
  // Interés (señales de compra)
  if (containsKeywords(text, ['inscribir', 'inscribirme', 'reservar', 'reserva', 'quiero', 'me interesa', 'me gustaria', 'quiero ir', 'quiero mandar', 'como me inscribo', 'como inscribo', 'pago', 'pagar', 'donde pago', 'forma de pago', 'transferencia', 'tarjeta', 'oxxo', 'como hago', 'proceso', 'inscripcion', 'inscripciones', 'contrato', 'contratar'])) {
    return 'interest';
  }
  
  // Gracias
  if (containsKeywords(text, ['gracias', 'gracias por', 'thank', 'thanks', 'thx', 'ok gracias', 'muchas gracias', 'agradecido', 'agradecida'])) {
    return 'thanks';
  }
  
  // Despedida
  if (containsKeywords(text, ['adios', 'hasta luego', 'bye', 'chao', 'nos vemos', 'hasta pronto', 'hasta mañana', 'cuidese', 'cuidate', 'hasta la proxima'])) {
    return 'goodbye';
  }
  
  // Menú
  if (containsKeywords(text, ['menu', 'opciones', 'que puedes hacer', 'que sabes', 'ayuda', 'help', 'como funciona', 'que haces', 'que puedes hacer', 'comenzar', 'empezar', 'start', 'inicio'])) {
    return 'menu';
  }
  
  // Fallback
  return 'fallback';
}

// Obtener respuesta según intención
export function getResponse(intent) {
  return responses[intent] || responses.fallback;
}

// Verificar si es intención de escalamiento
export function isEscalationIntent(intent) {
  return intent === 'advisor' || intent === 'interest';
}

// Obtener razón de escalamiento
export function getEscalationReason(intent) {
  if (intent === 'advisor') {
    return 'El usuario solicitó hablar con un asesor';
  }
  if (intent === 'interest') {
    return 'El usuario mostró interés en inscribirse/reservar';
  }
  return 'Escalamiento automático';
}

export default {
  detectIntent,
  getResponse,
  isEscalationIntent,
  getEscalationReason,
  normalizeText,
  containsKeywords
};
