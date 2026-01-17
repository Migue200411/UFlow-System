import Anthropic from '@anthropic-ai/sdk';

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
    const anteayer = new Date(now);
    anteayer.setDate(now.getDate() - 2);

    return {
        today: now.toISOString().split('T')[0],
        dayName: dayNames[dayOfWeek],
        recentDays: {
            ...recentDays,
            'hoy': now.toISOString().split('T')[0],
            'ayer': ayer.toISOString().split('T')[0],
            'anteayer': anteayer.toISOString().split('T')[0],
        }
    };
}

const buildSystemPrompt = (dateInfo: ReturnType<typeof getDateInfo>) => `Eres un parser de transacciones financieras. Tu ÚNICA tarea es extraer datos estructurados del mensaje del usuario.

## FECHA DE REFERENCIA
Hoy es: ${dateInfo.today} (${dateInfo.dayName})

TABLA DE FECHAS PRECALCULADAS (USA ESTOS VALORES EXACTOS):
- "hoy" → ${dateInfo.recentDays['hoy']}
- "ayer" → ${dateInfo.recentDays['ayer']}  
- "anteayer" → ${dateInfo.recentDays['anteayer']}
- "el domingo" → ${dateInfo.recentDays['domingo']}
- "el lunes" → ${dateInfo.recentDays['lunes']}
- "el martes" → ${dateInfo.recentDays['martes']}
- "el miércoles" → ${dateInfo.recentDays['miércoles']}
- "el jueves" → ${dateInfo.recentDays['jueves']}
- "el viernes" → ${dateInfo.recentDays['viernes']}
- "el sábado" → ${dateInfo.recentDays['sábado']}

## MONTOS EN PESOS COLOMBIANOS
REGLAS MATEMÁTICAS:
- "mil" o "k" = multiplicar por 1,000
- "millón/millones" o "M" o "palo/palos" = multiplicar por 1,000,000

EJEMPLOS:
- "300mil" = 300 × 1,000 = 300000
- "50k" = 50 × 1,000 = 50000  
- "100mil" = 100 × 1,000 = 100000

## CATEGORÍAS
- "ropa", "camisa", "zapatos" → Shopping
- "comida", "almuerzo", "sushi" → Food
- "uber", "taxi", "bus" → Transport
- "arriendo" → Rent
- "netflix", "spotify", "internet" → Utilities
- "salario", "nómina" → Salary

## RESPUESTA (SOLO JSON)
{
  "text": "Listo! Gasto registrado.",
  "lang": "es",
  "intent": "create",
  "structured": {
    "type": "transaction",
    "data": {
      "type": "expense",
      "amount": [NÚMERO],
      "currency": "COP",
      "category": "[CATEGORÍA]",
      "note": "[descripción corta]",
      "date": "[FECHA]T12:00:00.000Z"
    }
  }
}`;

export default async (request: Request) => {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const { prompt, context } = await request.json();
        const dateInfo = getDateInfo();
        const systemPrompt = buildSystemPrompt(dateInfo);

        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: `Mensaje: "${prompt}"` }]
        });

        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

        // Clean and parse JSON
        let cleanJson = responseText.trim();
        if (cleanJson.startsWith('```json')) {
            cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(cleanJson);

        return new Response(JSON.stringify(parsed), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error: any) {
        console.error('Claude API Error:', error);
        return new Response(JSON.stringify({
            text: 'Error conectando con IA',
            lang: 'es',
            intent: 'unknown',
            error: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
};

export const config = {
    path: "/api/chat"
};
