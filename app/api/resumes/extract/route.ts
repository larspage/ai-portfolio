/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withTenant } from '@/lib/tenant/resolve';
import { ResumeRepository } from '@/lib/tenant/resume-repo';
import { extractTextFromStorage } from '@/lib/extract';

const resumeRepo = new ResumeRepository();

/**
 * POST /api/resumes/extract — Extract text from an uploaded resume.
 * Body: { resumeId: string }
 */
async function extractText(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { resumeId } = body;

  if (!resumeId) {
    return NextResponse.json({ error: 'resumeId is required' }, { status: 400 });
  }

  // Fetch resume record (tenant-scoped via repository — returns 404 if cross-tenant)
  const resume = await resumeRepo.findById(resumeId);
  if (!resume) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (resume.status !== 'uploaded') {
    return NextResponse.json(
      { error: `Resume is in status "${resume.status}", expected "uploaded"` },
      { status: 400 }
    );
  }

  try {
    // Extract text from the file in DO Spaces
    const extractedText = await extractTextFromStorage(
      resume.file_key,
      resume.content_type || 'application/octet-stream'
    );

    // Update the resume record with extracted text
    await resumeRepo.update(resumeId, {
      extracted_text: extractedText,
      status: 'extracted',
    } as any);

    return NextResponse.json({
      success: true,
      textLength: extractedText.length,
      status: 'extracted',
    });
  } catch (error) {
    console.error('Text extraction failed:', error);
    await resumeRepo.update(resumeId, { status: 'error' } as any);
    return NextResponse.json(
      { error: 'Failed to extract text from file' },
      { status: 500 }
    );
  }
}

export const POST = (request: NextRequest) => withTenant(extractText)(request);
