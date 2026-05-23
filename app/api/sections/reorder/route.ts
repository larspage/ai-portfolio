import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withTenant, requireTenantId } from '@/lib/tenant/resolve';
import { SectionConfigRepository } from '@/lib/tenant/section-config-repo';

const reorderSchema = z.object({
  ids: z.array(z.string().uuid()),
});

async function reorderHandler(request: NextRequest) {
  requireTenantId();
  const repo = new SectionConfigRepository();

  let body: z.infer<typeof reorderSchema>;
  try {
    body = reorderSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Update sort_order for each id in the submitted order
  for (let i = 0; i < body.ids.length; i++) {
    await repo.update(body.ids[i], { sort_order: i });
  }

  const sections = await repo.findAllActive();
  return NextResponse.json({ sections });
}

export const PUT = (request: NextRequest) => withTenant(reorderHandler)(request);
