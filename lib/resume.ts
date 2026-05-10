import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import { withCache } from './cache';

export interface ResumeMetadata {
  name: string;
  title: string;
  email: string;
  linkedin: string;
  location: string;
  phone?: string;
}

export interface ParsedResume {
  metadata: ResumeMetadata;
  content: string;
  htmlContent: string;
  sections: {
    summary: string;
    leadership: string;
    architecture: string;
    development: string;
    skills: string;
    education: string;
    certifications: string;
  };
}

const resumePath = path.join(process.cwd(), 'content', 'resume.md');

export function getResumeRaw(): string {
  return fs.readFileSync(resumePath, 'utf8');
}

export async function parseResume(): Promise<ParsedResume> {
  return withCache<ParsedResume>('parsedResume', async () => {
    const fileContents = getResumeRaw();
    const { data, content } = matter(fileContents);

    const processedContent = await remark()
      .use(html)
      .process(content);
    const htmlContent = processedContent.toString();

    const sections = extractSections(content);

    return {
      metadata: data as ResumeMetadata,
      content,
      htmlContent,
      sections,
    };
  });
}

function extractSections(content: string): ParsedResume['sections'] {
  const sectionMap: Record<string, keyof ParsedResume['sections']> = {
    'Professional Summary': 'summary',
    'Leadership Experience': 'leadership',
    'Architecture & Design': 'architecture',
    'Development Accomplishments': 'development',
    'Technical Skills': 'skills',
    'Education': 'education',
    'Certifications': 'certifications',
  };

  const sections: ParsedResume['sections'] = {
    summary: '',
    leadership: '',
    architecture: '',
    development: '',
    skills: '',
    education: '',
    certifications: '',
  };

  const lines = content.split('\n');
  let currentSection: keyof ParsedResume['sections'] | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.+)$/);

    if (headerMatch) {
      if (currentSection && currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n').trim();
      }

      const headerText = headerMatch[1];
      currentSection = sectionMap[headerText] || null;
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  if (currentSection && currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  return sections;
}

export function getResumeSection(sectionName: keyof ParsedResume['sections']): Promise<string> {
  return withCache<string>('section_' + sectionName, async () => {
    const resume = await parseResume();
    return resume.sections[sectionName];
  });
}

// --- Resume Data (structured bullet format) ---

export interface ResumeDataBullet {
  company: string;
  role: string;
  dates: string;
  tenure_years: number;
  bullet: string;
  skills: string[];
  category: string[];
  project?: string;
  extended_description?: string;
}

export interface ResumeDataSet {
  notes: string;
  bullets: ResumeDataBullet[];
}

export function parseResumeData(): ResumeDataSet {
  const dataPath = path.join(process.cwd(), 'content', 'resume-data.json');
  if (!fs.existsSync(dataPath)) {
    return { notes: '', bullets: [] };
  }
  return JSON.parse(fs.readFileSync(dataPath, 'utf8')) as ResumeDataSet;
}

// --- Developer Resume ---

const resumeDevPath = path.join(process.cwd(), 'content', 'resume-developer.md');

export function getResumeDevRaw(): string {
  return fs.readFileSync(resumeDevPath, 'utf8');
}

export interface ParsedResumeDev {
  content: string;
  sections: {
    summary: string;
    skills: string;
    experience: string;
    education: string;
  };
}

export function parseResumeDev(): ParsedResumeDev {
  const content = getResumeDevRaw();

  const lines = content.split('\n');
  const sections: ParsedResumeDev['sections'] = {
    summary: '',
    skills: '',
    experience: '',
    education: '',
  };

  let currentSection: keyof ParsedResumeDev['sections'] | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    // Detect section headers in developer resume
    const trimmed = line.trim();
    if (trimmed === 'Summary') {
      flushSection();
      currentSection = 'summary';
    } else if (trimmed === 'Technical Skills') {
      flushSection();
      currentSection = 'skills';
    } else if (trimmed === 'Professional Experience') {
      flushSection();
      currentSection = 'experience';
    } else if (trimmed === 'Education') {
      flushSection();
      currentSection = 'education';
    } else if (currentSection) {
      currentLines.push(line);
    }
  }
  flushSection();

  function flushSection() {
    if (currentSection && currentLines.length > 0) {
      sections[currentSection] = currentLines.join('\n').trim();
    }
    currentLines = [];
  }

  return { content, sections };
}

export function findNewBullets(markdownContent: string, existingBullets: ResumeDataBullet[]): string[] {
  // Extract bullet points (lines starting with -) from markdown
  const bulletLines: string[] = [];
  for (const line of markdownContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') && !trimmed.startsWith('- **') && !trimmed.match(/^-\s*$/)) {
      bulletLines.push(trimmed.replace(/^- /, '').trim());
    }
  }

  // Filter out bullets that already exist in resume-data.json
  const existingTexts: string[] = existingBullets.map(
    b => b.bullet.toLowerCase().replace(/\s+/g, ' ').trim()
  );

  return bulletLines.filter(text => {
    const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
    // Check exact match first
    if (existingTexts.includes(normalized)) return false;
    // Check substring containment (if existing text contains this, skip)
    for (const existing of existingTexts) {
      if (existing.includes(normalized) || normalized.includes(existing)) return false;
    }
    return true;
  });
}
