# KodeTalent — AI Career Companion

## Overview

Full-stack AI career companion for Indian engineering students (1st year → placement). Built as a pnpm monorepo with React + Vite frontend, Express API server, PostgreSQL database, and Anthropic claude-haiku-4-5 AI integration.

---

## Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces |
| Node.js | v24 |
| TypeScript | 5.9 |
| Frontend | React + Vite (`artifacts/kodetalent`) |
| API | Express 5 (`artifacts/api-server`) |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod v4 + drizzle-zod |
| API Codegen | Orval (OpenAPI → React Query + Zod) |
| AI | Anthropic claude-haiku-4-5 (Replit AI Integration) |
| Routing | wouter (client-side, mobile-first) |
| Animations | Framer Motion |
| Styling | Tailwind CSS + shadcn/ui |
| API Build | esbuild |

---

## Monorepo Structure

```
artifacts/
  kodetalent/          # React + Vite frontend (previewPath /)
  api-server/          # Express API server (previewPath /api)
  recruiter-portal/    # React + Vite recruiter marketplace (previewPath /recruiter-portal/)
  mockup-sandbox/      # Canvas/component preview server

lib/
  api-spec/            # OpenAPI spec + Orval codegen config
  api-zod/             # Generated Zod schemas
  api-client-react/    # Generated React Query hooks
  db/                  # Drizzle ORM schema + DB client
  integrations-anthropic-ai/   # Anthropic AI client

scripts/               # Shared utility scripts
```

---

## Design Tokens

| Token | Value |
|---|---|
| Background | `#f5f3ff` |
| Primary | `#7c3aed` |
| Secondary | `#06b6d4` |
| Success | `#10b981` |
| Text dark | `#1e1b4b` |
| Text muted | `#6b7280` |

---

## Pages & Routes

| Route | Page | Description |
|---|---|---|
| `/` | Onboarding | 10-step WhatsApp-style chatbot collecting student profile (name, college, branch, CGPA, dream company, target package, skills, interests) |
| `/dashboard` | Home | Gamified dashboard — Points ⭐, streak 🔥, level badge, today's goal, skill progress bars |
| `/roadmap` | Roadmap | Year-by-year accordion learning timeline with quest cards |
| `/practice` | Practice | Mock interview + timed MCQ test launcher |
| `/practice/interview/:id` | Mock Interview | AI 5-question interview with per-question feedback and overall score |
| `/practice/test/:id` | Mock Test | Timed 10-question MCQ test with results |
| `/opportunities` | Opportunities | 12-domain career explorer (domain grid → sub-domain list → Jobs/Internship/Freelancing cards + Prepare button) |
| `/opportunities/course` | Course | Full Coursera-style AI course for the selected sub-domain |
| `/profile` | Profile | Rich profile: strength ring, open-to-work toggle, GitHub/LinkedIn AI analyzer, bio, projects, certifications, work preferences, commitment score |

---

## Navigation

5-item bottom nav: **Home · Roadmap · Practice · Opportunities · Profile**

---

## Opportunities Explorer

Three-level drill-down:

1. **Domain grid** — 12 cards: Data & Analytics, UI/UX Design, Web Development, Mobile Dev, AI/ML, Cybersecurity, Cloud & DevOps, Blockchain, Game Dev, Embedded/IoT, QA & Testing, Product Mgmt
2. **Sub-domain list** — 4 sub-domains per domain (48 total)
3. **Opportunity cards** — Jobs / Internship / Freelancing tabs with real company listings + **Prepare** and **Apply** actions

Sub-domain data lives in `artifacts/kodetalent/src/data/domains.ts` (shared across Opportunities and the preloader).

---

## Course Page (`/opportunities/course`)

Entered via the **Prepare** button on any opportunity card. Context (sub-domain name, domain, skills, colors) is stored in `sessionStorage` under `"courseContext"`.

### Loading screen
Always shows a minimum **3-second live-generation animation** regardless of cache state:
- Pulsing domain emoji
- Animated progress bar (0 → 100%)
- Rotating status messages every 520ms
- 4-step checklist ticking off in real time

