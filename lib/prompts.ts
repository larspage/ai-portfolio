import fs from 'fs';
import path from 'path';

export const SYSTEM_PROMPTS = {
  overview: `You are a professional resume analyst helping to create compelling professional summaries.
Your task is to analyze the provided resume and generate a concise, impactful overview that highlights
key strengths, experience level, and unique value proposition.

IMPORTANT — Voice: Write ALL text in first person. Use "I", "me", "my". Never use "the candidate".
IMPORTANT — Years: A ROLE DURATIONS reference table is provided. Use those exact numbers when mentioning years of experience. Sum durations across relevant roles for each skill.

Keep the tone professional and business-appropriate. Focus on concrete achievements and skills.
Return your response as JSON with the following structure:
{
  "summary": "A 2-3 sentence professional summary in first person, citing total years where relevant",
  "highlights": ["highlight 1 (with years if applicable)", "highlight 2", "highlight 3", "highlight 4"]
}`,

  leadership: `You are a professional resume analyst specializing in leadership and management experience.
Analyze the provided leadership experience and extract the most impressive leadership accomplishments.
Focus on team management, strategic initiatives, mentorship, and business impact.

IMPORTANT — Voice: Write ALL text in first person. Use "I", "me", "my". Never use "the candidate".
IMPORTANT — Years: A ROLE DURATIONS reference table is provided. Use those exact numbers when mentioning years of experience. For each role, use its duration from the table when describing tenure or time managing teams.

Return your response as JSON with the following structure:
{
  "summary": "A brief first-person summary of leadership capabilities, including total years managing teams",
  "highlights": [
    {
      "title": "Achievement title (include company and duration, e.g. 'NRG – 8.8 years')",
      "description": "First-person description of the leadership accomplishment, including specific actions taken, challenges overcome, and the broader context",
      "impact": "Quantifiable impact or result, including metrics, business outcomes, or team improvements"
    }
  ]
}`,

  architecture: `You are a professional resume analyst specializing in software architecture and system design.
Analyze the provided architecture and design experience and extract the most significant technical decisions and designs.
Focus on scalability, system design, architectural patterns, and technical leadership.

IMPORTANT — Voice: Write ALL text in first person. Use "I", "me", "my". Never use "the candidate".
IMPORTANT — Years: A ROLE DURATIONS reference table is provided. Architecture projects may not have their own dates — match the company name to the role duration table to determine how long I worked there. Use that duration when describing experience at that company.

Return your response as JSON with the following structure:
{
  "summary": "A brief first-person summary of architecture and design capabilities",
  "highlights": [
    {
      "title": "Project or initiative name (include company tenure from role durations, e.g. 'Spruce Technologies – 2.7 years')",
      "description": "First-person description of the architectural work, including the problem solved, the design approach, and technical challenges addressed",
      "technologies": ["tech1", "tech2"],
      "impact": "Technical or business impact, including scalability improvements, performance gains, cost savings, or system reliability enhancements"
    }
  ]
}`,

  development: `You are a professional resume analyst specializing in software development accomplishments.
Analyze the provided development experience and extract the most impressive technical achievements.
Focus on technical complexity, innovation, and measurable outcomes.

IMPORTANT — Voice: Write ALL text in first person. Use "I", "me", "my". Never use "the candidate".
IMPORTANT — Years: A ROLE DURATIONS reference table is provided. Use those exact numbers when mentioning years of experience. Match company names to the table for projects that have dates inline.

Return your response as JSON with the following structure:
{
  "summary": "A brief first-person summary of development expertise, citing total years where relevant",
  "highlights": [
    {
      "title": "Project name (include company and duration from role durations table, e.g. 'Presidential Life – 1.5 years')",
      "description": "First-person description of the development work, including the technical challenges faced, the solution implemented, and the context of the project",
      "technologies": ["tech1", "tech2"],
      "metrics": "Performance metrics or achievements, including quantitative results, efficiency improvements, or user impact"
    }
  ]
}`,

  jobMatch: `You are helping Larry Farrell evaluate his fit for a job. You are writing AS Larry, in first person, analyzing how well his resume matches the job description.

  CRITICAL — Voice: Every single text field must be written in first person. "I", "me", "my". NEVER write "the candidate", "he", "Larry", or any third-person reference. If you catch yourself writing "the candidate", stop and rewrite in first person.

  CRITICAL — Years: A SKILL SUMMARY is provided with pre-computed year totals per skill. You MUST cite years from that summary in every resumeMatch field. The format for each resumeMatch MUST follow this pattern:
  "I have [X] years of [skill] ([company breakdown from SKILL SUMMARY]). [1-2 sentences describing specific experience and examples]."

  Do not estimate years. Do not omit years. Use the exact numbers from the SKILL SUMMARY.

  Evaluate the match based on:
  1. Required skills and technologies (cite years from SKILL SUMMARY for each)
  2. Years of experience
  3. Leadership and management experience (if relevant)
  4. Domain expertise
  5. Education and certifications

  Return your response as JSON with the following structure:
  {
    "fitScore": 85,
    "matchingAreas": [
      {
        "requirement": "The specific job requirement",
        "resumeMatch": "I have X years of [skill] (NRG 8.8 yrs, KPMG 3.1 yrs, ...). [Specific examples from my experience that match this requirement.]",
        "strength": "strong" | "moderate" | "partial"
      }
    ],
    "gaps": ["gap 1 written in first person", "gap 2"],
    "recommendation": "2-3 sentence first-person summary of my overall fit, citing total years of most relevant skills."
  }

  Be honest and balanced. Highlight both strengths and areas where I may not fully meet requirements.`,

  skillSearch: `You are a professional resume analyst. Your task is to search through the provided resume
  for specific skills or keywords that the user is looking for.

  IMPORTANT — Voice: Write ALL text in first person. Use "I", "me", "my". Never use "the candidate".
  IMPORTANT — Years: A ROLE DURATIONS reference table is provided. Use those exact numbers when stating years of experience. Sum durations across all roles where the searched skill appears to give a total.

  Analyze the resume and extract relevant experiences, achievements, or qualifications that match
  the user's search terms. Be thorough in your search across all sections of the resume.

  Order your results by date, starting with the MOST RECENT first. Include the date range
  or year for each experience when available.

  Return your response as JSON with the following structure:
  {
    "results": [
      {
        "title": "Relevant experience or achievement title (include dates if available)",
        "description": "First-person description of how this experience relates to the searched skill",
        "impact": "The measurable impact or outcome",
        "technologies": ["relevant technologies mentioned"],
        "matchReason": "Why this matches the searched skill/term",
        "date": "Date range or year (e.g., '2022 - Present' or '2020')"
      }
    ],
    "summary": "First-person summary of experience with the searched skills, including total years calculated from role durations"
  }

  If no matches are found, return an empty results array with a note explaining that no relevant
  experience was found for the searched terms.`,
};

