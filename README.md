# IIHM Teaching Log & Summary System

> Working title: **TeachLog**. Rename freely; nothing in the docs depends on the name.

A web app for IIHM Hyderabad that records **what was taught, when, and to whom**. Class Representatives (CRs) log each class as it happens. Teachers review, enrich, and verify those entries, then generate the institute's **Weekly Teaching Log and Summary** (.docx) with one click, along with other reports.

**Status:** Planning complete, no code yet. See [PROGRESS.md](./PROGRESS.md).

---

## The problem

- A 3-year programme has **6 semesters**, and every teacher handles different subjects, often teaching the same subject 2-3 times (different batches or repeat sessions).
- Tracking which topics were covered, in which class, on which day, is manual and error-prone.
- The weekly log sheet is filled by hand at the end of the week, from memory.

## The solution

| Who | What they do |
| --- | --- |
| **Class Representative (CR)** | Logs subject, topic, time, and student count right after class, from a phone. |
| **Teacher** | Sees everything for their subjects and batches, fills in planned topic, method, and assignment, writes the weekly summary, verifies entries, and generates reports. |
| **Admin** | Sets up programmes, batches, subjects, syllabus, users, and CR authorisations. Views all logs. |

Every login, CR authorisation, and data change is written to an audit trail.

## Core features

**MVP** (see [MVP.md](./MVP.md))

- Role-based login: CR, teacher, admin
- CR session logging with edit window and duplicate protection
- Teacher dashboard: view, enrich, verify sessions
- Weekly summary form (the 7 sections from the IIHM template)
- **Weekly Teaching Log and Summary .docx** generation matching the current template
- CR authorisation register and access log

**After MVP**

- Report builder (filters, columns, DOCX/CSV/XLSX)
- Syllabus coverage dashboard across batches and semesters
- PDF export, Program Leader / Director verification, timetable-based "missing entry" alerts, AI-drafted summaries, PWA/offline entry

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend + server | Next.js (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Database, Auth, Storage | Supabase (Postgres + Row Level Security) |
| Validation | Zod |
| DOCX generation | [`docx`](https://www.npmjs.com/package/docx) (server-side, Node runtime) |
| Hosting | Netlify |

Reasoning and alternatives are in [DECISIONS.md](./DECISIONS.md).

## Documentation map

| File | Purpose |
| --- | --- |
| [README.md](./README.md) | This overview |
| [INSTRUCTION.md](./INSTRUCTION.md) | Working rules for whoever (or whatever AI assistant) builds this |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, flows, folder structure |
| [DATABASE.md](./DATABASE.md) | Schema, RLS policies, views, seed data |
| [SECURITY.md](./SECURITY.md) | Roles, permission matrix, audit logging, data protection |
| [REPORTS.md](./REPORTS.md) | Report catalogue and the DOCX template mapping |
| [MVP.md](./MVP.md) | Scope, user stories, acceptance criteria, milestones |
| [PROGRESS.md](./PROGRESS.md) | Live task tracker and changelog |
| [DECISIONS.md](./DECISIONS.md) | Decision log and open questions |

## Getting started (planned)

Not scaffolded yet. The intended setup:

```bash
npx create-next-app@latest teachlog --typescript --tailwind --app
cd teachlog
npm i @supabase/supabase-js @supabase/ssr zod docx date-fns
npm i -D supabase vitest
npx supabase init
```

Create a Supabase project, then add `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Server-only. Never expose to the browser, never prefix with NEXT_PUBLIC_.
SUPABASE_SERVICE_ROLE_KEY=
```

Apply the schema from [DATABASE.md](./DATABASE.md) as a migration in `supabase/migrations/`.

## Reference template

The institute's current sheet lives at `templates/IIHM_Weekly_Teaching_Log_and_Summary_TEMPLATE.docx`. It is the visual reference for the generated report. Do not edit it; see [REPORTS.md](./REPORTS.md).

## Owner

Naveen, Assistant Professor, IIHM Hyderabad.
