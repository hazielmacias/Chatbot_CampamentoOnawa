# Chatbot WhatsApp - Campamento Onawa

Chatbot de WhatsApp automatizado para Campamento Onawa, campamento de verano en Valle de Bravo, Estado de México.

## Características

- **Respuestas automáticas** a preguntas frecuentes sobre precios, fechas, instalaciones, actividades, seguridad, etc.
- **Escalamiento inteligente** al asesor humano cuando se detecta interés de compra
- **Dashboard web** para monitorear conversaciones en tiempo real
- **Base de datos PostgreSQL** para persistir contactos, mensajes y escalamientos

## Stack Tecnológico

- **Backend:** Node.js + Express + Vercel Serverless Functions
- **WhatsApp:** Meta Cloud API
- **Base de datos:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Dashboard:** HTML + JavaScript vanilla

## Estructura del Proyecto

```
chatbot-campamento-onawa/
├── api/
│   ├── webhook.js              # Endpoint principal de WhatsApp
│   └── dashboard/
│       ├── stats.js            # Estadísticas del dashboard
│       ├── conversations.js    # Lista de conversaciones
│       └── conversation.js     # Detalle de conversación
├── src/
│   ├── bot/
│   │   ├── decisionTree.js     # Lógica de respuestas
│   │   └── messageHandler.js   # Procesador de mensajes
│   └── lib/
│       ├── whatsapp.js         # Cliente de WhatsApp API
│       └── db.js               # Cliente de Prisma
├── dashboard/
│   └── index.html              # Panel de monitoreo
├── prisma/
│   └── schema.prisma           # Esquema de base de datos
├── .env                        # Variables de entorno
├── .gitignore
├── package.json
├── vercel.json
└── PLAN.md
```

## Configuración

1. Clonar el repositorio
2. Instalar dependencias: `npm install`
3. Copiar `.env.example` a `.env` y completar las variables
4. Generar Prisma Client: `npx prisma generate`
5. Desplegar en Vercel

## Variables de Entorno

```env
WHATSAPP_TOKEN=          # Token de Meta Cloud API
WHATSAPP_PHONE_ID=       # ID del número de teléfono
VERIFY_TOKEN=            # Token de verificación del webhook
DATABASE_URL=            # URL de PostgreSQL (Supabase)
ADVISOR_PHONE=           # Número del asesor (+52...)
DASHBOARD_USER=          # Usuario del dashboard
DASHBOARD_PASS=          # Contraseña del dashboard
```

## Intenciones del Bot

El bot detecta automáticamente las siguientes intenciones:

- **Saludos:** Bienvenida + menú de opciones
- **Precios:** Tabla de precios por temporada
- **Fechas:** Calendario Verano 2025
- **Instalaciones:** Descripción de las 10 hectáreas
- **Actividades:** Lista de 20+ actividades
- **Equipamiento:** Lista de equipamiento
- **Ubicación:** Valle de Bravo + transporte
- **Seguridad:** Seguridad 24h + enfermería
- **Requisitos:** Edad 6-17 años + documentos
- **Cancelaciones:** Políticas de reembolso
- **Alimentación:** 5 tiempos de comida
- **Asesor:** Escalamiento al asesor humano
- **Interés:** Detección de intención de compra

## Escalamiento al Asesor

Cuando el usuario muestra interés (inscribir, reservar, pagar), el bot:
1. Envía mensaje de transición al usuario
2. Crea registro en la base de datos
3. Notifica al asesor vía WhatsApp con resumen de la conversación
4. Evita re-escalamientos dentro de 24 horas

## Dashboard

Accede al panel de monitoreo en `/dashboard`

- Estadísticas en tiempo real
- Lista de conversaciones con filtros
- Detalle de cada conversación
- Actualización automática cada 30 segundos

## Autor

Desarrollado para Campamento Onawa

## Licencia

ISC
