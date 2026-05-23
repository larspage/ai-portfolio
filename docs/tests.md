# Test Plan — aiPortfolio

## Conventions

- **API tests**: hit routes directly with HTTP, assert status + body shape.
- **UI tests**: Playwright browser tests — page load, navigation, interaction.
- **Auth-gated routes**: use test credentials or mock session.
- **DB-backed tests**: require a test database with seeded tenants + section configs.

---

## 1. API Routes

### 1.1 Health

| Test | Input | Expected Result |
|---|---|---|
| Health check returns OK | `GET /api/health` | `200 { status: "ok", ... }` |
| Health includes environment | `GET /api/health` | Response body includes `environment` field |
| Health responds under 500ms | `GET /api/health` | Response time < 500ms |

### 1.2 Resume Metadata

| Test | Input | Expected Result |
|---|---|---|
| Returns metadata with name/title/email/linkedin/location | `GET /api/resume` | `200 { metadata: { name, title, email, linkedin, location } }` |
| Returns section keys list | `GET /api/resume` | Response includes `sections` array |
| Returns 500 when resume file missing | `GET /api/resume` when `content/resume.md` deleted | `500 { error }` |

### 1.3 Analyze

#### 1.3.1 Standard Version

| Test | Input | Expected Result |
|---|---|---|
| Analyze overview section | `POST /api/analyze { section: "overview" }` | `200 { summary: string, highlights: string[] }` |
| Analyze leadership section | `POST /api/analyze { section: "leadership" }` | `200 { summary, highlights: [{ title, description, impact }] }` |
| Analyze architecture section | `POST /api/analyze { section: "architecture" }` | `200 { summary, highlights: [{ title, description, technologies, impact }] }` |
| Analyze development section | `POST /api/analyze { section: "development" }` | `200 { summary, highlights: [{ title, description, technologies, metrics }] }` |
| Analyze unknown section falls back to full resume | `POST /api/analyze { section: "unknown" }` | `200` (uses full resume as input) |

#### 1.3.2 Developer Version

| Test | Input | Expected Result |
|---|---|---|
| Analyze overview with developer version | `POST /api/analyze { section: "overview", version: "developer" }` | `200` (uses resume-developer.md) |
| Analyze non-overview with developer version | `POST /api/analyze { section: "development", version: "developer" }` | `200` (uses full resume-developer.md) |
| Unknown version defaults to standard | `POST /api/analyze { section: "overview", version: "invalid" }` | `200` (defaults to `standard`) |

#### 1.3.3 Dynamic Sections (DB-driven)

