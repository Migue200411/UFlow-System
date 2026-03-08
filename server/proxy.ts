import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import nodemailer from 'nodemailer';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://localhost:3001').split(',');
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) cb(null, true);
        else cb(new Error('Not allowed by CORS'));
    }
}));
app.use(express.json({ limit: '100kb' }));

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Helper: get YYYY-MM-DD and day-of-week in a given timezone
function getDateInfo(timezone?: string) {
    const tz = timezone || 'America/Bogota';
    const now = new Date();
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

    // Get current date string and day-of-week in the user's timezone
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
    const dayOfWeek = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(now);
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dowIndex = dayMap[dayOfWeek] ?? 0;

    const recentDays: Record<string, string> = {};
    for (let i = 0; i < 7; i++) {
        const daysAgo = (dowIndex - i + 7) % 7 || 7;
        const pastDate = new Date(now.getTime() - daysAgo * 86400000);
        recentDays[dayNames[i]] = pastDate.toLocaleDateString('en-CA', { timeZone: tz });
    }
    recentDays[dayNames[dowIndex]] = todayStr;

    const yesterdayDate = new Date(now.getTime() - 86400000);
    const yesterdayStr = yesterdayDate.toLocaleDateString('en-CA', { timeZone: tz });

    return {
        today: todayStr,
        dayName: dayNames[dowIndex],
        recentDays: {
            ...recentDays,
            'hoy': todayStr,
            'ayer': yesterdayStr,
        }
    };
}

