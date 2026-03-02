import { NextRequest, NextResponse } from 'next/server';
import { generateCompletion } from '@/lib/openai';
import { parseResume } from '@/lib/resume';
import { SYSTEM_PROMPTS, createJobMatchPrompt } from '@/lib/prompts';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobDescription } = body as { jobDescription: string };

    if (!jobDescription || typeof jobDescription !== 'string') {
      return NextResponse.json(
        { error: 'Job description is required' },
        { status: 400 }
      );
    }

    if (jobDescription.length > 10000) {
      return NextResponse.json(
        { error: 'Job description is too long. Please limit to 10,000 characters.' },
        { status: 400 }
      );
    }

    const resume = await parseResume();
    const resumeContent = resume.content;

    const systemPrompt = SYSTEM_PROMPTS.jobMatch;
    const userPrompt = createJobMatchPrompt(resumeContent, jobDescription);

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

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(cleanedResponse);
    } catch {
      parsedResponse = {
        fitScore: 0,
        matchingAreas: [],
        gaps: ['Unable to parse job match analysis'],
        recommendation: response,
      };
    }

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('Error in match API:', error);
    return NextResponse.json(
      { error: 'Failed to analyze job match' },
      { status: 500 }
    );
  }
}