| Test | Input | Expected Result |
|---|---|---|
| Analyze a section from `section_configs` DB | `POST /api/analyze { section: "leadership" }` with matching DB row | `200` (uses prompt factory + config's resume_section_key) |
| Analyze section with no `resume_section_key` uses full resume | `POST /api/analyze { section: "operations" }` with config that has null resume_section_key | `200` (full resume content sent) |
| Section config's focus_description injected into prompt | `POST /api/analyze { section: "leadership" }` with focus_description set | `200` (response content should align with focus_description) |

#### 1.3.4 Rate Limiting & Errors

| Test | Input | Expected Result |
|---|---|---|
| Rate limit after 20 rapid requests | 21st `POST /api/analyze` in 1 minute | `429 { error }` with `Retry-After` header |
| Missing body returns 400 | `POST /api/analyze` with empty body | `400 { error }` |
| Valid body but no OpenAI key | `POST /api/analyze` with valid body, no key configured | `500 { error }` |
| Extra fields ignored (not rejected) | `POST /api/analyze { section: "overview", extraField: true }` | `200` (extra fields silently ignored) |

### 1.4 Sections CRUD

#### 1.4.1 List

| Test | Input | Expected Result |
|---|---|---|
| List all active sections | `GET /api/sections` | `200 { sections: [{ id, name, label, ... }] }` |
| List all sections (including inactive) | `GET /api/sections?all=true` | `200` with inactive sections included |
| Empty list for tenant with no sections | `GET /api/sections` on new tenant | `200 { sections: [] }` |

#### 1.4.2 Create

| Test | Input | Expected Result |
|---|---|---|
| Create with valid data | `POST /api/sections { name: "test", label: "Test" }` | `201 { section: { name: "test", label: "Test", ... } }` |
| Missing name returns 400 | `POST /api/sections { label: "Test" }` | `400 { error }` |
| Missing label returns 400 | `POST /api/sections { name: "test" }` | `400 { error }` |
| Duplicate name returns 409 | `POST /api/sections { name: "test", label: "Test" }` twice | Second: `409 { error }` |
| Create 9th section when 8 exist returns 400 | Create 9 sections total | 9th: `400 { error: "Maximum of 8 sections allowed" }` |
| Auto-assigns sort_order | `POST /api/sections { name: "new", label: "New" }` | `sort_order` is incremented from max |
| Creates as active by default | `POST /api/sections { name: "new", label: "New" }` | `is_active: true` |

#### 1.4.3 Update

| Test | Input | Expected Result |
|---|---|---|
| Update label | `PUT /api/sections/:id { label: "New Label" }` | `200 { section: { label: "New Label", ... } }` |
| Update focus_description | `PUT /api/sections/:id { focus_description: "New focus" }` | `200` with updated focus_description |
| Update is_active to false | `PUT /api/sections/:id { is_active: false }` | `200 { section: { is_active: false } }` |
| Update non-existent id | `PUT /api/sections/0000-0000 { label: "X" }` | `404 { error }` |
| Partial update preserves other fields | `PUT /api/sections/:id { label: "Only Label" }` | Other fields (name, focus_description) unchanged |

#### 1.4.4 Delete

| Test | Input | Expected Result |
|---|---|---|
| Delete existing section | `DELETE /api/sections/:id` | `200 { success: true }` |
| Delete non-existent section | `DELETE /api/sections/0000-0000` | `404 { error }` |
| Deleted section no longer in GET list | Delete one, then `GET /api/sections` | Deleted section absent |

#### 1.4.5 Reorder

| Test | Input | Expected Result |
|---|---|---|
| Reorder with valid IDs | `PUT /api/sections/reorder { ids: [id3, id1, id2] }` | `200 { sections: [id3, id1, id2] }` in that order |
| Reorder with non-existent ID | `PUT /api/sections/reorder { ids: [bad-id] }` | `400 { error }` or 500 (invalid UUID) |
| Missing ids field | `PUT /api/sections/reorder {}` | `400 { error }` |

### 1.5 Resume Upload & Management

#### 1.5.1 Upload (unauthenticated)

| Test | Input | Expected Result |
|---|---|---|
| Upload without auth | `POST /api/upload-resume` with no session | `401 { error }` |

#### 1.5.2 Upload (authenticated) — Conversion

| Test | Input | Expected Result |
|---|---|---|
| Upload DOCX file | `POST /api/upload-resume` with valid .docx file | `201 { resume: { status: "converted", extracted_text: "...", ... }, downloadUrl }` |
| Upload PDF file | `POST /api/upload-resume` with valid .pdf file | `201` with extracted_text containing text from PDF |
| Upload Markdown file | `POST /api/upload-resume` with valid .md file | `201` with extracted_text matching file content |
| Upload TXT file | `POST /api/upload-resume` with valid .txt file | `201` with extracted_text matching file content |
| No file provided | `POST /api/upload-resume` with empty form | `400 { error }` |
| Unsupported file type | `POST /api/upload-resume` with .png file | `400 { error }` |
| First upload sets is_default=true | First upload on new user account | `201 { isDefault: true }` |
| Second upload doesn't override default | Second upload | `201 { isDefault: false }` |

#### 1.5.3 List Resumes

| Test | Input | Expected Result |
|---|---|---|
| List resumes (authenticated) | `GET /api/resumes` with session | `200 { resumes: [{ id, original_filename, is_default, status, ... }] }` |
| List resumes (unauthenticated) | `GET /api/resumes` no session | `401 { error }` |
| Empty list for new user | `GET /api/resumes` with no uploads | `200 { resumes: [] }` |

#### 1.5.4 Get Single Resume

| Test | Input | Expected Result |
|---|---|---|
| Get own resume | `GET /api/resumes/:id` where resume belongs to user | `200 { resume: { ... } }` |
| Get non-existent resume | `GET /api/resumes/0000-0000` | `404 { error }` |

#### 1.5.5 Set Default

| Test | Input | Expected Result |
|---|---|---|
| Set resume as default | `PUT /api/resumes/:id/default` | `200 { resume: { is_default: true } }` |
| Setting new default clears old default | Set resume A as default, then resume B | A now has `is_default: false`, B has `is_default: true` |
| Set non-existent resume | `PUT /api/resumes/bad-id/default` | `404 { error }` |

#### 1.5.6 Delete Resume

| Test | Input | Expected Result |
|---|---|---|
| Delete own resume | `DELETE /api/resumes/:id` | `200 { success: true }` |
| Delete non-existent | `DELETE /api/resumes/bad-id` | `404 { error }` |

### 1.6 Job Match

| Test | Input | Expected Result |
|---|---|---|
| Match with valid job description | `POST /api/match { jobDescription: "..." }` | `200 { fitScore, matchingAreas, gaps, recommendation }` |
| Missing jobDescription | `POST /api/match {}` | `400 { error }` |
| Match uses first-person voice | `POST /api/match { ... }` | All text fields contain "I", "me", or "my" |
| Match cites skill years | `POST /api/match { ... }` | Each `resumeMatch` includes year numbers |

### 1.7 Skill Search

| Test | Input | Expected Result |
|---|---|---|
| Search for existing skill | `POST /api/skills { terms: "React" }` | `200 { results: [...], summary }` |
| Search for non-existent skill | `POST /api/skills { terms: "COBOL" }` | `200 { results: [], summary }` |
| Missing terms | `POST /api/skills {}` | `400 { error }` |
| Multi-word search | `POST /api/skills { terms: "machine learning" }` | `200` |

### 1.8 Tenant Isolation

| Test | Input | Expected Result |
|---|---|---|
| Tenant A cannot see Tenant B's sections | Cross-tenant GET | `404` or empty results |
| Creating resource scoped to tenant | POST with tenant A context | Resource visible only to A |
| Deleting tenant cascades resources | Delete tenant A | All A's resources also deleted |

---

## 2. UI Pages

### 2.1 Home Page (`/`)

| Test | Description | Expected Result |
|---|---|---|
| Page loads without error | Navigate to `/` | Status 200, no console errors |
| Hero section renders name | Inspect hero | Name from resume metadata displayed |
| Professional summary section renders | Wait for API response | Summary text and highlights visible |
| Skill search section renders | Inspect section | "Do I have what you need?" heading visible |
| Skill search expands on click | Click the section header | Form fields appear with animation |
| Skill search collapses on second click | Click again | Form fields hide |
| Dynamic section cards appear | Wait for `/api/sections` | Cards rendered from section configs |
| Clicking section card navigates | Click a card | URL changes to `/[section-name]` |
| Section card shows label + focus | Inspect card | Label and focus_description from config |
| "Try Job Match Tool" CTA visible | Scroll to CTA | Button linking to `/match` |
| LinkedIn link is correct | Inspect link | URL matches `metadata.linkedin` |
| Loading spinner shows during fetch | Slow network | Spinner visible while API calls pending |
| Error state shows with message | Block API response | Error card with message and setup hint |
| Responsive: mobile layout | Viewport < 768px | Cards stack vertically, hamburger menu appears |

### 2.2 Resume Page (`/resume`)

| Test | Description | Expected Result |
|---|---|---|
| Page loads without error | Navigate to `/resume` | Status 200 |
| Resume markdown rendered as HTML | Inspect content area | Formatted headings, lists, bold text |
| "Developer View" toggle available | Inspect header | Link to `/resume?version=developer` |
| Version toggle switches content | Click "Developer View" | Content changes to developer resume |
| Standard view link works | From dev view click "Standard View" | Content reverts to standard resume |
| Download button appears (if uploaded) | Upload a resume first, visit `/resume` | Download button linking to original file |
| Download button absent (no upload) | No uploaded resume | No download button |
| Page title shows resume name | Uploaded resume | Title = uploaded filename (minus extension) |
| Fallback to legacy file when no DB resume | No uploaded resume | Shows `content/resume.md` content |

### 2.3 Match Page (`/match`)

| Test | Description | Expected Result |
|---|---|---|
| Page loads without error | Navigate to `/match` | Status 200 |
| Instructions section visible | Inspect page | "How it works" steps 1-2-3 rendered |
| Text area for paste | Inspect form | Textarea visible and labeled |
| Submit button present | Inspect form | Button to trigger analysis |
| Loading state during analysis | Submit a JD | Loading spinner shows |
| Results appear after analysis | Wait for response | fitScore, matchingAreas, gaps rendered |
| Error state on failed analysis | Submit with invalid input | Error message displayed |

### 2.4 Dynamic Section Pages (`/[section]`)

| Test | Description | Expected Result |
|---|---|---|
| Known section loads | Navigate to `/leadership` | Status 200, title "Leadership" |
| Section title matches config label | Navigate to any section | Title = section.label |
| Summary text visible | Wait for API | Summary paragraph rendered |
| Highlight cards rendered | Wait for API | One or more SummaryCard components |
| Empty state shown if no highlights | Section with no data | "No X highlights available" message |
| Loading spinner during analysis | Navigate to new section | "Analyzing X experience..." spinner |
| Error state on API failure | Block API, navigate | Error card with message |
| Unknown section returns error | Navigate to `/nonexistent-section` | Error state (not 404 page) |

### 2.5 Settings — Sections (`/settings`)

| Test | Description | Expected Result |
|---|---|---|
| Redirects to login when unauthenticated | Visit `/settings` logged out | Redirect to `/login` |
| "Sections" tab active by default | Visit `/settings` | "Sections" tab highlighted |
| Section list renders | Active sections loaded | Cards with label, name, focus_description |
| Count shows "X/8" | Inspect header | "Sections (4/8)" or similar |
| Empty state when no sections | New tenant | "No sections yet" card |
| Add Section button works | Click button | Form appears |
| Add Section form: name auto-slugifies | Type "My Section" | Name field shows "my-section" |
| Add Section form: label required | Try submit without label | Validation prevents submission |
| Create section succeeds | Fill valid form, submit | New section appears in list |
| Duplicate name rejected | Create with existing name | Error message shown |
| 9th section rejected | Add 9 when 8 exist | Error: max 8 |
| Edit section opens form with data | Click edit icon on a section | Form pre-filled with that section's data |
| Edit: change label | Edit label, submit | Label updated in list |
| Edit: change focus_description | Edit, submit | Description updated |
| Delete section with confirmation | Click delete, confirm "OK" | Section removed from list |
| Reorder: move up | Click up arrow on 2nd item | Items swap |
| Reorder: move down | Click down arrow on 1st item | Items swap |
| Hide section (eye toggle) | Click eye icon on active section | Section becomes inactive, "Hidden" badge appears |
| Show hidden section | Click eye on hidden section | Section becomes active again |
| Error alert dismissible | Trigger an error | Click "Dismiss" to clear |
| Cancel edit form | Open edit, click Cancel | Form closes, no changes saved |

### 2.6 Settings — Resumes (`/settings/resumes`)

| Test | Description | Expected Result |
|---|---|---|
| "Resumes" tab navigates | Click "Resumes" tab | URL `/settings/resumes` |
| Upload area renders | Inspect page | Drag-and-drop zone with "Choose File" button |
| "Default" badge shown on default resume | Upload 1 resume | "Default" badge visible |
| "Set Default" button on non-default | Upload 2nd resume | Second resume has "Set Default" button |
| Set Default works | Click "Set Default" on non-default | Badge moves, API called |
| Delete with confirmation | Click delete, confirm | Resume removed from list |
| Upload unsupported type rejected | Try upload .png | Error: unsupported format |
| Upload DOCX | Upload .docx | Converted, appears in list with status "converted" |
| Upload PDF | Upload .pdf | Converted, appears in list |
| Upload Markdown | Upload .md | Converted, appears in list |
| File size displayed | Inspect resume row | Human-readable size (e.g., "45.2 KB") |
| Duplicate filename handled | Upload same filename twice | Both saved (timestamp prefix prevents collision) |

### 2.7 Auth Pages

| Test | Description | Expected Result |
|---|---|---|
| Login page renders | Navigate to `/login` | Login form with email/password, Google button |
| Signup page renders | Navigate to `/signup` | Registration form |
| Login with valid credentials | Submit valid credentials | Redirect to `/` or `/dashboard` |
| Login with invalid credentials | Submit bad password | Error message displayed |
| Login with unverified email | Submit unverified | Appropriate error |
| Signup creates account + tenant | Submit registration | User created, tenant created, redirect to onboarding |
| Onboarding — industry picker | Navigate to `/onboarding` | 5 industry options rendered as cards |
| Onboarding — select industry | Click industry card | Card highlighted with border |
| Onboarding — next step enabled | Select industry, click Next | Moves to step 2 |
| Onboarding — next step disabled | Don't select, click Next | Button disabled |

### 2.8 Navigation

| Test | Description | Expected Result |
|---|---|---|
| Nav bar renders on all pages | Visit any page | Nav bar visible at top |
| Static links present | Inspect nav | Home, Resume, Job Match, Settings |
| Dynamic section links appear | DB has section configs | Section labels in nav bar |
| Active link highlighted | Navigate to `/resume` | Resume link has active style |
| Mobile hamburger menu | Viewport < 768px | Hamburger icon visible, links hidden |
| Mobile menu expands | Click hamburger | Drop-down with all links |
| Mobile menu link navigates | Click a link in menu | Page navigates, menu closes |

### 2.9 Edge Cases & Error Handling

| Test | Description | Expected Result |
|---|---|---|
| Page not found (404) | Navigate to `/nonexistent` | 404 page or graceful redirect |
| Slow API — timeout | Simulate slow analyze | Loading spinner shows, no crash |
| Network offline | Disconnect network | Error state shown gracefully |
| Empty DB (fresh tenant) | Visit all pages | Empty states, no crashes |
| Very long section name | Create section with 100 char name | Truncated or wrapped in UI |
| Special characters in section name | Name with hyphens, numbers | Works in URL, renders correctly |
| Concurrent uploads | Upload 2 files rapidly | Both processed, no race condition |

---

## Test Implementation Priority

### P0 — Smoke (run always, gate deploys)
- Health check
- Home page loads
- Resume page renders
- Section pages load (one dynamic)
- Navigation renders

### P1 — Core Functionality
- Analyze endpoint (standard + developer versions)
- Sections CRUD (create, read, update, delete)
- Resume upload + conversion
- Login/logout flow
- Job match response shape

### P2 — Edge Cases
- Rate limiting
- Empty states
- Max 8 sections enforcement
- Cross-tenant isolation
- Unsupported file types
- Slow network / loading states

### P3 — Full Coverage
- All UI interaction tests
- Mobile responsive
- Error states on every page
- Concurrent operations
- Special characters and long inputs
