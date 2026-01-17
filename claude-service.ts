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

/**
 * Calls Claude API with conversation history for context
 */
export const callClaudeAPI = async (
    prompt: string,
    context: AppContextType,
    messages: AIMessage[] = [],
    previousSummary?: string
): Promise<AIResponse> => {
    try {
        const response = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                context: {
                    currencyBase: context.currencyBase,
                    language: context.language,
                    transactions: context.transactions.slice(-10),
                    accounts: context.accounts,
                },
                messages,
                previousSummary
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
