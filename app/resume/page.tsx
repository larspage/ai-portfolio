import fs from 'fs';
import path from 'path';
import { remark } from 'remark';
import remarkHtml from 'remark-html';
import ResumeContent from './ResumeContent';
import { getDb } from '@/lib/db';
import { resumes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

interface ResumeData {
  id: string;
  name: string | null;
  original_filename: string;
  extracted_text: string | null;
  is_default: boolean;
}

async function getDefaultResume(): Promise<ResumeData | null> {
  try {
    const db = getDb();
    const result = await db
      .select({
        id: resumes.id,
        name: resumes.name,
        original_filename: resumes.original_filename,
        extracted_text: resumes.extracted_text,
        is_default: resumes.is_default,
      })
      .from(resumes)
      .where(and(eq(resumes.is_default, true), eq(resumes.status, 'converted')))
      .limit(1);
    return result[0] ?? null;
  } catch {
    return null;
  }
}

function parseFrontmatter(content: string): { body: string } {
  const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return { body: (match ? match[1] : content).trim() };
}

function readLegacyResume(version: 'standard' | 'developer'): string {
  const filename = version === 'developer' ? 'resume-developer.md' : 'resume.md';
  const filePath = path.join(process.cwd(), 'content', filename);
  return fs.readFileSync(filePath, 'utf8');
}

async function renderMarkdown(content: string): Promise<string> {
  const result = await remark().use(remarkHtml).process(content);
  return result.toString();
}

export default async function ResumePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const version = params.version === 'developer' ? 'developer' : 'standard';

  // Try DB (uploaded resume) first, fall back to legacy content/ files
  const dbResume = await getDefaultResume();
  const hasDbResume = !!(dbResume?.extracted_text);

  let displayName = 'Resume';
  let body: string;
  let downloadUrl: string | null = null;

  if (hasDbResume && dbResume) {
    const parsed = parseFrontmatter(dbResume.extracted_text!);
    body = parsed.body;
    displayName = dbResume.original_filename.replace(/\.[^/.]+$/, '');
    downloadUrl = `/uploads/resumes/${dbResume.original_filename}`;
  } else {
    const raw = readLegacyResume(version);
    const parsed = parseFrontmatter(raw);
    body = parsed.body;
  }

  const html = await renderMarkdown(body);

  return (
    <div className="space-y-6">
      <header className="animate-fade-in flex items-start justify-between">
        <div>
          <h1 className="section-title">{displayName}</h1>
          {hasDbResume && (
            <p className="text-sm text-slate-500">Default resume — shown to visitors</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {version === 'standard' ? (
            <a href="/resume?version=developer" className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
              Developer View
            </a>
          ) : (
            <a href="/resume" className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
              Standard View
            </a>
          )}
          {downloadUrl && (
            <a
              href={downloadUrl}
              download
              className="px-4 py-2 rounded-lg text-sm font-medium bg-umber-700 text-white hover:bg-umber-800 transition-colors inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </a>
          )}
        </div>
      </header>

      <div className="card animate-slide-up overflow-hidden">
        <ResumeContent html={html} />
      </div>
    </div>
  );
}
