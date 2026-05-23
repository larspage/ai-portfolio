import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withTenant, requireTenantId } from '@/lib/tenant/resolve';
import { SectionConfigRepository } from '@/lib/tenant/section-config-repo';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  focus_description: z.string().nullable().optional(),
  resume_section_key: z.string().max(100).nullable().optional(),
});

async function listHandler(request: NextRequest) {
  try {
    requireTenantId();
    const repo = new SectionConfigRepository();
    const all = request.nextUrl.searchParams.get('all') === 'true';
    const sections = all ? await repo.findAllByTenant() : await repo.findAllActive();
    return NextResponse.json({ sections });
  } catch {
    return NextResponse.json({ sections: [] });
  }
}

async function createHandler(request: NextRequest) {
  requireTenantId();
  const repo = new SectionConfigRepository();

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Check max 8 sections
  const count = await repo.getCount();
  if (count >= 8) {
    return NextResponse.json({ error: 'Maximum of 8 sections allowed' }, { status: 400 });
  }

  // Check name uniqueness
  const existing = await repo.findByName(body.name);
  if (existing) {
    return NextResponse.json({ error: `Section "${body.name}" already exists` }, { status: 409 });
  }

  const sortOrder = await repo.getNextSortOrder();
  const section = await repo.create({
    ...body,
    sort_order: sortOrder,
    is_active: true,
  });

  return NextResponse.json({ section }, { status: 201 });
}

export const GET = (request: NextRequest) => withTenant(listHandler)(request);
export const POST = (request: NextRequest) => withTenant(createHandler)(request);
