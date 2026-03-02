import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

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
  return parseResume().then(resume => resume.sections[sectionName]);
}
