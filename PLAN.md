# Plan de Implementación - Chatbot WhatsApp Campamento Onawa

## Arquitectura General

```
WhatsApp User → Meta Cloud API → Vercel Serverless Function (Webhook)
                                      │
                                      ├── Árbol de decisiones (respuestas predefinidas)
                                      ├── PostgreSQL (conversaciones + contactos)
                                      ├── Dashboard web (monitoreo)
                                      └── Escalamiento → Asesor (+52 1 55 3008 6410)
```

## Stack Tecnológico

| Componente | Tecnología |
|---|---|
| Backend | Node.js + Express en Vercel Serverless Functions |
| WhatsApp | Meta Cloud API (WhatsApp Business) |
| Base de datos | PostgreSQL (Vercel Postgres / Neon) |
| Dashboard | Next.js (React) desplegado en Vercel |
| ORM | Prisma |

---

## FASE 1: Configuración de Meta / WhatsApp Business API

| # | Tarea | Estado |
|---|---|---|
| 1.1 | Crear cuenta en Meta for Developers (developers.facebook.com) | ⏳ Pendiente |
| 1.2 | Crear App tipo "Business" con nombre "Campamento Onawa Bot" | ⏳ Pendiente |
| 1.3 | Agregar producto "WhatsApp" en el panel de la app | ⏳ Pendiente |
| 1.4 | Obtener y guardar Phone Number ID | ⏳ Pendiente |
| 1.5 | Obtener y guardar WhatsApp Business Account ID (WABA ID) | ⏳ Pendiente |
| 1.6 | Crear System User en Meta Business Suite y generar token permanente con permiso `whatsapp_business_messaging` | ⏳ Pendiente |
| 1.7 | Vincular número de WhatsApp Business real de Campamento Onawa | ⏳ Pendiente |
| 1.8 | Definir Verify Token (string secreto para verificación del webhook) | ⏳ Pendiente |
| 1.9 | Suscribirse al evento `messages` en configuración de webhook | ⏳ Pendiente |
| 1.10 | Probar envío de mensaje de prueba desde el panel de Meta | ⏳ Pendiente |

---

## FASE 2: Setup del Proyecto Node.js

| # | Tarea | Estado |
|---|---|---|
| 2.1 | Crear carpeta del proyecto `chatbot-campamento-onawa` | ✅ Completada |
| 2.2 | Inicializar proyecto con `npm init -y` | ✅ Completada |
| 2.3 | Instalar dependencias base: `express`, `axios`, `dotenv`, `@prisma/client` | ✅ Completada |
| 2.4 | Instalar dependencias de desarrollo: `prisma`, `nodemon` | ✅ Completada |
| 2.5 | Crear archivo `.env` con variables: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `VERIFY_TOKEN`, `DATABASE_URL`, `ADVISOR_PHONE` | ✅ Completada |
| 2.6 | Crear archivo `.gitignore` (node_modules, .env, prisma migrations) | ✅ Completada |
| 2.7 | Crear `vercel.json` con configuración de rutas y funciones serverless | ✅ Completada |
| 2.8 | Crear estructura de carpetas: `src/api/`, `src/bot/`, `src/lib/`, `dashboard/` | ✅ Completada |

---

## FASE 3: Base de Datos PostgreSQL + Prisma

| # | Tarea | Estado |
|---|---|---|
| 3.1 | Crear cuenta en Neon.tech o Vercel Postgres (gratis) | ⏳ Pendiente |
| 3.2 | Crear base de datos y obtener `DATABASE_URL` | ⏳ Pendiente |
| 3.3 | Inicializar Prisma: `npx prisma init` | ⏳ Pendiente |
| 3.4 | Definir modelo `Contact` en schema.prisma (id, phone, name, firstContactAt, lastMessageAt, status, isEscalated) | ⏳ Pendiente |
| 3.5 | Definir modelo `Message` (id, contactId, direction [inbound/outbound], content, timestamp, messageType) | ⏳ Pendiente |
| 3.6 | Definir modelo `Escalation` (id, contactId, reason, escalatedAt, advisorNotified) | ⏳ Pendiente |
| 3.7 | Definir modelo `DashboardUser` (id, username, passwordHash) para login del panel | ⏳ Pendiente |
| 3.8 | Ejecutar `npx prisma migrate dev` para crear tablas | ⏳ Pendiente |
| 3.9 | Crear `src/lib/db.js` exportando la instancia de Prisma Client | ⏳ Pendiente |

