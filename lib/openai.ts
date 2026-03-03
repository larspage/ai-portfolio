import OpenAI from 'openai';
import { withCache } from './cache';
import crypto from 'crypto';

function getCacheKey(systemPrompt: string, userPrompt: string): string {
  return crypto.createHash('sha256').update(systemPrompt + userPrompt).digest('hex');
}

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export default getOpenAIClient;

export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const cacheKey = getCacheKey(systemPrompt, userPrompt);

  return withCache<string>(cacheKey, async () => {
    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1500,
    });

    const result = response.choices[0]?.message?.content || '';
    return result;
  });
}
