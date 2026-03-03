import { NextRequest, NextResponse } from 'next/server';
import { generateCompletion } from '@/lib/openai';
import { parseResume } from '@/lib/resume';
import { SYSTEM_PROMPTS, createSkillSearchPrompt } from '@/lib/prompts';

export const dynamic = 'force-dynamic';

interface SkillSearchResult {
  title: string;
  description: string;
  impact?: string;
  technologies?: string[];
  matchReason: string;
  date?: string;
}

interface SkillSearchResponse {
  results: SkillSearchResult[];
  summary: string;
  searchTerms: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchTerms } = body as { searchTerms: string };

    if (!searchTerms || typeof searchTerms !== 'string') {
      return NextResponse.json(
        { error: 'Search terms are required' },
        { status: 400 }
      );
    }

    if (searchTerms.length > 500) {
      return NextResponse.json(
        { error: 'Search terms are too long. Please limit to 500 characters.' },
        { status: 400 }
      );
    }

    const resume = await parseResume();
    const resumeContent = resume.content;

    const systemPrompt = SYSTEM_PROMPTS.skillSearch;
    const userPrompt = createSkillSearchPrompt(resumeContent, searchTerms);

    const response = await generateCompletion(systemPrompt, userPrompt, {
      temperature: 0.5,
      maxTokens: 2000,
    });

    // Strip markdown code blocks if present
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.slice(7);
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    cleanedResponse = cleanedResponse.trim();

    let parsedResponse: SkillSearchResponse;
    try {
      parsedResponse = JSON.parse(cleanedResponse);
    } catch {
      parsedResponse = {
        results: [],
        summary: response,
        searchTerms
      };
    }

    // Ensure the searchTerms is included in the response
    parsedResponse.searchTerms = searchTerms;

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('Error in skills search API:', error);
    return NextResponse.json(
      { error: 'Failed to search skills' },
      { status: 500 }
    );
  }
}
