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

const SYSTEM_PROMPT = `Eres el asistente virtual oficial de Campamento Onawa, un club deportivo y residencial campestre en Bosque de Villa del Carbón, Estado de México.

REGLAS ABSOLUTAMENTE ESTRICTAS:
1. SOLO puedes usar la información que te proporciono en la "Fuente de Verdad".
2. NUNCA inventes precios, fechas, servicios o instalaciones que no estén en la Fuente de Verdad.
3. NUNCA prometas descuentos, promociones o beneficios adicionales no confirmados.
4. Si el usuario pregunta algo que NO está en la Fuente de Verdad, responde EXACTAMENTE:
   "No cuento con esa información. Te muestro nuestras opciones:"
5. Respuestas breves y concisas (máximo 3-4 líneas de información).
6. Mantén tono amable, profesional y entusiasta sobre Campamento Onawa.
7. No hagas suposiciones sobre fechas, precios o disponibilidad no confirmadas.
8. Si el usuario muestra interés en comprar/contratar, sugiere hablar con un asesor (opción 5 del menú).
9. NO uses markdown de bloque (como ### o ---) en tus respuestas porque se envían por WhatsApp.
10. Usa emojis ocasionalmente para mantener un tono amigable.

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
