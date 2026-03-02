import { NextRequest, NextResponse } from 'next/server';
import { generateCompletion } from '@/lib/openai';
import { parseResume } from '@/lib/resume';
import { SYSTEM_PROMPTS, createAnalysisPrompt } from '@/lib/prompts';

export const dynamic = 'force-dynamic';

type SectionType = 'overview' | 'leadership' | 'architecture' | 'development';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { section } = body as { section: SectionType };

    if (!section || !['overview', 'leadership', 'architecture', 'development'].includes(section)) {
      return NextResponse.json(
        { error: 'Invalid section. Must be one of: overview, leadership, architecture, development' },
        { status: 400 }
      );
    }

    const resume = await parseResume();

    let resumeContent: string;
    switch (section) {
      case 'overview':
        resumeContent = `${resume.sections.summary}\n\n${resume.sections.skills}`;
        break;
      case 'leadership':
        resumeContent = resume.sections.leadership;
        break;
      case 'architecture':
        resumeContent = resume.sections.architecture;
        break;
      case 'development':
        resumeContent = resume.sections.development;
        break;
      default:
        resumeContent = resume.content;
    }

    const systemPrompt = SYSTEM_PROMPTS[section];
    const userPrompt = createAnalysisPrompt(section, resumeContent);

    const response = await generateCompletion(systemPrompt, userPrompt);

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
        summary: response,
        highlights: [],
      };
    }

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('Error in analyze API:', error);
    return NextResponse.json(
      { error: 'Failed to analyze resume section' },
      { status: 500 }
    );
  }
}