---

## FASE 4: Webhook de WhatsApp (Recepción de Mensajes)

| # | Tarea | Estado |
|---|---|---|
| 4.1 | Crear `src/api/webhook.js` como serverless function de Vercel | ⏳ Pendiente |
| 4.2 | Implementar verificación GET del webhook (challenge-response con VERIFY_TOKEN) | ⏳ Pendiente |
| 4.3 | Implementar recepción POST de mensajes entrantes | ⏳ Pendiente |
| 4.4 | Parsear el payload de WhatsApp: extraer número, texto, tipo de mensaje | ⏳ Pendiente |
| 4.5 | Validar que el mensaje sea de tipo texto (ignorar imágenes, audio, etc. por ahora) | ⏳ Pendiente |
| 4.6 | Buscar o crear `Contact` en base de datos al recibir mensaje | ⏳ Pendiente |
| 4.7 | Guardar mensaje entrante en tabla `Message` | ⏳ Pendiente |
| 4.8 | Llamar al motor del bot (messageHandler) con el mensaje recibido | ⏳ Pendiente |
| 4.9 | Manejar errores con try/catch y responder 200 siempre a Meta (para no reintentar) | ⏳ Pendiente |

---

## FASE 5: Cliente de WhatsApp (Envío de Mensajes)

| # | Tarea | Estado |
|---|---|---|
| 5.1 | Crear `src/lib/whatsapp.js` | ⏳ Pendiente |
| 5.2 | Implementar función `sendMessage(to, text)` usando la API de Meta (`POST /v19.0/{phone_id}/messages`) | ⏳ Pendiente |
| 5.3 | Implementar función `sendTemplateMessage(to, templateName, params)` para mensajes de plantilla | ⏳ Pendiente |
| 5.4 | Manejar errores de la API (rate limits, números inválidos, etc.) | ⏳ Pendiente |
| 5.5 | Guardar cada mensaje saliente en tabla `Message` | ⏳ Pendiente |

---

## FASE 6: Árbol de Decisiones (Motor del Bot)

| # | Tarea | Estado |
|---|---|---|
| 6.1 | Crear `src/bot/decisionTree.js` con toda la lógica de respuestas | ✅ Completada |
| 6.2 | Implementar función de normalización de texto (minúsculas, sin acentos, trim) | ✅ Completada |
| 6.3 | Implementar detección de saludo → responder bienvenida + menú de opciones | ✅ Completada |
| 6.4 | Implementar detección de "precios/costos/cuánto" → responder tabla de precios por temporada | ✅ Completada |
| 6.5 | Implementar detección de "fechas/temporadas/cuándo" → responder calendario Verano 2025 | ✅ Completada |
| 6.6 | Implementar detección de "instalaciones" → responder descripción de las 10 hectáreas | ✅ Completada |
| 6.7 | Implementar detección de "actividades" → responder lista de 20+ actividades | ✅ Completada |
| 6.8 | Implementar detección de "qué llevar/equipamiento/maleta" → responder lista de equipamiento | ✅ Completada |
| 6.9 | Implementar detección de "ubicación/dónde/cómo llegar" → responder info de Valle de Bravo + transporte | ✅ Completada |
| 6.10 | Implementar detección de "seguridad/enfermería/médico" → responder info de seguridad 24h | ✅ Completada |
| 6.11 | Implementar detección de "edad/requisitos/quiénes" → responder 6-17 años | ✅ Completada |
| 6.12 | Implementar detección de "cancelación/reembolso" → responder política de cancelación | ✅ Completada |
| 6.13 | Implementar detección de "comida/alimentos/menú" → responder info de alimentación | ✅ Completada |
| 6.14 | Implementar detección de "contacto/humano/asesor" → escalar a asesor | ✅ Completada |
| 6.15 | Implementar detección de interés (inscribir, reservar, me interesa, quiero info) → escalar a asesor | ✅ Completada |
| 6.16 | Implementar respuesta fallback para mensajes no reconocidos + ofrecer asesor | ✅ Completada |
| 6.17 | Implementar manejo de mensajes de "gracias" y despedida | ✅ Completada |
| 6.18 | Crear `src/bot/messageHandler.js` que orquesta: recibir mensaje → decisionTree → enviar respuesta | ✅ Completada |