const buildSystemPrompt = (dateInfo: ReturnType<typeof getDateInfo>, previousSummary?: string, forceCreate?: boolean, context?: any) => {
    if (forceCreate) {
        return `Eres UFlow AI en MODO CREACIÓN RÁPIDA. El usuario está usando el botón "Crear con IA" para registrar transacciones o metas de forma rápida.

## TU ÚNICO OBJETIVO
Extraer datos estructurados del mensaje para crear una transacción o meta. SIEMPRE responde con intent: "create".

## FECHA DE REFERENCIA
Hoy es: ${dateInfo.today} (${dateInfo.dayName})
Fechas recientes: ayer=${dateInfo.recentDays['ayer']}, domingo=${dateInfo.recentDays['domingo']}, sábado=${dateInfo.recentDays['sábado']}

## REGLAS DE MONTOS COLOMBIANOS
- "300mil" = 300,000
- "50k" = 50,000
- "2 palos" = 2,000,000

## CUENTAS DEL USUARIO
${context?.accounts?.length ? context.accounts.map((a: any) => `- id: "${a.id}", nombre: "${a.name}", moneda: ${a.currency}`).join('\n') : 'No hay cuentas registradas.'}

Si el usuario menciona una cuenta, billetera o banco, busca la coincidencia más cercana por nombre.
Ejemplos: "con la de ahorros" → cuenta que contenga "ahorros". "pagué con Nequi" → cuenta "Nequi". "del banco" → cuenta "Bank".
Si no menciona cuenta, usa la primera cuenta disponible (${context?.accounts?.[0]?.id || ''}).

## TARJETAS DE CRÉDITO DEL USUARIO
${context?.creditCards?.length ? context.creditCards.map((c: any) => `- id: "${c.id}", nombre: "${c.name}", cupo: ${c.creditLimit} ${c.currency}, usado: ${c.usedAmount}`).join('\n') : 'No hay tarjetas registradas.'}

Si el usuario dice que GASTÓ con una tarjeta de crédito (ej. "gasté 50k con la Nu", "compré con la Visa"), eso es un CARGO a la tarjeta:
- creditCardId: el id de la tarjeta
- creditCardAction: "charge"
- category: la categoría inferida del gasto (NO "Credit Card")
- accountId: "" (no afecta cuenta bancaria directamente)

Si el usuario dice que PAGÓ la tarjeta (ej. "pagué 500k de la Nu", "abono a la Visa"), eso es un PAGO a la tarjeta:
- creditCardId: el id de la tarjeta
- creditCardAction: "pay"
- category: "Card Payment"
- accountId: cuenta bancaria desde donde paga (si la menciona, si no, la primera)

## CATEGORÍAS DEL USUARIO
CATEGORÍAS EXISTENTES (PRIORIZA ESTAS):
${context?.existingCategories?.length ? context.existingCategories.join(', ') : 'Food, Rent, Transport, Salary, Business, Entertainment, Shopping, Utilities, Health, Education, Savings'}

REGLAS: SIEMPRE usa una categoría existente si aplica. Solo crea una nueva si ninguna encaja.

Mapeo de palabras clave:
- Transport: uber, taxi, bus, pasajes, gasolina, peajes, parqueadero, transmilenio, didi, metro
- Food: almuerzo, cena, desayuno, restaurante, comida, mercado, supermercado, rappi, domicilio
- Shopping: ropa, zapatos, tienda, amazon, compra online, accesorios, electrodomésticos
- Rent: arriendo, alquiler, renta, administración
- Utilities: luz, agua, gas, internet, celular, plan, servicios
- Entertainment: cine, netflix, spotify, fiesta, bar, salida, juego, concierto
- Health: médico, farmacia, droguería, eps, medicina, consulta, gym, dentista
- Education: universidad, curso, libro, matrícula, semestre, clase, taller
- Salary: sueldo, nómina, quincena, pago mensual
- Business: negocio, inversión, cliente, factura, freelance, proyecto
- Savings: ahorro, reserva, fondo, CDT

## DEUDAS EXISTENTES DEL USUARIO
${context?.debts?.length ? context.debts.map((d: any) => `- persona: "${d.person}", tipo: ${d.type === 'owes_me' ? 'me debe' : 'le debo'}, monto: ${d.totalAmount} ${d.currency}, estado: ${d.status}`).join('\n') : 'No hay deudas registradas.'}

## METAS DE AHORRO DEL USUARIO
${context?.goals?.length ? context.goals.filter((g: any) => g.status === 'active').map((g: any) => `- nombre: "${g.name}", meta: ${g.targetAmount} ${g.currency}, progreso: ${g.currentAmount}/${g.targetAmount}`).join('\n') : 'No hay metas registradas.'}

## DETECCIÓN DE TIPO
- "gasté", "pagué", "compré", "me costó" = transaction (expense)
- "me pagaron", "recibí", "cobré", "vendí", "sueldo" = transaction (income)
- "me debe", "le presté", "le fié" = debt (type: owes_me)
- "le debo", "me prestó", "me prestaron", "me fiaron" = debt (type: i_owe)
- "quiero ahorrar", "meta de ahorro", "ahorrar para" = goal
- Si no es claro, asume transaction expense

## REGLAS PARA EL CAMPO "note"
- NO copies el texto del usuario tal cual. Parafrasea en una descripción breve y específica (2-4 palabras máximo).
- Si la nota sería redundante con la categoría, déjala como string vacío "".

## FORMATOS DE RESPUESTA (SIEMPRE crear)

Para TRANSACCIÓN:
{
  "text": "Breve confirmación",
  "lang": "es",
  "intent": "create",
  "structured": {
    "type": "transaction",
    "data": {
      "type": "expense" o "income",
      "amount": número,
      "currency": "COP",
      "accountId": "id de la cuenta",
      "category": "categoría",
      "note": "descripción breve o vacío",
      "date": "YYYY-MM-DDT12:00:00.000Z",
      "creditCardId": "id de la tarjeta si aplica, o null",
      "creditCardAction": "charge" o "pay" o null
    }
  }
}

Para DEUDA:
{
  "text": "Breve confirmación",
  "lang": "es",
  "intent": "create",
  "structured": {
    "type": "debt",
    "data": {
      "person": "nombre de la persona",
      "type": "owes_me" o "i_owe",
      "totalAmount": número,
      "currency": "COP",
      "status": "pending"
    }
  }
}

Para META DE AHORRO:
{
  "text": "Breve confirmación",
  "lang": "es",
  "intent": "create",
  "structured": {
    "type": "goal",
    "data": {
      "name": "nombre de la meta",
      "targetAmount": número,
      "currentAmount": 0,
      "currency": "COP",
      "status": "active",
      "contributions": []
    }
  }
}

## CREACIÓN MÚLTIPLE (BATCH)
Si el usuario menciona VARIOS gastos, ingresos, deudas o metas en UN SOLO mensaje, devuelve "items" (array) en vez de "data":
{ "text": "Resumen", "lang": "es", "intent": "create", "structured": { "type": "transaction", "items": [ { ...item1 }, { ...item2 }, { ...item3 } ] } }
Cada item dentro de "items" tiene el MISMO formato que "data" individual.
Si todos los items son del mismo tipo (ej: todos transacciones), usa ese tipo.
Si hay mezcla de tipos, agrupa por el tipo más frecuente y crea solo esos. Menciona en "text" los que no pudiste crear.
Si es UN SOLO item, usa "data" como siempre.

## IMPORTANTE
- SIEMPRE responde con intent: "create" y structured data
- Detecta el tipo correcto: transaction, debt o goal según el contexto
- Si el monto no es claro, usa 0 y el usuario lo editará
- Infiere la fecha del contexto (ej: "ayer" = fecha de ayer)
- La nota debe ser específica y breve, NUNCA una copia del mensaje original`;
    }
    
    return `Eres UFlow AI, un asistente financiero personal bilingüe (español/inglés). Tu personalidad es amigable, profesional y empática.

## TU ROL
1. **Conversación**: Mantén conversaciones naturales sobre finanzas personales
2. **Consejos**: Da consejos financieros personalizados (ahorro, inversión, presupuesto, deudas)
3. **Transacciones**: Cuando el usuario quiera registrar un gasto/ingreso, extrae los datos estructurados
4. **Metas**: Ayuda a establecer y seguir metas de ahorro
5. **Deudas**: Ayuda a registrar deudas (préstamos, dinero que te deben o que debes)

## FECHA DE REFERENCIA
Hoy es: ${dateInfo.today} (${dateInfo.dayName})
Fechas recientes: ayer=${dateInfo.recentDays['ayer']}, domingo=${dateInfo.recentDays['domingo']}, sábado=${dateInfo.recentDays['sábado']}

${previousSummary ? `## CONTEXTO DE CONVERSACIONES ANTERIORES
${previousSummary}
` : ''}

## REGLAS DE MONTOS COLOMBIANOS
- "300mil" = 300,000
- "50k" = 50,000
- "2 palos" = 2,000,000

## CUENTAS DEL USUARIO
${context?.accounts?.length ? context.accounts.map((a: any) => `- id: "${a.id}", nombre: "${a.name}", moneda: ${a.currency}`).join('\n') : 'No hay cuentas registradas.'}
Si el usuario menciona una cuenta o banco, usa el accountId correspondiente. Si no menciona, usa "${context?.accounts?.[0]?.id || ''}".

## TARJETAS DE CRÉDITO
${context?.creditCards?.length ? context.creditCards.map((c: any) => `- id: "${c.id}", nombre: "${c.name}", cupo: ${c.creditLimit} ${c.currency}, usado: ${c.usedAmount}`).join('\n') : 'No hay tarjetas registradas.'}
Si el usuario gasta con tarjeta de crédito → creditCardId + creditCardAction: "charge"
Si el usuario paga su tarjeta → creditCardId + creditCardAction: "pay", category: "Card Payment"

## DEUDAS DEL USUARIO
${context?.debts?.length ? context.debts.map((d: any) => `- persona: "${d.person}", tipo: ${d.type === 'owes_me' ? 'me debe' : 'le debo'}, monto: ${d.totalAmount} ${d.currency}, estado: ${d.status}`).join('\n') : 'No hay deudas registradas.'}

## METAS DE AHORRO
${context?.goals?.length ? context.goals.filter((g: any) => g.status === 'active').map((g: any) => `- nombre: "${g.name}", meta: ${g.targetAmount} ${g.currency}, progreso: ${g.currentAmount}/${g.targetAmount}`).join('\n') : 'No hay metas registradas.'}

## CATEGORÍAS DEL USUARIO
CATEGORÍAS EXISTENTES (PRIORIZA ESTAS):
${context?.existingCategories?.length ? context.existingCategories.join(', ') : 'Shopping, Food, Transport, Rent, Utilities, Entertainment, Salary, Health, Education, Business, Savings'}

REGLAS: SIEMPRE usa una categoría existente si aplica. Solo crea una nueva si ninguna encaja.

## FORMATO DE RESPUESTA
Responde SIEMPRE con JSON válido:

Para conversación/consejos:
{
  "text": "Tu respuesta conversacional aquí",
  "lang": "es",
  "intent": "query"
}

Para crear TRANSACCIÓN:
{ "text": "Confirmación", "lang": "es", "intent": "create", "structured": { "type": "transaction", "data": { "type": "expense|income", "amount": número, "currency": "COP", "accountId": "id", "category": "categoría", "note": "breve", "date": "YYYY-MM-DDT12:00:00.000Z", "creditCardId": "id o null", "creditCardAction": "charge|pay|null" } } }

Para crear DEUDA:
{ "text": "Confirmación", "lang": "es", "intent": "create", "structured": { "type": "debt", "data": { "person": "nombre", "type": "owes_me|i_owe", "totalAmount": número, "currency": "COP", "status": "pending" } } }

Para crear META DE AHORRO:
{ "text": "Confirmación", "lang": "es", "intent": "create", "structured": { "type": "goal", "data": { "name": "nombre", "targetAmount": número, "currentAmount": 0, "currency": "COP", "status": "active", "contributions": [] } } }

## DETECCIÓN DE INTENCIÓN — SÉ AGRESIVO AL CREAR
Cuando el mensaje del usuario contenga montos, nombres de gastos, o cualquier indicación de registro financiero, CREA directamente con intent: "create". NO preguntes confirmación, NO pidas más datos, NO respondas con intent: "query" explicando qué podrías hacer.

Señales de que debes CREAR (intent: "create"):
- Montos: "50k", "300mil", "15.000", cualquier número con contexto financiero
- Verbos: "gasté", "compré", "pagué", "recibí", "me pagaron", "cobré", "vendí"
- Deudas: "me debe", "le presté", "le fié", "le debo", "me prestó", "me fiaron"
- Metas: "quiero ahorrar", "meta de ahorro", "ahorrar para"
- Listas de gastos: "almuerzo 15k, uber 8k, netflix 30k"
- Si el usuario da un monto sin contexto, asume gasto genérico y CRÉALO

Solo usa intent: "query" para:
- Preguntas como "cuánto gasté este mes", "dame un consejo", "cómo puedo ahorrar"
- Saludos: "hola", "qué tal"
- Conversación sin datos financieros concretos

## CREACIÓN MÚLTIPLE (BATCH)
Si el usuario menciona VARIOS gastos/ingresos/deudas en un solo mensaje, usa "items" (array) en vez de "data":
{ "text": "Resumen", "lang": "es", "intent": "create", "structured": { "type": "transaction", "items": [ { ...item1 }, { ...item2 } ] } }
Si es un solo item, usa "data" como siempre.

## IMPORTANTE
- Mantén el contexto de la conversación
- Sé proactivo con consejos cuando sea apropiado
- NUNCA respondas explicando lo que podrías hacer — simplemente hazlo
- Si el usuario da datos suficientes para crear (monto + contexto), CREA inmediatamente`;
};

