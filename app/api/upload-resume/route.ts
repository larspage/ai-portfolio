import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAllProjectDocs } from '@/lib/projects';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Save uploaded file temporarily
    const uploadDir = path.join(process.cwd(), 'content', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, file.name);
    fs.writeFileSync(filePath, buffer);

    const bullets = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'content', 'resume-data.json'), 'utf8')
    ).bullets || [];

    // Find matching bullets and suggest project doc creation
    const suggestions = bullets.map((bullet: { bullet: string; company?: string; role?: string; dates?: string; project?: string }) => {
      const existingDocs = getAllProjectDocs().filter(doc =>
        (doc.company && bullet.company?.toLowerCase().includes(doc.company.toLowerCase())) ||
        (doc.bullet_match && bullet.bullet.toLowerCase().includes(doc.bullet_match.toLowerCase()))
      );

      return {
        bullet: bullet.bullet,
        company: bullet.company,
        role: bullet.role,
        dates: bullet.dates,
        existingDocs: existingDocs.map((d: { slug: string }) => d.slug),
        suggestedSlug: bullet.company?.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' +
          (bullet.project || bullet.bullet.substring(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, '-')),
      };
    });

    return NextResponse.json({
      message: 'Resume uploaded successfully',
      fileName: file.name,
      bullets: suggestions,
    });
  } catch (error) {
    console.error('Error uploading resume:', error);
    return NextResponse.json(
      { error: 'Failed to upload resume' },
      { status: 500 }
    );
  }
}
