import { NextResponse } from 'next/server';
import { parseResume } from '@/lib/resume';

export async function GET() {
  try {
    const resume = await parseResume();
    return NextResponse.json({
      metadata: resume.metadata,
      sections: Object.keys(resume.sections),
    });
  } catch (error) {
    console.error('Error fetching resume:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resume data' },
      { status: 500 }
    );
  }
}
