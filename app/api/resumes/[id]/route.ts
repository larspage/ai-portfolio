import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withTenant } from '@/lib/tenant/resolve';
import { ResumeRepository } from '@/lib/tenant/resume-repo';

const resumeRepo = new ResumeRepository();

/**
 * GET /api/resumes/[id] — Get a specific resume.
 */
async function getResume(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resume = await resumeRepo.findById(params.id);
  if (!resume) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ resume });
}

/**
 * DELETE /api/resumes/[id] — Delete a resume.
 */
async function deleteResume(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Reject if the resume doesn't belong to this user's tenant (auto 404 via repository)
  const deleted = await resumeRepo.delete(params.id);
  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  switch (request.method) {
    case 'GET':
      return getResume(request, { params });
    case 'DELETE':
      return deleteResume(request, { params });
    default:
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
}

export const GET = (request: NextRequest, { params }: { params: { id: string } }) =>
  withTenant((req: NextRequest) => handler(req, { params }))(request);
export const DELETE = (request: NextRequest, { params }: { params: { id: string } }) =>
  withTenant((req: NextRequest) => handler(req, { params }))(request);