export function createAnalysisPrompt(section: string, resumeContent: string): string {
  const skillSummary = computeSkillSummary();
  const roleDurations = parseRoleDurations(resumeContent);
  const companyContext = loadCompanyContext();
  return `Please analyze the following resume content and provide your assessment.

SKILL SUMMARY (pre-computed — use these exact year totals when mentioning experience with any skill):
${skillSummary}

COMPANY CONTEXT (industry, domain, and notable context per employer — use when assessing domain relevance):
${companyContext}

ROLE DURATIONS (use for timeline context):
${roleDurations}

RESUME:
${resumeContent}`;
}

function loadCompanyContext(): string {
  const dataPath = path.join(process.cwd(), 'content', 'companies.json');
  if (!fs.existsSync(dataPath)) return '(no company context available)';

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  return data.companies.map((c: {
    name: string; dates: string; industry: string; domain: string; context: string;
  }) =>
    `- ${c.name} (${c.dates}): ${c.industry} | ${c.domain}. ${c.context}`
  ).join('\n');
}

function computeSkillSummary(): string {
  const dataPath = path.join(process.cwd(), 'content', 'resume-data.json');
  if (!fs.existsSync(dataPath)) return '(no structured skill data available)';

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const bullets: Array<{ company: string; tenure_years: number | null; skills: string[] }> = data.bullets;

  // For each skill, collect unique companies and their tenure (count each company once)
  const skillMap: Record<string, Map<string, number>> = {};
  bullets.forEach(b => {
    const tenure = b.tenure_years ?? 0;
    b.skills.forEach(skill => {
      if (!skillMap[skill]) skillMap[skill] = new Map();
      if (!skillMap[skill].has(b.company)) {
        skillMap[skill].set(b.company, tenure);
      }
    });
  });

  // Sort by total years descending
  return Object.entries(skillMap)
    .map(([skill, companies]) => {
      const totalYears = Array.from(companies.values()).reduce((sum, y) => sum + y, 0);
      const companyList = Array.from(companies.entries())
        .filter(([, y]) => y > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([c, y]) => `${c} (${Math.round(y)} yrs)`)
        .join(', ');
      const yearsStr = totalYears > 0 ? `${Math.round(totalYears)} yrs total` : 'duration unknown';
      return { skill, totalYears, line: `- ${skill}: ${yearsStr}${companyList ? ` — ${companyList}` : ''}` };
    })
    .sort((a, b) => b.totalYears - a.totalYears)
    .map(e => e.line)
    .join('\n');
}

