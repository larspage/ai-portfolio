/**
 * Section templates — standardized industry groupings with suggested categories.
 * Used during onboarding to pre-fill a new user's section configs.
 *
 * Based on BLS standardized industry groupings.
 */

export interface SectionTemplate {
  name: string;
  label: string;
  focus_description: string;
  resume_section_key: string | null;
  sort_order: number;
}

export interface IndustryGrouping {
  id: string;
  label: string;
  description: string;
  suggestedSections: SectionTemplate[];
}

export const INDUSTRY_GROUPINGS: IndustryGrouping[] = [
  {
    id: 'business-finance-admin',
    label: 'Business, Finance & Admin',
    description: 'Banking, marketing, management, and human resources.',
    suggestedSections: [
      { name: 'overview', label: 'Professional Summary', focus_description: 'Provide a high-level overview of my career, key strengths', resume_section_key: null, sort_order: 0 },
      { name: 'leadership', label: 'Leadership', focus_description: 'Team management, strategic planning, and organizational impact', resume_section_key: null, sort_order: 1 },
      { name: 'operations', label: 'Operations & Process', focus_description: 'Process improvement, operational efficiency, and project management', resume_section_key: null, sort_order: 2 },
      { name: 'finance', label: 'Financial Analysis', focus_description: 'Budgeting, forecasting, financial modeling, and cost optimization', resume_section_key: null, sort_order: 3 },
      { name: 'business-dev', label: 'Business Development', focus_description: 'Client relationships, revenue growth, partnerships, and market expansion', resume_section_key: null, sort_order: 4 },
      { name: 'hr', label: 'Human Resources', focus_description: 'Talent acquisition, employee development, culture, and organizational design', resume_section_key: null, sort_order: 5 },
    ],
  },
  {
    id: 'stem-it',
    label: 'STEM & IT',
    description: 'Software development, engineering, cybersecurity, and data science.',
    suggestedSections: [
      { name: 'overview', label: 'Professional Summary', focus_description: 'Provide a high-level overview of my technical career, key strengths', resume_section_key: null, sort_order: 0 },
      { name: 'leadership', label: 'Leadership', focus_description: 'Team management, mentorship, and strategic technical initiatives', resume_section_key: null, sort_order: 1 },
      { name: 'architecture', label: 'Architecture & Design', focus_description: 'System design, scalability, and technical decision-making', resume_section_key: null, sort_order: 2 },
      { name: 'development', label: 'Development', focus_description: 'Technical achievements, coding projects, and engineering accomplishments', resume_section_key: null, sort_order: 3 },
      { name: 'research', label: 'Research & Innovation', focus_description: 'R&D, prototyping, patents, and emerging technology exploration', resume_section_key: null, sort_order: 4 },
      { name: 'devops', label: 'DevOps & Infrastructure', focus_description: 'CI/CD, cloud infrastructure, reliability, and deployment automation', resume_section_key: null, sort_order: 5 },
    ],
  },
  {
    id: 'healthcare-human-services',
    label: 'Healthcare & Human Services',
    description: 'Medical care, therapy, social work, and education.',
    suggestedSections: [
      { name: 'overview', label: 'Professional Summary', focus_description: 'Provide a high-level overview of my healthcare career, key strengths', resume_section_key: null, sort_order: 0 },
      { name: 'clinical', label: 'Clinical Experience', focus_description: 'Patient care, clinical procedures, diagnoses, and treatment outcomes', resume_section_key: null, sort_order: 1 },
      { name: 'administration', label: 'Administration', focus_description: 'Healthcare management, compliance, policy, and operational leadership', resume_section_key: null, sort_order: 2 },
      { name: 'research', label: 'Research & Publications', focus_description: 'Medical research, studies, publications, and evidence-based practice', resume_section_key: null, sort_order: 3 },
      { name: 'education', label: 'Teaching & Education', focus_description: 'Curriculum development, instruction, training, and educational leadership', resume_section_key: null, sort_order: 4 },
      { name: 'community', label: 'Community & Social Services', focus_description: 'Outreach, counseling, social work, and community program management', resume_section_key: null, sort_order: 5 },
    ],
  },
  {
    id: 'arts-communications',
    label: 'Arts & Communications',
    description: 'Design, writing, media, and entertainment.',
    suggestedSections: [
      { name: 'overview', label: 'Professional Summary', focus_description: 'Provide a high-level overview of my creative career, key strengths', resume_section_key: null, sort_order: 0 },
      { name: 'creative-work', label: 'Creative Portfolio', focus_description: 'Key creative projects, designs, publications, and artistic achievements', resume_section_key: null, sort_order: 1 },
      { name: 'leadership', label: 'Leadership', focus_description: 'Team leadership, creative direction, and project management', resume_section_key: null, sort_order: 2 },
      { name: 'technical', label: 'Technical Skills', focus_description: 'Tools, software, platforms, and technical competencies', resume_section_key: null, sort_order: 3 },
      { name: 'client-work', label: 'Client & Campaign Work', focus_description: 'Client relationships, campaign results, audience growth, and brand impact', resume_section_key: null, sort_order: 4 },
      { name: 'awards', label: 'Awards & Recognition', focus_description: 'Industry awards, publications, exhibitions, and professional recognition', resume_section_key: null, sort_order: 5 },
    ],
  },
  {
    id: 'trades-logistics',
    label: 'Trades & Logistics',
    description: 'Manufacturing, construction, agriculture, and transportation.',
    suggestedSections: [
      { name: 'overview', label: 'Professional Summary', focus_description: 'Provide a high-level overview of my career, key strengths', resume_section_key: null, sort_order: 0 },
      { name: 'operations', label: 'Operations', focus_description: 'Day-to-day operations, process management, and operational improvements', resume_section_key: null, sort_order: 1 },
      { name: 'safety', label: 'Safety & Compliance', focus_description: 'Safety records, regulatory compliance, certifications, and training', resume_section_key: null, sort_order: 2 },
      { name: 'projects', label: 'Project Management', focus_description: 'Project planning, execution, timelines, budgets, and resource management', resume_section_key: null, sort_order: 3 },
      { name: 'technical', label: 'Technical Skills', focus_description: 'Equipment operation, technical certifications, specialized trade skills', resume_section_key: null, sort_order: 4 },
      { name: 'leadership', label: 'Supervision & Leadership', focus_description: 'Team supervision, crew management, training, and personnel development', resume_section_key: null, sort_order: 5 },
    ],
  },
];

/**
 * Resolve the suggested sections for a given industry ID.
 */
export function getSectionsForIndustry(industryId: string): SectionTemplate[] {
  const grouping = INDUSTRY_GROUPINGS.find(g => g.id === industryId);
  return grouping?.suggestedSections ?? INDUSTRY_GROUPINGS[0].suggestedSections;
}
