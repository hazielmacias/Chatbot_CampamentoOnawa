import { sendMessage } from '../src/lib/whatsapp.js';
import { getOrCreateContact, saveMessage, markEscalated } from '../src/lib/db.js';

function getResponse(text) {
  const lower = text.toLowerCase();
  
  if (lower.includes('precio') || lower.includes('costo') || lower.includes('cuanto') || lower.includes('membresia')) {
    return `*💰 Membresias Campamento Onawa*

Nuestras membresias te garantizan acceso al club deportivo los 365 dias del ano, de 8:00 am a 6:00 pm.

*Nivel Plata:* $14,950 - 10 anos de acceso - 10% descuento base
*Nivel Oro:* $29,560 - 25 anos de acceso - 15% descuento base
*Nivel Platino:* $58,200 - 50 anos de acceso - 20% descuento base
*Nivel Diamante:* $117,640 - 100 anos de acceso - 25% descuento base

Cuota de mantenimiento anual: $600 por beneficiario, $300 por familiar registrado.
Todas las membresias son transferibles, vendibles y heredables.

Al adquirir tu membresia en preventa, obtienes el *Certificado de Miembro Fundador* y tu primer pago de mantenimiento comienza hasta enero de 2027.

El descuento de tu nivel se aplica en mantenimiento, consumo, atracciones y servicios.

¿Te gustaria que un asesor te contacte para finalizar tu proceso?`;
  }
  
  if (lower.includes('actividad')) {
    return `*🏊 Actividades Campamento Onawa*

*Deportes y Aventura:*
Exatlon (campo de obstaculos)
Tiro con arco y tiro con hacha
Gotcha
Cancha de futbol
Senderismo entre pinos y encinos

*Naturaleza y Exploracion:*
Area de campamentos en el bosque
Lago natural (peces, tortugas, ranas)
Granja didactica
Paseo a caballo por senderos

*Juegos y Recreacion:*
Minigolf
Juegos gigantes (ajedrez, domino, jenga)
Aqua Esferas
Area infantil
Brincolines
Area de hamacas

*Servicios Actuales:*
Restaurante y Salon de Eventos (operando al 50%)
Estacionamiento y sanitarios

*Próximas etapas:* Tirolesas, muro de escalar, padel, tenis, tren, ciclismo de montaña y albercas.

Te interesa alguna actividad en particular?`;
  }
  
  if (lower.includes('instalacion')) {
    return `*🏡 Instalaciones Campamento Onawa*

Actualmente contamos con:

• Restaurante y Salon de Eventos
• Area de campamentos
• Lago natural
• Granja didactica
• Cancha de futbol
• Minigolf
• Campo de obstaculos (Exatlon)
• Estacionamiento
• Sanitarios

*Próximas etapas de construccion:*
Cabañas y albercas

Todo en un entorno natural y seguro en el bosque de Villa del Carbon.

Te gustaria agendar una visita familiar?`;
  }
  
  if (lower.includes('inscribir') || lower.includes('reservar') || lower.includes('interesa') || lower.includes('quiero') || lower.includes('asesor')) {
    return `¡Excelente eleccion!

Para finalizar tu proceso y asegurar tus beneficios de *Miembro Fundador*, te comunicare ahora mismo con nuestro Coordinador de Atencion Personalizada.

Puedes escribirle directamente aqui:
https://wa.me/525530086410

Mientras tanto, puedes seguir preguntandome lo que necesites.`;
  }
  
  if (lower.includes('fecha') || lower.includes('cuando') || lower.includes('evento')) {
    return `*📆 Fechas y Acceso*

Campamento Onawa esta abierto los *365 dias del ano* en un horario continuo de 8:00 am a 6:00 pm.

*Beneficios de Preventa:*
Al adquirir tu membresia hoy, obtienes el Certificado de Miembro Fundador y tu primer pago de mantenimiento comienza hasta *enero de 2027*.

*Próximos Eventos Confirmados:*
• 30 de mayo de 2026: Inauguracion oficial del Restaurante
• 8 y 9 de agosto de 2026: Gran Campamento Familiar (dos dias de aventura en el bosque - cupo limitado)

Te gustaria reservar para algun evento?`;
  }
  
  if (lower.includes('seguridad')) {
    return `*🛡️ Seguridad en Campamento Onawa*

Campamento Onawa esta disenado para ofrecerte un espacio sano y un entorno completamente seguro para disfrutar de actividades al aire libre en compania de toda la familia.

Nuestra vision es ser reconocidos como el mejor espacio de la zona por nuestro compromiso con la seguridad y el medio ambiente.

*Próximas mejoras:*
Como parte de nuestra Etapa 2 de construccion (2026-2027), integraremos una enfermeria a nuestras instalaciones.

Tienes alguna preocupacion especifica?`;
  }
  
  if (lower.includes('edad') || lower.includes('requisito')) {
    return `*📄 Requisitos para Campamento Onawa*

En Campamento Onawa *no tenemos limite de edad*. Somos un club deportivo campestre disenado para *toda la familia*.

El unico requisito para disfrutar de nuestras instalaciones y actividades es adquirir cualquiera de nuestras membresias a largo plazo:
• Plata
• Oro
• Platino
• Diamante

Las cuales te permiten registrar a tus familiares.

Ademas, se debe cubrir una cuota de mantenimiento anual por cada beneficiario y familiar registrado.

Te gustaria que te enviemos informacion detallada de las membresias?`;
  }
  
  if (lower.includes('ubicacion') || lower.includes('donde')) {
    return `*📍 Ubicacion*

Campamento Onawa se encuentra en el corazon del bosque de *Villa del Carbon, Estado de Mexico*.

A tan solo *2 km del centro del pueblo magico*.

Te envio la ubicacion exacta por WhatsApp?

O prefieres que un asesor te explique las mejores rutas para llegar?`;
  }
  
  if (lower.includes('gracias') || lower.includes('adios')) {
    return `¡Gracias a ti por tu interes en Campamento Onawa!

Recuerda que actualmente estamos en etapa de *preventa*, por lo que es el mejor momento para asegurar tus beneficios exclusivos de *Miembro Fundador*.

Si mas adelante deseas agendar una visita familiar a nuestras instalaciones en el bosque de Villa del Carbon o hablar con uno de nuestros asesores, aqui estare para ayudarte.

¡Que tengas un excelente dia!`;
  }
  
  return `¡Hola! 👋

Soy el asistente de *Campamento Onawa*, un club deportivo 100% mexicano en armonia con la naturaleza.

Puedo ayudarte con:

• *Preventa y Beneficios* (Escenario A)
• *Informacion de Membresias* (Escenario B)
• *Actividades Actuales* (Escenario C)
• *Próximos Eventos* (Escenario D)
• *Hablar con un Asesor* (Escenario E)

En que puedo ayudarte hoy?`;
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
      const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (!message) return res.status(200).send('OK');
      
      const phone = message.from;
      const text = message.text?.body || '';
      
      getOrCreateContact(phone);
      saveMessage(phone, 'inbound', text);
      
      const response = getResponse(text);
      await sendMessage(phone, response);
      saveMessage(phone, 'outbound', response);
      
      if (text.toLowerCase().includes('inscribir') || 
          text.toLowerCase().includes('reservar') || 
          text.toLowerCase().includes('interesa') ||
          text.toLowerCase().includes('quiero') ||
          text.toLowerCase().includes('asesor')) {
        markEscalated(phone);
        const advisorPhone = process.env.ADVISOR_PHONE;
        if (advisorPhone) {
          await sendMessage(advisorPhone, 
            `🚨 Nuevo lead - Campamento Onawa\n📱 ${phone}\n💬 ${text}\n\nContactar urgente.`
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
