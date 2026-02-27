import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

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
Si no menciona cuenta, usa la primera cuenta disponible (${context?.accounts?.[0]?.id || ''}).

## TARJETAS DE CRÉDITO DEL USUARIO
${context?.creditCards?.length ? context.creditCards.map((c: any) => `- id: "${c.id}", nombre: "${c.name}", cupo: ${c.creditLimit} ${c.currency}, usado: ${c.usedAmount}`).join('\n') : 'No hay tarjetas registradas.'}

Si el usuario dice que GASTÓ con una tarjeta de crédito → creditCardAction: "charge", accountId: ""
Si el usuario dice que PAGÓ la tarjeta → creditCardAction: "pay", category: "Card Payment"

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
- "gasté", "pagué", "compré", "me costó" = expense
- "me pagaron", "recibí", "cobré", "vendí", "sueldo" = income
- Si no es claro, asume "expense"

## REGLAS PARA EL CAMPO "note"
- NO copies el texto del usuario tal cual. Parafrasea en una descripción breve y específica (2-4 palabras máximo).
- Si la nota sería redundante con la categoría, déjala como string vacío "".

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
- Infiere la fecha del contexto (ej: "ayer" = fecha de ayer)
- La nota debe ser específica y breve, NUNCA una copia del mensaje original`;
    }

    return `Eres UFlow AI, un asistente financiero personal bilingüe (español/inglés). Tu personalidad es amigable, profesional y empática.

## TU ROL
1. **Conversación**: Mantén conversaciones naturales sobre finanzas personales
2. **Consejos**: Da consejos financieros personalizados
3. **Transacciones**: Cuando el usuario quiera registrar un gasto/ingreso, extrae los datos estructurados
4. **Metas**: Ayuda a establecer y seguir metas de ahorro

## FECHA DE REFERENCIA
Hoy es: ${dateInfo.today} (${dateInfo.dayName})
Fechas recientes: ayer=${dateInfo.recentDays['ayer']}, domingo=${dateInfo.recentDays['domingo']}, sábado=${dateInfo.recentDays['sábado']}

${previousSummary ? `## CONTEXTO DE CONVERSACIONES ANTERIORES\n${previousSummary}\n` : ''}

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

Para crear transacción:
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
- Sé proactivo con consejos cuando sea apropiado
- NO crees transacciones a menos que el usuario explícitamente quiera registrar algo`;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, context, messages = [], previousSummary, forceCreate, dateInfo: clientDateInfo } = req.body;
        const dateInfo = clientDateInfo || getDateInfo();
        const systemPrompt = buildSystemPrompt(dateInfo, previousSummary, forceCreate, context);

        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const conversationHistory: Anthropic.MessageParam[] = [];
        const recentMessages = messages.slice(-10);
        for (const msg of recentMessages) {
            if (msg.role === 'user') {
                conversationHistory.push({ role: 'user', content: msg.content });
            } else if (msg.role === 'assistant') {
                conversationHistory.push({ role: 'assistant', content: msg.content });
            }
        }
        conversationHistory.push({ role: 'user', content: prompt });

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            messages: conversationHistory
        });

        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

        try {
            let cleanJson = responseText.trim();
            if (cleanJson.startsWith('```json')) {
                cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanJson.startsWith('```')) {
                cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            const parsed = JSON.parse(cleanJson);
            return res.status(200).json(parsed);
        } catch {
            return res.status(200).json({
                text: responseText,
                lang: 'es',
                intent: 'query',
                structured: null
            });
        }
    } catch (error: any) {
        console.error('Claude API Error:', error);
        return res.status(500).json({
            error: error.message,
            text: 'Error conectando con el servicio de IA. Por favor intenta de nuevo.',
            lang: 'es',
            intent: 'unknown'
        });
    }
}
