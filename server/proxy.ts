import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Helper function to calculate dates
function getDateInfo() {
    const now = new Date();
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const dayOfWeek = now.getDay();

    const recentDays: Record<string, string> = {};
    for (let i = 0; i < 7; i++) {
        const daysAgo = (dayOfWeek - i + 7) % 7 || 7;
        const pastDate = new Date(now);
        pastDate.setDate(now.getDate() - daysAgo);
        recentDays[dayNames[i]] = pastDate.toISOString().split('T')[0];
    }
    recentDays[dayNames[dayOfWeek]] = now.toISOString().split('T')[0];

    const ayer = new Date(now);
    ayer.setDate(now.getDate() - 1);

    return {
        today: now.toISOString().split('T')[0],
        dayName: dayNames[dayOfWeek],
        recentDays: {
            ...recentDays,
            'hoy': now.toISOString().split('T')[0],
            'ayer': ayer.toISOString().split('T')[0],
        }
    };
}

const buildSystemPrompt = (dateInfo: ReturnType<typeof getDateInfo>, previousSummary?: string, forceCreate?: boolean) => {
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

## CATEGORÍAS DISPONIBLES
Shopping, Food, Transport, Rent, Utilities, Entertainment, Salary, Health, Education, Business, Savings

## DETECCIÓN DE TIPO
- Palabras como "gasté", "pagué", "compré", "me costó" = expense
- Palabras como "me pagaron", "recibí", "cobré", "vendí", "sueldo" = income
- Si no es claro, asume "expense"

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
      "category": "categoría inferida",
      "note": "descripción breve del gasto/ingreso",
      "date": "YYYY-MM-DDT12:00:00.000Z"
    }
  }
}

## IMPORTANTE
- SIEMPRE responde con intent: "create" y structured data
- Si el monto no es claro, usa 0 y el usuario lo editará
- Infiere la categoría del contexto (ej: "uber" = Transport, "almuerzo" = Food)
- Infiere la fecha del contexto (ej: "ayer" = fecha de ayer)`;
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

## CATEGORÍAS DISPONIBLES
Shopping, Food, Transport, Rent, Utilities, Entertainment, Salary, Health, Education, Business, Savings

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
      "category": "categoría",
      "note": "descripción corta",
      "date": "YYYY-MM-DDT12:00:00.000Z"
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
        const { prompt, context, messages = [], previousSummary, forceCreate } = req.body;
        const dateInfo = getDateInfo();
        const systemPrompt = buildSystemPrompt(dateInfo, previousSummary, forceCreate);

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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', date: getDateInfo() });
});

const PORT = process.env.PROXY_PORT || 3001;
app.listen(PORT, () => {
    console.log(`🤖 Claude proxy server running on http://localhost:${PORT}`);
});