### Tabs

#### Course (Roadmap)
- **Progress ring banner** — circular SVG, overall completion % and lesson count
- **Module accordion** — 5 modules, expand/collapse; each shows: module number, emoji, title, duration, per-module progress bar
- **Lesson rows** — type icon (🎬 Video / 📖 Reading / ✏️ Exercise / 🛠️ Project), title, duration, strikethrough when done
- **Lesson detail** (inline expand) — description, 2 key takeaways, **Watch on YouTube** button (opens targeted search), **Mark Done** toggle
- Progress persisted in `localStorage` under `lesson_progress_<subDomainId>`

#### Flashcards
- SM-2 spaced repetition (12 AI-generated cards)
- 3D flip animation, 4 grade buttons (Again / Hard / Good / Easy)
- Daily new-card cap (20/day), leech detection (>4 lapses), study streak
- localStorage keys: `flashcards_progress_<id>`, `daily_new_<id>_<date>`, `flashcard_streak`, `flashcard_last_study`

#### Quiz
- 5 AI MCQ questions (2 easy / 2 medium / 1 hard)
- Instant correct/wrong highlight + explanation
- Results screen with per-question breakdown + retry

### Caching
Cache key: `course_content_v2_<subDomainId>` in localStorage. Cache is permanent until cleared. Old `course_content_<id>` keys (no lesson data) are ignored.

---

## Background Course Preloader

`artifacts/kodetalent/src/hooks/useCoursePreloader.ts`

Triggered 1.5s after Opportunities page mounts. Silently generates all 48 sub-domain courses in **batches of 4** using `Promise.all`. Each batch saves to localStorage on success. A module-level singleton prevents duplicate runs. Status tracked under `course_preload_status` in localStorage.

---

## API Endpoints

All routes under `/api`:

### Students
| Method | Route | Description |
|---|---|---|
| GET | `/students` | List all students |
| POST | `/students` | Create student |
| GET | `/students/:id/dashboard` | Dashboard data (XP, streak, quests, skills) |
| GET | `/students/:id/wrapped` | Career Wrapped stats |

### Quests
| Method | Route | Description |
|---|---|---|
| GET | `/quests` | All available quests |
| GET | `/students/:id/quests` | Student quest progress |
| POST | `/students/:id/quests/:questId/complete` | Mark quest complete |

### Practice
| Method | Route | Description |
|---|---|---|
| POST | `/interview/sessions` | Create interview session |
| POST | `/interview/sessions/:id/question` | Get next AI question |
| PATCH | `/interview/sessions/:id/feedback` | Submit answer + get AI feedback |
| POST | `/test/sessions` | Create test session |
| POST | `/test/sessions/:id/submit` | Submit answers, get score |

### Profile (new)
| Method | Route | Description |
|---|---|---|
| GET | `/students/:id/full-profile` | Full enriched profile (all 14 new columns) |
| PATCH | `/students/:id/profile` | Update bio, projects, certs, links, preferences |
| POST | `/students/:id/analyze-github` | Fetch real GitHub API stats + compute profileStrength |
| POST | `/students/:id/analyze-linkedin` | AI (claude-haiku-4-5) LinkedIn profile analysis |
| GET | `/talent-pool` | All students for recruiter portal (includes githubStats, scores) |

### Jobs & Matches
| Method | Route | Description |
|---|---|---|
| GET | `/jobs` | All job listings |
| GET | `/students/:id/matches` | Student's matched jobs |
| POST | `/students/:id/matches/generate` | AI-generate job matches |

### Course (AI)
| Method | Route | Description |
|---|---|---|
| POST | `/course/generate` | Generate full course for a sub-domain |

The course endpoint makes **two sequential AI calls** to stay within token limits:
1. Call 1 → 5 modules × 3 lessons each (with type, duration, description, keyPoints, searchQuery) — `max_tokens: 4000`
2. Call 2 → 10 flashcards + 5 quiz questions — `max_tokens: 3000`
Both results are merged and returned as one JSON object.

