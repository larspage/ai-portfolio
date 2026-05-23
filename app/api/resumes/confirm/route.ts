import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withTenant } from '@/lib/tenant/resolve';
import { ResumeRepository } from '@/lib/tenant/resume-repo';

const resumeRepo = new ResumeRepository();

/**
 * POST /api/resumes/confirm — Confirm that a file was uploaded to DO Spaces.
 * Body: { fileKey: string, filename: string, originalFilename: string, contentType: string, fileSize: number }
 *
 * Creates a resume record in the database.
 */
async function confirmUpload(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { fileKey, filename, originalFilename, contentType, fileSize } = body;

  if (!fileKey || !filename) {
    return NextResponse.json(
      { error: 'fileKey and filename are required' },
      { status: 400 }
    );
  }

  const resume = await resumeRepo.create({
    user_id: session.user.id,
    name: filename,
    filename,
    original_filename: originalFilename || filename,
    file_key: fileKey,
    content_type: contentType || 'application/octet-stream',
    file_size: fileSize || 0,
    status: 'uploaded',
  });

  return NextResponse.json({ resume }, { status: 201 });
}

export const POST = (request: NextRequest) => withTenant(confirmUpload)(request);
