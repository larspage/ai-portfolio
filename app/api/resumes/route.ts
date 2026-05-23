import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withTenant } from '@/lib/tenant/resolve';
import { ResumeRepository } from '@/lib/tenant/resume-repo';
import { buildTenantKey, getPresignedUploadUrl } from '@/lib/storage/presigned';
import { v4 as uuidv4 } from 'uuid';

const resumeRepo = new ResumeRepository();

/**
 * GET /api/resumes — List resumes for current user.
 */
async function listResumes(_request: NextRequest) { // eslint-disable-line @typescript-eslint/no-unused-vars
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userResumes = await resumeRepo.findByUser(session.user.id);
  return NextResponse.json({ resumes: userResumes });
}

/**
 * POST /api/resumes — Initiate resume upload (generates presigned URL).
 * Body: { filename: string, contentType: string }
 */
async function createResume(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUser = session.user as { id: string; tenant_id?: string };
  const tenantId = sessionUser.tenant_id;
  if (!tenantId) {
    return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
  }

  const body = await request.json();
  const { filename, contentType } = body;

  if (!filename || !contentType) {
    return NextResponse.json(
      { error: 'filename and contentType are required' },
      { status: 400 }
    );
  }

  // Generate storage key and presigned URL
  const fileId = uuidv4();
  const fileKey = buildTenantKey(tenantId, 'resumes', `${fileId}-${filename}`);

  const [presignedUrl] = await Promise.all([
    getPresignedUploadUrl(fileKey, contentType),
  ]);

  return NextResponse.json({
    presignedUrl,
    fileKey,
    fileId,
    expiresIn: 900, // 15 minutes
  });
}

async function handler(request: NextRequest) {
  switch (request.method) {
    case 'GET':
      return listResumes(request);
    case 'POST':
      return createResume(request);
    default:
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
}

export const GET = (request: NextRequest) => withTenant(handler)(request);
export const POST = (request: NextRequest) => withTenant(handler)(request);