### Leaderboard & AI
| Method | Route | Description |
|---|---|---|
| GET | `/leaderboard/india` | India-wide leaderboard |
| GET | `/leaderboard/college/:college` | College leaderboard |
| GET | `/ai/roadmap/:studentId` | AI-generated roadmap |
| GET/POST | `/anthropic/conversations` | Chat conversations |
| POST | `/anthropic/conversations/:id/messages` | Send message (SSE stream) |

---

## Database Schema

Tables: `students`, `quests`, `student_quests`, `jobs`, `matches`, `interview_sessions`, `test_sessions`, `conversations`, `messages`

### New columns on `students` (added for data-collection / recruiter marketplace)
`linkedinUrl`, `portfolioUrl`, `phone`, `bio`, `projects` (JSONB), `certifications` (JSONB), `openToWork`, `workMode`, `preferredLocations` (JSONB), `expectedSalary`, `githubStats` (JSONB), `linkedinData` (JSONB), `profileStrength`, `commitmentScore`

**profileStrength** — computed server-side (max 100): github+10, linkedin+15, portfolio+5, phone+5, bio+10, projects≥1+20, projects≥3+5, certs+10, locations+5, salary+5, githubStats+5, linkedinData+5
**commitmentScore** — `min(xp/25,40) + min(streakCount×3,30) + overallScore×0.3`

---

## Key Commands

```bash
# Full typecheck across all packages
pnpm run typecheck

# Regenerate React Query hooks + Zod schemas from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes to dev database
pnpm --filter @workspace/db run push
```

---

## Key Files

| File | Purpose |
|---|---|
| `artifacts/kodetalent/src/data/domains.ts` | Shared DOMAINS + ALL_SUBDOMAINS constants (48 sub-domains) |
| `artifacts/kodetalent/src/hooks/useCoursePreloader.ts` | Background course pre-generation hook |
| `artifacts/kodetalent/src/pages/Course.tsx` | Full Coursera-style course page (roadmap + SM-2 flashcards + quiz) |
| `artifacts/kodetalent/src/pages/Opportunities.tsx` | 3-level domain explorer |
| `artifacts/kodetalent/src/pages/Onboarding.tsx` | 10-step WhatsApp chatbot onboarding |
| `artifacts/api-server/src/routes/course.ts` | POST /api/course/generate (two-call AI strategy) |
| `artifacts/api-server/src/routes/interview.ts` | AI interview with feedback |
| `artifacts/api-server/src/routes/index.ts` | Route registration |
| `artifacts/api-server/src/routes/profile.ts` | Profile API + talent-pool route |
| `artifacts/kodetalent/src/pages/Profile.tsx` | Rich 851-line profile page (strength ring, GitHub/LinkedIn AI, projects, certs) |
| `artifacts/recruiter-portal/src/App.tsx` | Recruiter portal routing (wouter) |
| `artifacts/recruiter-portal/src/pages/Login.tsx` | Recruiter login (company/name/email → localStorage) |
| `artifacts/recruiter-portal/src/pages/TalentPool.tsx` | Browse + filter all candidates (search, work mode, field, CGPA, strength) |
| `artifacts/recruiter-portal/src/pages/StudentDetail.tsx` | Full candidate view (scores, GitHub, skills, projects, certs, LinkedIn AI) |
| `artifacts/recruiter-portal/src/pages/Shortlist.tsx` | Shortlisted candidates + CSV export |

---

## Important Notes

- `lib/api-zod/src/index.ts` must stay as `export * from "./generated/api"` only — Orval regenerates it
- Anthropic env vars are auto-set by Replit: `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`, `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
- Student ID stored in `localStorage` as `"studentId"` for session persistence
- Language rule: use "Points ⭐" not "XP"; "Today's Goal" not "Today's Quest"; Streak and Level are fine
- The `conversations` and `messages` DB tables use plain names (not `conversationsTable`/`messagesTable`)
- Do **not** run `pnpm dev` or `pnpm run dev` at workspace root — use `restart_workflow` instead
- Vite dev server must have `server.allowedHosts: true` (proxied iframe)
