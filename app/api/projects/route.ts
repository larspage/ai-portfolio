import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export const dynamic = 'force-dynamic';

const projectsDir = path.join(process.cwd(), 'content', 'projects');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      slug,
      company,
      role,
      project,
      dates,
      section,
      technologies,
      budget,
      team_size,
      impact,
      bullet_match,
      content,
    } = body;

    if (!slug || !company) {
      return NextResponse.json(
        { error: 'slug and company are required' },
        { status: 400 }
      );
    }

    // Build frontmatter
    const frontmatter: Record<string, unknown> = {
      company,
      section: section || [],
      technologies: technologies || [],
    };
    if (role) frontmatter.role = role;
    if (project) frontmatter.project = project;
    if (dates) frontmatter.dates = dates;
    if (budget) frontmatter.budget = budget;
    if (team_size) frontmatter.team_size = team_size;
    if (impact) frontmatter.impact = impact;
    if (bullet_match) frontmatter.bullet_match = bullet_match;

    // Build markdown with gray-matter format
    const yaml = matter.stringify(content || '', frontmatter);
    const filePath = path.join(projectsDir, `${slug}.md`);

    if (!fs.existsSync(projectsDir)) {
      fs.mkdirSync(projectsDir, { recursive: true });
    }

    fs.writeFileSync(filePath, yaml);

    return NextResponse.json({
      message: 'Project doc created successfully',
      slug,
      path: `/content/projects/${slug}.md`,
    });
  } catch (error) {
    console.error('Error creating project doc:', error);
    return NextResponse.json(
      { error: 'Failed to create project doc' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(projectsDir)) {
      return NextResponse.json({ projects: [] });
    }

    const files = fs.readdirSync(projectsDir).filter(f => f.endsWith('.md') && !f.startsWith('_'));
    const projects = files.map(file => {
      const filePath = path.join(projectsDir, file);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContents);
      return {
        slug: file.replace(/\.md$/, ''),
        ...data,
        content: content.trim(),
      };
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error listing projects:', error);
    return NextResponse.json(
      { error: 'Failed to list projects' },
      { status: 500 }
    );
  }
}
