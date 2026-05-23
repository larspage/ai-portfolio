/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withTenant, requireTenantId } from '@/lib/tenant/resolve';
import { SectionConfigRepository } from '@/lib/tenant/section-config-repo';

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  label: z.string().min(1).max(200).optional(),
  focus_description: z.string().nullable().optional(),
  resume_section_key: z.string().max(100).nullable().optional(),
  is_active: z.boolean().optional(),
});

async function handleGet(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  requireTenantId();
  const repo = new SectionConfigRepository();
  const section = await repo.findById(id);
  if (!section) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ section });
}

async function handlePut(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  requireTenantId();
  const repo = new SectionConfigRepository();

  let body: z.infer<typeof updateSchema>;
  try {
    body = updateSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const updated = await repo.update(id, body);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ section: updated });
}

async function handleDelete(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  requireTenantId();
  const repo = new SectionConfigRepository();
  const deleted = await repo.delete(id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export const GET = (request: NextRequest, context: { params: Promise<{ id: string }> }) =>
  withTenant(handleGet as any)(request, context as any);
export const PUT = (request: NextRequest, context: { params: Promise<{ id: string }> }) =>
  withTenant(handlePut as any)(request, context as any);
export const DELETE = (request: NextRequest, context: { params: Promise<{ id: string }> }) =>
  withTenant(handleDelete as any)(request, context as any);