---

## FASE 7: Sistema de Escalamiento al Asesor

| # | Tarea | Estado |
|---|---|---|
| 7.1 | Crear `src/bot/escalation.js` | ✅ Completada |
| 7.2 | Implementar detección de señales de interés (palabras clave + contexto de conversación) | ✅ Completada |
| 7.3 | Al detectar interés: enviar al usuario mensaje de transición ("Te conecto con un asesor...") | ✅ Completada |
| 7.4 | Crear registro en tabla `Escalation` con motivo y datos del contacto | ✅ Completada |
| 7.5 | Enviar mensaje al asesor (+52 1 55 3008 6410) con resumen: nombre, teléfono, último mensaje, motivo de interés | ✅ Completada |
| 7.6 | Marcar contacto como `isEscalated = true` para evitar re-escalamientos | ✅ Completada |
| 7.7 | Implementar cooldown: no volver a escalar al mismo contacto en menos de 24 horas | ✅ Completada |

---

## FASE 8: Dashboard Web (Panel de Monitoreo)

| # | Tarea | Estado |
|---|---|---|
| 8.1 | Crear estructura del dashboard con Next.js en carpeta `dashboard/` | ✅ Completada |
| 8.2 | Crear página de Login con autenticación simple (usuario/contraseña) | ✅ Completada |
| 8.3 | Implementar API endpoint `src/api/dashboard/login.js` para autenticación | ✅ Completada |
| 8.4 | Crear middleware de autenticación para proteger rutas del dashboard | ✅ Completada |
| 8.5 | Crear página principal: lista de conversaciones recientes (últimas 50) | ✅ Completada |
| 8.6 | Mostrar por cada conversación: número, nombre, último mensaje, fecha, estado (activo/escalado) | ✅ Completada |
| 8.7 | Crear página de detalle de conversación: todos los mensajes con timestamps y dirección | ✅ Completada |
| 8.8 | Crear sección de estadísticas: total conversaciones, mensajes hoy, escalamientos esta semana | ✅ Completada |
| 8.9 | Implementar filtros: por fecha, por estado (activo/escalado), por búsqueda de texto | ✅ Completada |
| 8.10 | Crear API endpoints del dashboard: `GET /api/dashboard/conversations`, `GET /api/dashboard/conversations/:id`, `GET /api/dashboard/stats` | ✅ Completada |
| 8.11 | Diseño responsive básico del dashboard (mobile-friendly) | ✅ Completada |

---

## FASE 9: Despliegue en Vercel

| # | Tarea | Estado |
|---|---|---|
| 9.1 | Crear cuenta en Vercel y vincular repositorio de GitHub | ⏳ Pendiente |
| 9.2 | Configurar variables de entorno en Vercel: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `VERIFY_TOKEN`, `DATABASE_URL`, `ADVISOR_PHONE`, `DASHBOARD_USER`, `DASHBOARD_PASS` | ⏳ Pendiente |
| 9.3 | Configurar `vercel.json` con rutas correctas para API y dashboard | ⏳ Pendiente |
| 9.4 | Hacer primer deploy y verificar que compila sin errores | ⏳ Pendiente |
| 9.5 | Actualizar Webhook URL en Meta con la URL de producción de Vercel | ⏳ Pendiente |
| 9.6 | Verificar que Meta valida el webhook correctamente | ⏳ Pendiente |
| 9.7 | Probar flujo completo: enviar mensaje desde WhatsApp → bot responde | ⏳ Pendiente |
| 9.8 | Verificar que las conversaciones se guardan en PostgreSQL | ⏳ Pendiente |
| 9.9 | Verificar que el dashboard muestra las conversaciones | ⏳ Pendiente |

