import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface ResumeBullet {
  company: string;
  role?: string;
  dates?: string;
  tenure_years?: number;
  bullet: string;
  skills?: string[];
  category?: string[];
}

export interface ProjectDoc {
  slug: string;
  company: string;
  role?: string;
  project?: string;
  dates?: string;
  section: string[];
  technologies: string[];
  budget?: string;
  team_size?: string;
  impact?: string;
  bullet_match?: string;
  content: string;
}

const projectsDir = path.join(process.cwd(), 'content', 'projects');

export function getAllProjectDocs(): ProjectDoc[] {
  if (!fs.existsSync(projectsDir)) {
    return [];
  }

  const files = fs.readdirSync(projectsDir).filter(f => f.endsWith('.md') && !f.startsWith('_'));
  return files.map(file => {
    const filePath = path.join(projectsDir, file);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContents);
    const slug = file.replace(/\.md$/, '');

    return {
      slug,
      company: data.company || '',
      role: data.role,
      project: data.project,
      dates: data.dates,
      section: data.section || [],
      technologies: data.technologies || [],
      budget: data.budget,
      team_size: data.team_size,
      impact: data.impact,
      bullet_match: data.bullet_match,
      content: content.trim(),
    };
  });
}

export function getBulletsForSection(section: string): ResumeBullet[] {
  const dataPath = path.join(process.cwd(), 'content', 'resume-data.json');
  if (!fs.existsSync(dataPath)) return [];
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  return (data.bullets || []).filter((b: ResumeBullet) =>
    b.category?.some((c: string) => c.toLowerCase() === section.toLowerCase())
  );
}

export function buildProjectContextForSection(section: string): string {
  const bullets = getBulletsForSection(section);
  if (bullets.length === 0) return '';

  const allDocs = getAllProjectDocs();
  const matchedDocs: typeof allDocs = [];

  bullets.forEach(bullet => {
    const docs = allDocs.filter(doc => {
      if (doc.company && bullet.company &&
          !bullet.company.toLowerCase().includes(doc.company.toLowerCase()) &&
          !doc.company.toLowerCase().includes(bullet.company.toLowerCase())) {
        return false;
      }
      if (doc.bullet_match && !bullet.bullet.toLowerCase().includes(doc.bullet_match.toLowerCase())) {
        return false;
      }
      if (doc.project && !bullet.bullet.toLowerCase().includes(doc.project.toLowerCase())) {
        return false;
      }
      return true;
    });
    matchedDocs.push(...docs);
  });

  if (matchedDocs.length === 0) return '';

  // Deduplicate by slug
  const uniqueDocs = Array.from(new Map(matchedDocs.map(d => [d.slug, d])).values());

  const blocks = uniqueDocs.map(doc => {
    const lines = [`### ${doc.project || doc.company} Project Details`];
    if (doc.technologies?.length) lines.push(`Technologies: ${doc.technologies.join(', ')}`);
    if (doc.budget) lines.push(`Budget: ${doc.budget}`);
    if (doc.team_size) lines.push(`Team: ${doc.team_size}`);
    if (doc.impact) lines.push(`Impact: ${doc.impact}`);
    if (doc.dates) lines.push(`Dates: ${doc.dates}`);
    lines.push('');
    lines.push(doc.content);
    return lines.join('\n');
  });

  return blocks.join('\n\n');
}
