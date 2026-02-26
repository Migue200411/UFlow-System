import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
app.use(cors());
app.use(express.json());

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

## DETECCIÓN DE TIPO
- Palabras como "gasté", "pagué", "compré", "me costó" = expense
- Palabras como "me pagaron", "recibí", "cobré", "vendí", "sueldo" = income
- Si no es claro, asume "expense"

## REGLAS PARA EL CAMPO "note"
- NO copies el texto del usuario tal cual. Parafrasea en una descripción breve y específica (2-4 palabras máximo).
- Si la nota sería redundante con la categoría, déjala como string vacío "".
- Ejemplos:
  - "me gasté 20mil en pasajes" → category: "Transport", note: "" (redundante)
  - "pagué 50k de almuerzo con el equipo" → category: "Food", note: "Almuerzo con equipo"
  - "me gasté 300mil en amazon en audífonos" → category: "Shopping", note: "Audífonos Amazon"
  - "pagué el recibo de luz" → category: "Utilities", note: "Recibo de luz"
  - "uber al aeropuerto" → category: "Transport", note: "Uber al aeropuerto"
  - "50k en cena" → category: "Food", note: "" (redundante)

## FORMATO DE RESPUESTA (SIEMPRE crear)
{
  "text": "Breve confirmación de lo detectado",
  "lang": "es",
  "intent": "create",
  "structured": {
    "type": "transaction",
    "data": {
      "type": "expense" o "income",
      "amount": número,
      "currency": "COP",
      "accountId": "id de la cuenta inferida del contexto",
      "category": "categoría inferida del mapeo",
      "note": "descripción breve o vacío si redundante",
      "date": "YYYY-MM-DDT12:00:00.000Z",
      "creditCardId": "id de la tarjeta si aplica, o null",
      "creditCardAction": "charge" o "pay" o null
    }
  }
}

## IMPORTANTE
- SIEMPRE responde con intent: "create" y structured data
- Si el monto no es claro, usa 0 y el usuario lo editará
- Usa el mapeo de palabras clave para elegir la categoría correcta
- Infiere la fecha del contexto (ej: "ayer" = fecha de ayer)
- La nota debe ser específica y breve, NUNCA una copia del mensaje original`;
    }
    
    return `Eres UFlow AI, un asistente financiero personal bilingüe (español/inglés). Tu personalidad es amigable, profesional y empática.

## TU ROL
1. **Conversación**: Mantén conversaciones naturales sobre finanzas personales
2. **Consejos**: Da consejos financieros personalizados (ahorro, inversión, presupuesto, deudas)
3. **Transacciones**: Cuando el usuario quiera registrar un gasto/ingreso, extrae los datos estructurados
4. **Metas**: Ayuda a establecer y seguir metas de ahorro

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

Para crear transacción (solo cuando el usuario EXPLÍCITAMENTE quiera registrar algo):
{
  "text": "Confirmación del registro",
  "lang": "es",
  "intent": "create",
  "structured": {
    "type": "transaction",
    "data": {
      "type": "expense|income",
      "amount": número,
      "currency": "COP",
      "accountId": "id de la cuenta inferida",
      "category": "categoría",
      "note": "descripción breve o vacío si redundante",
      "date": "YYYY-MM-DDT12:00:00.000Z",
      "creditCardId": "id si involucra tarjeta, o null",
      "creditCardAction": "charge|pay|null"
    }
  }
}

## IMPORTANTE
- Mantén el contexto de la conversación
- Si el usuario dice "eso", "lo anterior", etc., refiere a lo último que mencionó
- Sé proactivo con consejos cuando sea apropiado
- NO crees transacciones a menos que el usuario explícitamente quiera registrar algo`;
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

        console.log('📝 Conversation history length:', conversationHistory.length);

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            messages: conversationHistory
        });

        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
        console.log('🤖 Claude response:', responseText);

        // Try to parse JSON response
        try {
            let cleanJson = responseText.trim();
            if (cleanJson.startsWith('```json')) {
                cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanJson.startsWith('```')) {
                cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            const parsed = JSON.parse(cleanJson);
            res.json(parsed);
        } catch (parseError) {
            // If not valid JSON, return as conversational response
            res.json({
                text: responseText,
                lang: 'es',
                intent: 'query',
                structured: null
            });
        }
    } catch (error: any) {
        console.error('Claude API Error:', error);
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
        console.log('📋 Generated summary:', summary);

        res.json({ summary });
    } catch (error: any) {
        console.error('Summary Error:', error);
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

        const feedbackEmail = process.env.FEEDBACK_EMAIL;
        const gmailPassword = process.env.GMAIL_APP_PASSWORD;

        if (!feedbackEmail || !gmailPassword) {
            console.error('Missing FEEDBACK_EMAIL or GMAIL_APP_PASSWORD in .env');
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

        await transporter.sendMail({
            from: feedbackEmail,
            to: feedbackEmail,
            replyTo: email || undefined,
            subject: `[UFlow] ${typeLabels[type] || type} — ${name || 'Anónimo'}`,
            html: `
                <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
                    <h2 style="color:#7C5CFF;margin-bottom:4px;">UFlow Feedback</h2>
                    <p style="color:#888;font-size:12px;margin-top:0;">Tipo: ${typeLabels[type] || type}</p>
                    <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
                    <p><strong>De:</strong> ${name || 'Anónimo'}</p>
                    ${email ? `<p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>` : ''}
                    <p><strong>Mensaje:</strong></p>
                    <div style="background:#f9f9f9;border-radius:8px;padding:12px;white-space:pre-wrap;">${message}</div>
                    <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
                    <p style="color:#aaa;font-size:10px;">Enviado desde UFlow System — ${new Date().toLocaleString('es-CO')}</p>
                </div>
            `,
        });

        console.log('📧 Feedback sent:', type, name || 'Anónimo');
        res.json({ success: true });
    } catch (error: any) {
        console.error('Feedback email error:', error);
        res.status(500).json({ success: false, error: 'Failed to send feedback' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', date: getDateInfo() });
});

const PORT = process.env.PROXY_PORT || 3001;
app.listen(PORT, () => {
    console.log(`🤖 Claude proxy server running on http://localhost:${PORT}`);
});
