/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withTenant } from '@/lib/tenant/resolve';
import { ResumeRepository } from '@/lib/tenant/resume-repo';

async function handler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.method !== 'PUT') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const repo = new ResumeRepository();
  const updated = await repo.setDefault(id, session.user.id);
  if (!updated) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
  }

  return NextResponse.json({ resume: updated });
}

export const PUT = (request: NextRequest, { params }: { params: Promise<{ id: string }> }) =>
  withTenant((req: NextRequest) => handler(req, { params } as any))(request);