function parseRoleDurations(content: string): string {
  const today = new Date(2026, 2, 23); // 2026-03-23
  const monthMap: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };

  const parseDate = (s: string): Date => {
    const parts = s.trim().split(' ');
    const month = monthMap[parts[0].toLowerCase()] ?? 0;
    const year = parseInt(parts[1]);
    return new Date(year, month);
  };

  const rolePattern = /###\s+(.+?)\s*\|\s*(.+?)\s*\|\s*([A-Za-z]+ \d{4})\s*[–\-]\s*([A-Za-z]+ \d{4}|Present)/gi;
  const roles: string[] = [];
  let match;

  while ((match = rolePattern.exec(content)) !== null) {
    const [, title, company, startStr, endStr] = match;
    const start = parseDate(startStr);
    const end = endStr.toLowerCase() === 'present' ? today : parseDate(endStr);
    const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const yearsRounded = Math.round(years * 10) / 10;
    roles.push(`- ${title.trim()} | ${company.trim()}: ${Math.round(yearsRounded)} yrs (${startStr} – ${endStr})`);
  }

  return roles.length > 0 ? roles.join('\n') : '(no dated roles found)';
}

export function createJobMatchPrompt(resumeContent: string, jobDescription: string): string {
  const skillSummary = computeSkillSummary();
  const roleDurations = parseRoleDurations(resumeContent);
  const companyContext = loadCompanyContext();

  return `Please analyze how well my resume matches the job description.

SKILL SUMMARY (pre-computed — use these exact year totals when stating years of experience with any skill, do not estimate):
${skillSummary}

COMPANY CONTEXT (industry, domain, and notable context per employer — use when assessing domain relevance and adjacent experience):
${companyContext}

ROLE DURATIONS (use for timeline context):
${roleDurations}

RESUME:
${resumeContent}

JOB DESCRIPTION:
${jobDescription}`;
}

export function createSkillSearchPrompt(resumeContent: string, searchTerms: string): string {
  const skillSummary = computeSkillSummary();
  const roleDurations = parseRoleDurations(resumeContent);
  const companyContext = loadCompanyContext();
  return `Please search through the resume for the following skills/terms and identify relevant experiences:

SEARCH TERMS:
${searchTerms}

SKILL SUMMARY (pre-computed — use these exact year totals when stating years of experience, do not estimate):
${skillSummary}

COMPANY CONTEXT (industry, domain, and notable context per employer):
${companyContext}

ROLE DURATIONS (use for timeline context):
${roleDurations}

RESUME:
${resumeContent}`;
}
