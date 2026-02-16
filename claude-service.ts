import { AppContextType, Language } from './types';

// --- CLAUDE API SERVICE ---
const CLAUDE_API_URL = 'http://localhost:3001/api/chat';
const CLAUDE_SUMMARY_URL = 'http://localhost:3001/api/summarize';

interface AIMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface AIResponse {
    text: string;
    lang: Language;
    intent: 'create' | 'query' | 'unknown';
    structured?: {
        type: 'transaction' | 'goal';
        data: any;
    };
}

/** Build dateInfo on the client (browser) where timezone handling is reliable */
function buildClientDateInfo(timezone: string) {
    const tz = (!timezone || timezone === 'auto') ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;
    const now = new Date();
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

    const todayStr = now.toLocaleDateString('en-CA', { timeZone: tz });
    const dayOfWeek = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(now);
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dowIndex = dayMap[dayOfWeek] ?? 0;

    // Build recent day-name → date mapping
    const recentDays: Record<string, string> = {};
    for (let i = 0; i < 7; i++) {
        const daysAgo = (dowIndex - i + 7) % 7 || 7;
        const pastDate = new Date(now.getTime() - daysAgo * 86400000);
        recentDays[dayNames[i]] = pastDate.toLocaleDateString('en-CA', { timeZone: tz });
    }
    // Today's day name should map to today, not 7 days ago
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

/**
 * Calls Claude API with conversation history for context
 */
export const callClaudeAPI = async (
    prompt: string,
    context: AppContextType,
    messages: AIMessage[] = [],
    previousSummary?: string,
    forceCreate?: boolean
): Promise<AIResponse> => {
    try {
        const tz = context.timezone === 'auto' ? Intl.DateTimeFormat().resolvedOptions().timeZone : context.timezone;
        const dateInfo = buildClientDateInfo(tz);

        const response = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                context: {
                    currencyBase: context.currencyBase,
                    language: context.language,
                    timezone: tz,
                    transactions: context.transactions.slice(-10),
                    accounts: context.accounts,
                    creditCards: context.creditCards,
                },
                dateInfo,
                messages,
                previousSummary,
                forceCreate
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return {
            text: data.text || 'No response from AI',
            lang: data.lang || context.language,
            intent: data.intent || 'unknown',
            structured: data.structured || undefined
        };
    } catch (error) {
        console.error('Claude API call failed:', error);
        return {
            text: context.language === 'es'
                ? 'Error conectando con el servicio de IA. Asegúrate de que el servidor esté corriendo (npm run dev).'
                : 'Error connecting to AI service. Make sure the server is running (npm run dev).',
            lang: context.language,
            intent: 'unknown'
        };
    }
};

/**
 * Generate a summary of the conversation for persistence
 */
export const generateChatSummary = async (messages: AIMessage[]): Promise<string | null> => {
    try {
        const response = await fetch(CLAUDE_SUMMARY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages })
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.summary || null;
    } catch (error) {
        console.error('Summary generation failed:', error);
        return null;
    }
};
