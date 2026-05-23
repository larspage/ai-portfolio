import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { generateCompletion } from '@/lib/openai';
import { parseResume, parseResumeDev } from '@/lib/resume';
import { SYSTEM_PROMPTS, createAnalysisPrompt, buildSectionSystemPrompt } from '@/lib/prompts';
import { withTenant, requireTenantId } from '@/lib/tenant/resolve';
import { AnalysisRepository } from '@/lib/tenant/analysis-repo';
import { SectionConfigRepository } from '@/lib/tenant/section-config-repo';

// ─── Validation ──────────────────────────────────────────────────────────
const sectionEnum = z.string();
const versionEnum = z.enum(['standard', 'developer']);

const analyzeSchema = z.object({
  section: sectionEnum,
  version: versionEnum.optional().default('standard'),
  resumeId: z.string().uuid().optional(),
});

// ─── Rate limiting (in-memory, per-IP) ──────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// ─── Handler ─────────────────────────────────────────────────────────────
async function analyzeHandler(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  // Parse and validate body
  let body: z.infer<typeof analyzeSchema>;
  try {
    const raw = await request.json();
    body = analyzeSchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { section, version, resumeId } = body;

  // Auth is optional for public access but tenant context is required
  let tenantId: string | null = null;
  let userId: string | null = null;

  try {
    tenantId = requireTenantId();
  } catch {
    // Allow public access for backward compatibility — use default tenant
  }

  const session = await auth();
  if (session?.user?.id) {
    userId = session.user.id;
  }

  // Build resume content
  let resumeContent: string;
  let systemPrompt: string;

  try {
    // Try to look up section config from DB (dynamic sections)
    let sectionConfig = null;
    try {
      const configRepo = new SectionConfigRepository();
      sectionConfig = await configRepo.findByName(section);
    } catch {
      // DB not available — will fall back to hardcoded prompts
    }

    if (sectionConfig) {
      // Dynamic section — use prompt factory
      systemPrompt = buildSectionSystemPrompt({
        name: sectionConfig.label || sectionConfig.name,
        focusDescription: sectionConfig.focus_description,
      });

      // Resume extraction driven by config
      if (version === 'developer') {
        const devResume = parseResumeDev();
        const devSections = devResume.sections as unknown as Record<string, string>;
        resumeContent = sectionConfig.resume_section_key
          ? devSections[sectionConfig.resume_section_key] || devResume.content
          : devResume.content;
      } else {
        const resume = await parseResume();
        const sections = resume.sections as unknown as Record<string, string>;
        resumeContent = sectionConfig.resume_section_key
          ? sections[sectionConfig.resume_section_key] || resume.content
          : resume.content;
      }
    } else {
      // Hardcoded section — existing behavior
      if (version === 'developer') {
        const devResume = parseResumeDev();
        resumeContent = section === 'overview'
          ? `${devResume.sections.summary}\n\n${devResume.sections.skills}`
          : devResume.content;
      } else {
        const resume = await parseResume();
        switch (section) {
          case 'overview':
            resumeContent = `${resume.sections.summary}\n\n${resume.sections.skills}`;
            break;
          case 'leadership':
            resumeContent = resume.sections.leadership;
            break;
          case 'architecture':
            resumeContent = resume.sections.architecture;
            break;
          case 'development':
            resumeContent = resume.sections.development;
            break;
          default:
            resumeContent = resume.content;
        }
      }

      const prompts = SYSTEM_PROMPTS as unknown as Record<string, string>;
      systemPrompt = prompts[section] || SYSTEM_PROMPTS.overview;
    }
  } catch (error) {
    console.error('Error preparing analysis:', error);
    return NextResponse.json(
      { error: 'Failed to prepare analysis' },
      { status: 500 }
    );
  }

  const userPrompt = createAnalysisPrompt(section, resumeContent);

  let response: string;
  try {
    response = await generateCompletion(systemPrompt, userPrompt);
  } catch (error) {
    console.error('Error generating analysis:', error);
    return NextResponse.json(
      { error: 'AI analysis failed. Please check your API key and try again.' },
      { status: 500 }
    );
  }

  // Clean markdown code blocks
  let cleanedResponse = response.trim();
  if (cleanedResponse.startsWith('```json')) cleanedResponse = cleanedResponse.slice(7);
  else if (cleanedResponse.startsWith('```')) cleanedResponse = cleanedResponse.slice(3);
  if (cleanedResponse.endsWith('```')) cleanedResponse = cleanedResponse.slice(0, -3);
  cleanedResponse = cleanedResponse.trim();

  let parsedResponse;
  try {
    parsedResponse = JSON.parse(cleanedResponse);
  } catch {
    parsedResponse = {
      summary: response,
      highlights: [],
    };
  }

  // Store analysis in DB if we have a resume context
  if (resumeId && userId && tenantId) {
    try {
      const analysisRepo = new AnalysisRepository();
      await analysisRepo.create({
        user_id: userId,
        resume_id: resumeId,
        section,
        version,
        result: parsedResponse,
      });
    } catch (err) {
      console.error('Failed to save analysis record:', err);
      // Non-fatal: analysis still works, just don't persist
    }
  }

  return NextResponse.json(parsedResponse);
}

export const POST = (request: NextRequest) => withTenant(analyzeHandler)(request);