// Chat endpoint with conversation history
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt, context, messages = [], previousSummary, forceCreate, dateInfo: clientDateInfo } = req.body;
        // Prefer client-calculated dateInfo (browser handles timezones reliably)
        // Fall back to server calculation only if client didn't provide it
        const dateInfo = clientDateInfo || getDateInfo(context?.timezone);
        const systemPrompt = buildSystemPrompt(dateInfo, previousSummary, forceCreate, context);

        // Build conversation history for Claude
        const conversationHistory: Anthropic.MessageParam[] = [];

        // Add previous messages (limit to last 10 for context window)
        const recentMessages = messages.slice(-10);
        for (const msg of recentMessages) {
            if (msg.role === 'user') {
                conversationHistory.push({ role: 'user', content: msg.content });
            } else if (msg.role === 'assistant') {
                conversationHistory.push({ role: 'assistant', content: msg.content });
            }
        }

        // Add current user message
        conversationHistory.push({ role: 'user', content: prompt });

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            messages: conversationHistory
        });

        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

        // Try to parse JSON response
        try {
            let cleanJson = responseText.trim();
            if (cleanJson.startsWith('```json')) {
                cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanJson.startsWith('```')) {
                cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            let parsed = JSON.parse(cleanJson);

            // Fix: if AI has structured data but said "query", override to "create"
            if (parsed.structured && (parsed.structured.data || parsed.structured.items)) {
                parsed.intent = 'create';
            }
            // Fix: if forceCreate mode, always set intent to "create" if there's any structured data
            if (forceCreate && parsed.structured) {
                parsed.intent = 'create';
            }

            res.json(parsed);
        } catch (parseError) {
            // Try to extract embedded JSON from text
            const jsonMatch = responseText.match(/\{[\s\S]*"structured"\s*:\s*\{[\s\S]*\}\s*\}/);
            if (jsonMatch) {
                try {
                    const extracted = JSON.parse(jsonMatch[0]);
                    if (extracted.structured) extracted.intent = 'create';
                    res.json(extracted);
                    return;
                } catch {}
            }

            // If not valid JSON, return as conversational response
            res.json({
                text: responseText,
                lang: 'es',
                intent: 'query',
                structured: null
            });
        }
    } catch (error: any) {
        res.status(500).json({
            error: error.message,
            text: 'Error conectando con el servicio de IA. Por favor intenta de nuevo.',
            lang: 'es',
            intent: 'unknown'
        });
    }
});

