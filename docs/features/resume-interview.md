# Feature: Structured Resume Interview & Auto-Tagging Pipeline

## Status
Draft — manual interview in progress (2026-03-23)
GitHub Issue: TBD (to be opened after interview is complete)

---

## Problem

The current resume is plain markdown prose. The AI must infer skills, years of experience, and context from unstructured text. This leads to:
- Incorrect year calculations (e.g. development experience showing 2.5 yrs instead of 20+)
- Inconsistent skill naming ("developed" vs "implemented" — same skill, different words)
- Weak job match analysis because skill aggregation is unreliable
- No way to add extended project descriptions without cluttering the resume

---

## Proposed Solution

A structured file `content/resume-data.json` where every resume bullet is tagged with:

```json
{
  "company": "NRG",
  "role": "Development Manager - Billing",
  "dates": "March 2013 – January 2022",
  "tenure_years": 8.8,
  "bullet": "Led 3 Agile Scrum teams of 10 developers and 3 QAs...",
  "skills": ["C#", "SQL Server", "Agile", "Scrum", "Team Leadership"],
  "category": "leadership | architecture | development | management",
  "extended_description": "Optional longer narrative for deeper analysis"
}
```

This file feeds directly into analysis prompts, replacing AI inference with pre-computed, human-verified data.

---

## Interview Process (Manual — current)

A Zoe-led session where each resume bullet is reviewed one at a time:
1. Zoe presents: company, tenure, bullet text, suggested skills
2. Larry responds with a single-key command:
   - **(A)ccept** — approve as-is
   - **(C)orrect** — replace or remove skills (state the change)
   - **(S)kip** — bullet not worth including
   - **(M)ore** — add skills or notes to what was suggested
3. Zoe writes the entry to `resume-data.json`
4. Repeat for all bullets across all sections
5. **Final step — Skill normalization:** review all unique skills across the dataset, consolidate near-duplicates, map single-occurrence skills to canonical equivalents, ensure consistent naming

### Notes from manual interview (2026-03-23)
- `category` is often both `architecture` + `development` — array format is correct, single category was wrong assumption
- Thomson Group has no dated role — interview process should flag missing dates upfront before processing those bullets
- `(M)ore` flow works but requires free-text parsing — automated version should present a numbered skill list to pick from

### Improvements for automated version
- Present suggested skills as a numbered list; user types numbers to toggle, not free text
- Flag companies with no dated role at session start, collect dates before proceeding
- After all bullets, run skill normalization automatically: cluster similar skills, present consolidation suggestions for approval

---

## Automated Interview Process (Future)

### Trigger
Any file added or modified in `content/` triggers the pipeline.

### Steps
1. Detect changed/new file via file watcher or CI hook
2. Parse new/changed content — extract bullets, dates, company names
3. For each new bullet not already in `resume-data.json`:
   a. Call AI to suggest: skills (standardized), category, extended description
   b. Present diff to Larry for approval (CLI prompt or web UI)
   c. On approval, append to `resume-data.json`
4. Recalculate tenure_years for all entries using role date headers
5. Bust the analysis cache

### Standardization Rules (to be defined during manual interview)
- Skill names are canonical (e.g. always "C#" not "C#.NET" or "csharp")
- Category must be one of: `leadership`, `architecture`, `development`, `management`
- `tenure_years` is always calculated from role dates, never estimated
- `extended_description` is optional but encouraged for significant projects

### Open Questions
- Approval UI: CLI (`y/n` prompt) or a `/admin` page in the Next.js app?
- Storage: flat JSON array vs. grouped by company?
- Conflict resolution: what if a bullet is edited in the resume — how do we detect and re-interview just that bullet?

---

## Code Changes Required

- `lib/resume.ts` — add `parseResumeData()` to read and merge `resume-data.json`
- `lib/prompts.ts` — inject structured bullet data into all analysis prompts
- `lib/cache.ts` — ensure `content/resume-data.json` is included in cache hash (already works — watches all files in `content/`)
- `scripts/interview.ts` — CLI script for the automated interview pipeline
- `app/api/interview/route.ts` — optional: web endpoint to trigger interview pipeline

---

## References
- Manual interview session log: see `~/zoe-aiportfolio/STATE/CHANGELOG.md`
- Cache behavior: `lib/cache.ts` — hashes all files in `content/`, auto-busts on any change
