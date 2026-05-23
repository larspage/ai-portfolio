import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { auth } from '@/lib/auth';
import { withTenant, requireTenantId } from '@/lib/tenant/resolve';
import { ResumeRepository } from '@/lib/tenant/resume-repo';
import { convertToMarkdown } from '@/lib/convert-resume';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'resumes');

async function uploadHandler(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  requireTenantId();
  const userId = session.user.id;
  const repo = new ResumeRepository();

  const formData = await request.formData();
  const file = formData.get('file') as File;
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const originalName = file.name;
  const buffer = Buffer.from(await file.arrayBuffer());

  // Save original file for download
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  const timestamp = Date.now();
  const safeName = `${timestamp}-${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = path.join(UPLOAD_DIR, safeName);
  fs.writeFileSync(filePath, buffer);

  // Convert to markdown
  let markdown: string;
  let format: string;
  try {
    const result = await convertToMarkdown(filePath, originalName);
    markdown = result.markdown;
    format = result.format;
  } catch (convErr) {
    // Clean up saved file on conversion failure
    fs.unlinkSync(filePath);
    const message = convErr instanceof Error ? convErr.message : 'Conversion failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Determine if this is the first resume (set as default)
  const existing = await repo.findByUser(userId);
  const isDefault = existing.length === 0;

  // Create DB record
  const resume = await repo.create({
    user_id: userId,
    name: originalName.replace(/\.[^/.]+$/, ''),
    filename: safeName,
    original_filename: originalName,
    file_key: `resumes/${safeName}`,
    content_type: file.type || `application/${format}`,
    file_size: buffer.length,
    extracted_text: markdown,
    status: 'converted',
    is_default: isDefault,
  });

  return NextResponse.json({
    resume,
    isDefault,
    downloadUrl: `/uploads/resumes/${safeName}`,
  }, { status: 201 });
}

export const POST = (request: NextRequest) => withTenant(uploadHandler)(request);
