# KodeTalent — AI Career Companion

## Overview

Full-stack AI career companion for Indian engineering students (1st year to placement). Built as a pnpm monorepo with React + Vite frontend, Express API server, PostgreSQL database, and Anthropic AI integration.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (`artifacts/kodetalent`, serves at `/`)
- **API**: Express 5 (`artifacts/api-server`, serves at `/api`)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec`)
- **AI**: Anthropic claude-haiku-4-5 via Replit AI Integrations
- **Routing**: wouter (frontend), mobile-first design
- **Animations**: Framer Motion
- **Build**: esbuild (API server)

## Artifacts

- `artifacts/kodetalent` — React + Vite frontend, previewPath `/`
- `artifacts/api-server` — Express API server, previewPath `/api`

## Libraries

- `lib/api-spec` — OpenAPI spec + Orval codegen config
- `lib/api-zod` — Generated Zod schemas from OpenAPI
- `lib/api-client-react` — Generated React Query hooks from OpenAPI
- `lib/db` — Drizzle ORM schema + database client
- `lib/integrations-anthropic-ai` — Anthropic AI client (Replit integration)

## Database Schema

Tables: `students`, `quests`, `student_quests`, `jobs`, `matches`, `interview_sessions`, `test_sessions`, `conversations`, `messages`

## Features

1. **Onboarding Chatbot** (`/`) — WhatsApp-style chat that collects student info, saves to DB
2. **Gamified Dashboard** (`/dashboard`) — XP, streaks, levels, today's quest, skill bars
3. **Roadmap** (`/roadmap`) — Year-by-year accordion timeline with quest details
4. **Prep Hub** (`/prep`) — Mock interviews and tests launcher
5. **Mock Interview** (`/prep/interview/:id`) — AI-powered 5-question interview with feedback
6. **Mock Test** (`/prep/test/:id`) — Timed MCQ test with results
7. **Job Matches** (`/jobs`) — AI-matched job feed with readiness score
8. **Profile** (`/profile`) — Stats, skills, Career Wrapped shareable modal
9. **Leaderboard** (`/leaderboard`) — College + India tabs

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## API Routes

All routes prefixed with `/api`:
- `GET/POST /students` — student management
- `GET /students/:id/dashboard` — dashboard data
- `GET /students/:id/wrapped` — Career Wrapped data
- `GET/POST /quests` — quest management
- `GET /students/:id/quests` — student quest progress
- `POST /students/:id/quests/:questId/complete` — complete a quest
- `POST /interview/sessions` — create interview session
- `POST /interview/sessions/:id/question` — get next interview question
- `POST /test/sessions` — create test session
- `POST /test/sessions/:id/submit` — submit test answers
- `GET /jobs` — list all jobs
- `GET /students/:id/matches` — get job matches
- `POST /students/:id/matches/generate` — generate job matches
- `GET /leaderboard/india` — India-wide leaderboard
- `GET /leaderboard/college/:college` — college leaderboard
- `GET /ai/roadmap/:studentId` — generate AI roadmap
- `GET/POST /anthropic/conversations` — chat conversations
- `POST /anthropic/conversations/:id/messages` — send message (SSE stream)

## Important Notes

- `lib/api-zod/src/index.ts` must stay as `export * from "./generated/api";` only — orval regenerates it
- Anthropic env vars auto-set by Replit: `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`, `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
- Student ID stored in `localStorage` as `"studentId"` for session persistence
- The `conversations` and `messages` tables use plain names (not `conversationsTable`/`messagesTable`)
- Orval schemas config has `schemas` option removed from zod config to avoid duplicate exports