// Endpoint to generate conversation summary
app.post('/api/summarize', async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || messages.length < 2) {
            return res.json({ summary: null });
        }

        // Build conversation text
        const conversationText = messages
            .map((m: any) => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
            .join('\n');

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 500,
            system: `Genera un resumen MUY breve (máximo 3 oraciones) de los puntos importantes de esta conversación financiera. 
Enfócate en: objetivos del usuario, preferencias, información personal relevante para futuras conversaciones.
Responde SOLO con el resumen, sin formato JSON.`,
            messages: [{ role: 'user', content: conversationText }]
        });

        const summary = message.content[0].type === 'text' ? message.content[0].text : '';
        res.json({ summary });
    } catch (error: any) {
        res.json({ summary: null, error: error.message });
    }
});

// Feedback endpoint — email is NEVER exposed to the client
app.post('/api/feedback', async (req, res) => {
    try {
        const { name, email, message, type } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, error: 'Message is required' });
        }

        const escHtml = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        const safeName = escHtml(name || 'Anónimo');
        const safeEmail = email ? escHtml(email) : '';
        const safeMessage = escHtml(message);

        const feedbackEmail = process.env.FEEDBACK_EMAIL;
        const gmailPassword = process.env.GMAIL_APP_PASSWORD;

        if (!feedbackEmail || !gmailPassword) {
            return res.status(500).json({ success: false, error: 'Server configuration error' });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: feedbackEmail,
                pass: gmailPassword,
            },
        });

        const typeLabels: Record<string, string> = {
            comment: '💬 Comentario',
            bug: '🐛 Bug Report',
            request: '✨ Solicitud',
        };

        // Validate email format to prevent header injection
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validReplyTo = email && emailRegex.test(email) ? email : undefined;

        await transporter.sendMail({
            from: feedbackEmail,
            to: feedbackEmail,
            replyTo: validReplyTo,
            subject: `[UFlow] ${typeLabels[type] || type} — ${safeName}`,
            html: `
                <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
                    <h2 style="color:#7C5CFF;margin-bottom:4px;">UFlow Feedback</h2>
                    <p style="color:#888;font-size:12px;margin-top:0;">Tipo: ${typeLabels[type] || type}</p>
                    <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
                    <p><strong>De:</strong> ${safeName}</p>
                    ${safeEmail ? `<p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>` : ''}
                    <p><strong>Mensaje:</strong></p>
                    <div style="background:#f9f9f9;border-radius:8px;padding:12px;white-space:pre-wrap;">${safeMessage}</div>
                    <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
                    <p style="color:#aaa;font-size:10px;">Enviado desde UFlow System — ${new Date().toLocaleString('es-CO')}</p>
                </div>
            `,
        });

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to send feedback' });
    }
});

// Firebase Admin init (singleton)
if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    console.log('Firebase Admin config:', { projectId: !!projectId, clientEmail: !!clientEmail, privateKey: !!privateKey });
    if (projectId && clientEmail && privateKey) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
            });
            console.log('Firebase Admin initialized OK');
        } catch (e: any) {
            console.error('Firebase Admin init failed:', e.message);
        }
    }
}

// Check email provider
app.post('/api/check-email', async (req, res) => {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Invalid email' });
    }
    if (!admin.apps.length) {
        return res.status(503).json({ error: 'Firebase Admin not configured' });
    }
    try {
        const user = await admin.auth().getUserByEmail(email);
        const providers = user.providerData.map(p => p.providerId);
        return res.json({ exists: true, isGoogle: providers.includes('google.com'), isPassword: providers.includes('password') });
    } catch (err: any) {
        console.error('check-email error:', err.code, err.message);
        if (err.code === 'auth/user-not-found') {
            return res.json({ exists: false, isGoogle: false, isPassword: false });
        }
        return res.status(500).json({ error: 'Server error', detail: err.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', date: getDateInfo() });
});

const PORT = process.env.PROXY_PORT || 3001;
app.listen(PORT, () => {
    // server started
});
