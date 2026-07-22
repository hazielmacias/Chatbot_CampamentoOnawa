import Groq from 'groq-sdk';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'llama-3.3-70b-versatile';

let groq = null;
let fuenteDeVerdad = null;

function initGroq() {
  if (!GROQ_API_KEY) {
    console.error('[GROQ] GROQ_API_KEY no está configurada en .env');
    return null;
  }
  if (!groq) {
    groq = new Groq({ apiKey: GROQ_API_KEY });
  }
  return groq;
}

function loadFuenteDeVerdad() {
  if (fuenteDeVerdad) return fuenteDeVerdad;
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const path = resolve(here, 'fuente-de-verdad.md');
    fuenteDeVerdad = readFileSync(path, 'utf8');
    return fuenteDeVerdad;
  } catch (err) {
    console.error('[GROQ] Error cargando fuente-de-verdad.md:', err.message);
    return null;
  }
}

const SYSTEM_PROMPT = `Eres el asistente virtual oficial de Campamento Onawa, un club deportivo y residencial campestre ubicado en Loma de cuevas, entrada los arcos, frente a la nueva universidad bicentenario, Carretera Villa del Carbón KM 34.5, Estado de México. Eres un asistente PROPOSITIVO: tu objetivo es no solo informar, sino guiar al usuario hacia una acción concreta.

REGLAS ABSOLUTAMENTE ESTRICTAS:
1. SOLO puedes usar la información que te proporciono en la "Fuente de Verdad".
2. NUNCA inventes precios, fechas, servicios o instalaciones que no estén en la Fuente de Verdad.
3. NUNCA prometas descuentos, promociones o beneficios adicionales no confirmados.
4. SIEMPRE SER PROPOSITIVO: Cada respuesta debe terminar con una pregunta o sugerencia de acción. Nunca dejes al usuario "colgado".
5. CONDUCIR A LA ACCIÓN: Después de responder, siempre propón un siguiente paso:
   - "¿Te gustaría agendar una visita?"
   - "¿Te interesa conocer los precios de las membresías?"
   - "¿Quieres que un asesor te contacte?"
   - "¿Hay alguna actividad que te llame la atención?"
6. PUENTE HACIA EL ASESOR: Si el usuario muestra interés real (pregunta por precios, quiere visitar, menciona comprar, quiere más detalles, pregunta por disponibilidad), INMEDIATAMENTE sugiere hablar con un asesor (opción 6 del menú) o escribir al 55 3008 6410.
7. Si el usuario pregunta algo que NO está en la Fuente de Verdad, responde EXACTAMENTE:
   "No cuento con esa información. Te muestro nuestras opciones:"
8. Respuestas breves y concisas (máximo 3-4 líneas de información + pregunta de cierre).
9. Mantén tono amable, profesional, entusiasta y orientado a resultados.
10. No hagas suposiciones sobre fechas, precios o disponibilidad no confirmadas.
11. NO uses markdown de bloque (como ### o ---) en tus respuestas porque se envían por WhatsApp.
12. Usa emojis ocasionalmente para mantener un tono amigable.

A continuación te presento la FUENTE DE VERDAD con toda la información autorizada:`;

export async function responderConIA(mensajeUsuario) {
  const client = initGroq();
  if (!client) {
    return { respuesta: null, error: 'GROQ no inicializado' };
  }

  const fuente = loadFuenteDeVerdad();
  if (!fuente) {
    return { respuesta: null, error: 'Fuente de verdad no disponible' };
  }

  try {
    const chatCompletion = await client.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}\n\n${fuente}`
        },
        {
          role: 'user',
          content: mensajeUsuario
        }
      ],
      model: MODEL,
      temperature: 0.3,
      max_tokens: 500,
      top_p: 0.9,
      frequency_penalty: 0.2,
      presence_penalty: 0.1
    });

    const respuesta = chatCompletion.choices[0]?.message?.content?.trim();

    if (!respuesta) {
      return { respuesta: null, error: 'Respuesta vacía de Groq' };
    }

    // Detectar si la IA no pudo responder (por el mensaje exacto de fallback)
    const esFallback = respuesta.toLowerCase().includes('no cuento con esa información');

    return {
      respuesta,
      esFallback,
      model: MODEL,
      tokens: chatCompletion.usage?.total_tokens || 0
    };
  } catch (err) {
    console.error('[GROQ] Error en API:', err.message);
    return { respuesta: null, error: err.message };
  }
}

export function isGroqEnabled() {
  return !!GROQ_API_KEY && !!loadFuenteDeVerdad();
}
