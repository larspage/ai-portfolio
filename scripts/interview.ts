/**
 * Automated Interview Pipeline
 *
 * Scans resume markdown files for new bullets not yet in resume-data.json,
 * uses AI to suggest skills + category, and interactively appends approved entries.
 *
 * Usage: npx tsx scripts/interview.ts [--file content/resume.md]
 *        (defaults to scanning both resume.md and resume-developer.md)
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import OpenAI from 'openai';

// --- Types ---

interface ResumeDataBullet {
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

interface ResumeDataSet {
  notes: string;
  bullets: ResumeDataBullet[];
}

interface ParsedBullet {
  company: string;
  role: string;
  dates: string;
  project?: string;
  text: string;
}

interface AISuggestion {
  skills: string[];
  category: string[];
  extended_description?: string;
}

// --- Helpers ---

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

function info(msg: string): void {
  console.log(`\n  ℹ️  ${msg}`);
}

function success(msg: string): void {
  console.log(`  ✅ ${msg}`);
}

function warn(msg: string): void {
  console.log(`  ⚠️  ${msg}`);
}

// --- Resume Markdown Parser ---

function parseMarkdownBullets(filePath: string): ParsedBullet[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Strip frontmatter
  let body = content;
  if (body.startsWith('---')) {
    const end = body.indexOf('---', 3);
    if (end !== -1) {
      body = body.slice(end + 3);
    }
  }

  const bodyLines = body.split('\n');
  const sections = extractSections(bodyLines);
  const bullets: ParsedBullet[] = [];

  for (const sectionLines of sections) {
    // Each section is a block under a ## heading
    // Find ### role/company headings within the section
    const subBlocks = splitSubBlocks(sectionLines);

    for (const sub of subBlocks) {
      // Parse heading: ### Role | Company | Dates
      // or: ### Project Name | Company
      const headingMatch = sub.heading.match(/^###\s+(.+)$/);
      if (!headingMatch) continue;

      const heading = headingMatch[1].trim();
      const parts = heading.split('|').map(s => s.trim());

      let role = '';
      let company = '';
      let dates = '';
      let project: string | undefined;

      if (parts.length >= 3) {
        role = parts[0];
        company = parts[1];
        dates = parts[2];
      } else if (parts.length === 2) {
        // Could be "Project | Company" (architecture section)
        project = parts[0];
        company = parts[1];
      }

      // Extract bullet points
      for (const line of sub.lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ')) {
          bullets.push({
            company,
            role,
            dates,
            project,
            text: trimmed.replace(/^- /, '').trim(),
          });
        }
      }
    }
  }

  return bullets;
}

function extractSections(lines: string[]): string[][] {
  const sections: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current.length > 0) {
        sections.push(current);
      }
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) {
    sections.push(current);
  }

  return sections;
}

function splitSubBlocks(lines: string[]): Array<{ heading: string; lines: string[] }> {
  const blocks: Array<{ heading: string; lines: string[] }> = [];
  let currentHeading = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('### ')) {
      if (currentHeading) {
        blocks.push({ heading: currentHeading, lines: currentLines });
      }
      currentHeading = line;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentHeading) {
    blocks.push({ heading: currentHeading, lines: currentLines });
  }

  return blocks;
}

// --- AI Suggestion ---

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set.\n' +
      'Export it before running: export OPENAI_API_KEY=sk-...'
    );
  }
  return new OpenAI({ apiKey });
}

async function suggestSkills(text: string, company: string, role: string): Promise<AISuggestion> {
  const client = getOpenAIClient();

  const prompt = `You are helping tag a resume bullet point with skills and categories.

Resume bullet: "${text}"
Company: ${company}
Role: ${role}

Respond with JSON only (no markdown):
{
  "skills": ["skill1", "skill2", ...],
  "category": ["leadership" | "architecture" | "development" | "management"],
  "extended_description": "Optional longer narrative describing the project context"
}

Rules:
- Skills should be specific technologies, methodologies, or domain knowledge
- Use canonical skill names (e.g. "C#" not "csharp", ".NET" not ".NET Framework")
- Category can be one or more of: leadership, architecture, development, management
- extended_description is optional — only include if the bullet describes a project with significant context worth noting
- Keep skills to 3-8 most relevant ones
- Use standardized names already present in the existing dataset`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content || '{}';
  // Strip markdown code blocks
  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  return JSON.parse(cleaned) as AISuggestion;
}

// --- Tenure Calculator ---

function calculateTenureYears(dates: string): number | null {
  if (!dates) return null;

  const monthMap: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };

  const datePattern = /([A-Za-z]+)\s+(\d{4})\s*[–-]\s*([A-Za-z]+\s+\d{4}|Present)/i;
  const match = dates.match(datePattern);
  if (!match) return null;

  const startMonth = monthMap[match[1].toLowerCase()] ?? 0;
  const startYear = parseInt(match[2]);
  const endStr = match[3].toLowerCase();
  const today = new Date();

  let endDate: Date;
  if (endStr === 'present') {
    endDate = today;
  } else {
    const endParts = endStr.split(' ');
    const endMonth = monthMap[endParts[0].toLowerCase()] ?? 0;
    const endYear = parseInt(endParts[1]);
    endDate = new Date(endYear, endMonth);
  }

  const startDate = new Date(startYear, startMonth);
  const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.round(years * 10) / 10;
}

// --- Main Pipeline ---

async function runInterview(filePaths: string[]): Promise<void> {
  console.log('\n=== Automated Resume Interview Pipeline ===\n');

  // 1. Load existing data
  const dataPath = path.join(process.cwd(), 'content', 'resume-data.json');
  let existingData: ResumeDataSet;
  if (fs.existsSync(dataPath)) {
    existingData = JSON.parse(fs.readFileSync(dataPath, 'utf8')) as ResumeDataSet;
    info(`Loaded existing resume-data.json with ${existingData.bullets.length} bullets`);
  } else {
    existingData = { notes: '', bullets: [] };
    warn('No existing resume-data.json found — starting fresh');
  }

  // 2. Parse markdown files and find new bullets
  const existingTexts: string[] = existingData.bullets.map(
    b => b.bullet.toLowerCase().replace(/\s+/g, ' ').trim()
  );

  const newBullets: Array<{ file: string; bullet: ParsedBullet }> = [];

  for (const filePath of filePaths) {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      warn(`File not found: ${filePath} — skipping`);
      continue;
    }

    const parsed = parseMarkdownBullets(fullPath);
    info(`Parsed ${parsed.length} bullets from ${filePath}`);

    for (const bullet of parsed) {
      const normalized = bullet.text.toLowerCase().replace(/\s+/g, ' ').trim();
      if (existingTexts.includes(normalized)) continue;

      // Check substring containment
      let found = false;
      for (const existing of existingTexts) {
        if (existing.includes(normalized) || normalized.includes(existing)) {
          found = true;
          break;
        }
      }
      if (!found) {
        newBullets.push({ file: filePath, bullet });
      }
    }
  }

  if (newBullets.length === 0) {
    success('No new bullets found — everything is already in resume-data.json');
    rl.close();
    return;
  }

  info(`Found ${newBullets.length} new bullet(s) not yet in resume-data.json\n`);

  // 3. Process each new bullet
  const approvedBullets: ResumeDataBullet[] = [];

  for (let i = 0; i < newBullets.length; i++) {
    const { file, bullet } = newBullets[i];

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Bullet ${i + 1}/${newBullets.length} [from ${path.basename(file)}]`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`  Company: ${bullet.company}`);
    if (bullet.role) console.log(`  Role:     ${bullet.role}`);
    if (bullet.dates) console.log(`  Dates:    ${bullet.dates}`);
    if (bullet.project) console.log(`  Project:  ${bullet.project}`);
    console.log(`  Text:     ${bullet.text}\n`);

    // Get AI suggestion
    console.log('  🤖 Getting AI skill suggestion...');
    let suggestion: AISuggestion;
    try {
      suggestion = await suggestSkills(bullet.text, bullet.company, bullet.role);
      console.log(`  Suggested skills:   ${suggestion.skills.join(', ')}`);
      console.log(`  Suggested category: ${suggestion.category.join(', ')}`);
      if (suggestion.extended_description) {
        console.log(`  Extended desc:      ${suggestion.extended_description.slice(0, 100)}...`);
      }
    } catch (error) {
      warn(`AI suggestion failed: ${error}`);
      suggestion = { skills: [], category: ['development'] };
      console.log('  Using defaults — you can edit manually');
    }

    // Interactive approval
    let choice = '';
    while (!choice) {
      console.log('');
      const action = await ask(
        '  Actions:\n' +
        '    (A)ccept — approve as-is\n' +
        '    (C)orrect — edit skills/category\n' +
        '    (S)kip — skip this bullet\n' +
        '    (M)ore — add extended description\n' +
        '  Choice (a/c/s/m): '
      );
      choice = action.trim().toLowerCase();
      if (!choice) {
        console.log('  Please enter a valid option.');
      }
    }

    if (choice === 's' || choice.startsWith('s')) {
      warn('Skipped');
      continue;
    }

    let finalSkills = suggestion.skills;
    let finalCategory = suggestion.category;
    let finalExtended = suggestion.extended_description;

    if (choice.startsWith('c')) {
      const skillsStr = await ask('  Enter skills (comma-separated): ');
      if (skillsStr.trim()) {
        finalSkills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
      }
      const catStr = await ask('  Enter category (comma-separated: leadership, architecture, development, management): ');
      if (catStr.trim()) {
        finalCategory = catStr.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      }
      const extStr = await ask('  Extended description (optional, press Enter to skip): ');
      if (extStr.trim()) {
        finalExtended = extStr.trim();
      }
    }

    if (choice.startsWith('m')) {
      const extStr = await ask('  Extended description: ');
      if (extStr.trim()) {
        finalExtended = extStr.trim();
      }
      // Also allow skill edits
      const editSkills = await ask('  Edit skills? (y/N): ');
      if (editSkills.trim().toLowerCase() === 'y') {
        const skillsStr = await ask('  Enter skills (comma-separated): ');
        if (skillsStr.trim()) {
          finalSkills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
        }
        const catStr = await ask('  Enter category (comma-separated): ');
        if (catStr.trim()) {
          finalCategory = catStr.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        }
      }
    }

    // Calculate tenure
    const tenure = calculateTenureYears(bullet.dates) ?? 0;

    const newEntry: ResumeDataBullet = {
      company: bullet.company,
      role: bullet.role,
      dates: bullet.dates,
      tenure_years: tenure,
      bullet: bullet.text,
      skills: finalSkills,
      category: finalCategory.length > 0 ? finalCategory : ['development'],
    };

    if (bullet.project) newEntry.project = bullet.project;
    if (finalExtended) newEntry.extended_description = finalExtended;

    approvedBullets.push(newEntry);
    success('Approved');
  }

  // 4. Update resume-data.json
  if (approvedBullets.length > 0) {
    existingData.bullets.push(...approvedBullets);
    existingData.notes = `Updated ${new Date().toISOString().split('T')[0]} via automated interview pipeline.`;

    fs.writeFileSync(dataPath, JSON.stringify(existingData, null, 2));
    success(`Added ${approvedBullets.length} new bullet(s) to resume-data.json`);
    console.log(`  Total bullets: ${existingData.bullets.length}`);

    // 5. Bust cache
    const cacheDir = path.join(process.cwd(), '.cache');
    if (fs.existsSync(cacheDir)) {
      const cacheFiles = fs.readdirSync(cacheDir);
      for (const f of cacheFiles) {
        fs.unlinkSync(path.join(cacheDir, f));
      }
      success('Analysis cache busted');
    }
  } else {
    info('No new bullets were approved — resume-data.json unchanged');
  }

  console.log('\n=== Interview complete ===\n');
  rl.close();
}

// --- Entry Point ---

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf('--file');
  let files: string[];

  if (fileIndex !== -1 && args[fileIndex + 1]) {
    files = [args[fileIndex + 1]];
  } else {
    // Default: scan both resumes
    files = ['content/resume.md', 'content/resume-developer.md'];
  }

  try {
    await runInterview(files);
  } catch (error) {
    console.error('\n❌ Interview failed:', error);
    rl.close();
    process.exit(1);
  }
}

main();