---

## FASE 10: Pruebas Exhaustivas

| # | Tarea | Estado |
|---|---|---|
| 10.1 | Probar cada rama del árbol de decisiones (precios, fechas, actividades, etc.) | ⏳ Pendiente |
| 10.2 | Probar escalamiento al asesor: verificar que el asesor recibe el mensaje | ⏳ Pendiente |
| 10.3 | Probar con mensajes ambiguos y verificar fallback | ⏳ Pendiente |
| 10.4 | Probar con emojis, mayúsculas, acentos, errores ortográficos | ⏳ Pendiente |
| 10.5 | Probar que no se re-escala al mismo contacto dentro de 24h | ⏳ Pendiente |
| 10.6 | Probar dashboard: login, lista, detalle, filtros | ⏳ Pendiente |
| 10.7 | Probar concurrencia: múltiples usuarios enviando mensajes simultáneamente | ⏳ Pendiente |
| 10.8 | Probar manejo de errores: token inválido, DB caída, API de WhatsApp caída | ⏳ Pendiente |
| 10.9 | Verificar que los logs de Vercel no muestran errores | ⏳ Pendiente |
| 10.10 | Documentar credenciales y acceso en documento seguro para el cliente | ⏳ Pendiente |

---

## Resumen de Entregables

| Entregable | Descripción |
|---|---|
| Bot funcional | Responde en WhatsApp a nombre de Campamento Onawa |
| Árbol de decisiones | 12+ categorías de respuesta basadas en el PDF |
| Escalamiento automático | Deriva al asesor cuando detecta interés |
| Base de datos | PostgreSQL con contactos, mensajes y escalamientos |
| Dashboard web | Panel de monitoreo con login, conversaciones y estadísticas |
| Deploy en Vercel | Proyecto en producción con variables configuradas |

---

**Total: ~70 tareas distribuidas en 10 fases.**

## Información del Proyecto (del PDF)

### Campamento Onawa
- **Ubicación**: Valle de Bravo, Estado de México
- **Experiencia**: Más de 40 años
- **Instalaciones**: 10 hectáreas, canchas, alberca, lago privado, cabañas, comedor, enfermería 24h, seguridad 24h

### Temporadas y Precios 2025
| Temporadas | Fechas | Duración | Costo |
|---|---|---|---|
| 3 días | 30 jun - 2 jul | 3 días | $7,000 MXN |
| 1 semana | 30 jun - 6 jul | 7 días | $14,000 MXN |
| 2 semanas | 30 jun - 13 jul | 14 días | $25,000 MXN |
| 3 semanas | 30 jun - 20 jul | 21 días | $32,000 MXN |

**Descuentos**:
- Pronto pago (antes del 15 de marzo): 10%
- Hermanos: 10% adicional cada hermano

### Qué Incluye
- Hospedaje en cabañas
- Alimentación completa (5 tiempos)
- Transporte desde CdMx (Polanco)
- Actividades acuáticas, deportivas, aventura, arte, equitación
- Seguridad 24h
- Enfermería 24h
- Seguro médico
- Kit de bienvenida

### Qué NO Incluye
- Transporte foráneo a Valle de Bravo
- Gastos personales
- Lavandería
- Servicios de enfermería

### Requisitos
- **Edad**: 6 a 17 años
- **Lista de equipamiento** detallada (proporcionada en el PDF)

### Políticas de Cancelación
- Más de 15 días antes: 80% reembolso
- 7-14 días antes: 50% reembolso
- Menos de 7 días: sin reembolso

### Número del Asesor
**+52 1 55 3008 6410**