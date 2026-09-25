# INSTRUCTION.md

Working rules for building this project. Written for a human developer or an AI coding assistant (Claude Code, Cursor, etc.). **Read this file, then [PROGRESS.md](./PROGRESS.md), before doing anything.**

---

## 1. Project brief

Build a web system where:

1. **Class Representatives (CRs)** log each class: subject, topic, time, number of students present.
2. **Teachers** log in to view, enrich, verify, and report on those entries for the subjects and batches they teach.
3. **Admins** manage master data (programmes, batches, subjects, syllabus, users) and CR authorisations.
4. The system generates the **IIHM Weekly Teaching Log and Summary** as a `.docx`, plus other reports.
5. Every authorisation and data change is logged.

Institution context: IIHM Hyderabad. 3-year programme, 2 semesters per year, **6 semesters total**. Teaching week is **Monday to Saturday**.

## 2. Source-of-truth documents

| Question | Read |
| --- | --- |
| What are we building first? | [MVP.md](./MVP.md) |
| How is it structured? | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| What are the tables and policies? | [DATABASE.md](./DATABASE.md) |
| Who can do what? | [SECURITY.md](./SECURITY.md) |
| What does the DOCX look like? | [REPORTS.md](./REPORTS.md) + `templates/` |
| What is done / next? | [PROGRESS.md](./PROGRESS.md) |
| Why was X chosen? Open questions? | [DECISIONS.md](./DECISIONS.md) |

If code and docs disagree, **stop and flag it**. Do not silently pick one.

## 3. Golden rules

1. **Security lives in the database.** Every table has Row Level Security enabled. UI checks are convenience only; RLS is the enforcement.
2. **The service-role key is server-only.** Never import it into client components, never prefix it with `NEXT_PUBLIC_`, never log it.
3. **All writes go through validated server actions or route handlers** (Zod schemas). No direct table writes from the browser except where an RLS policy has been deliberately written and tested for it.
4. **No hard deletes** on `class_sessions`, `weekly_summaries`, `cr_authorisations`. Use status or `revoked_at`. Audit tables are append-only.
5. **Audit everything that matters:** logins, CR grant/revoke, session create/update/delete, verification, report generation.
6. **DOCX generation is server-side only** (Node runtime, not Edge). Reports must match the template in [REPORTS.md](./REPORTS.md).
7. **Stay inside MVP scope** ([MVP.md](./MVP.md)) unless the owner says otherwise. Note good ideas in PROGRESS.md under "Backlog"; do not build them.
8. **Ask before changing the schema** in a way that alters meaning (renaming, dropping, changing types). Additive changes are fine if documented in DATABASE.md.
9. **Mobile first.** CRs will use phones. Design the CR screens at 360px width first.
10. **Time zone:** store `timestamptz` in UTC; treat dates and class times as **Asia/Kolkata** when displaying and when computing weeks.

## 4. Stack and conventions

- **Next.js (App Router) + TypeScript (strict)**. Server Components by default; Client Components only for interactivity.
- **Supabase**: `@supabase/ssr` for cookie-based auth in server code. Separate helpers for browser client, server client, and middleware.
- **Zod** for every input boundary. Share schemas between forms and server actions.
- **Tailwind + shadcn/ui** for UI. Keep components small and in `components/`.
- **`docx`** library for report generation; report code lives in `lib/reports/`.
- **Naming:** tables and columns `snake_case`; TypeScript `camelCase`; components `PascalCase`; files `kebab-case`.
- **Migrations:** every schema change is a file in `supabase/migrations/`. Never edit the database by hand in the dashboard without capturing it as a migration.
- **Types:** generate DB types with `supabase gen types typescript` and commit them.
- **Env:** never commit `.env*`. Keep `.env.example` current.

## 5. Domain vocabulary

| Term | Meaning |
| --- | --- |
| Programme | e.g. a 3-year hospitality degree. Has 6 semesters. |
| Batch | A cohort of students, e.g. intake 2025-28. Has a `current_semester` (1-6) and a class strength. |
| Subject | Belongs to a programme and a semester. |
| Syllabus topic | An ordered topic under a subject. Used to compute coverage. |
| Teaching assignment | Teacher + subject + batch + academic year. |
| Session | One class that took place: date, start/end time, topic(s), students present. |
| CR | Student who is authorised to log sessions for one batch. |
| Weekly summary | Teacher-written summary for one subject + batch + week. |
| Week | Monday-Saturday. Week number is counted from the batch's semester start date. |

## 6. Task workflow

For every task:

1. Read [PROGRESS.md](./PROGRESS.md) and pick the next unchecked item in the current phase.
2. Re-read the relevant doc sections (schema, security, reports).
3. Implement in small steps. Prefer several small commits to one large one.
4. Write or update tests (see below).
5. Run type-check, lint, and tests.
6. Update PROGRESS.md: tick the item, add a dated changelog line, note any new open question.
7. If you changed behaviour that a doc describes, update that doc in the same change.

## 7. Testing expectations

- **RLS tests are mandatory** for each table. Minimum cases:
  - A CR can read/write only their authorised batch.
  - A revoked CR loses access immediately.
  - A CR cannot edit a verified session or one outside the edit window.
  - A teacher sees only their assigned subjects/batches.
  - An unauthenticated request gets nothing.
- **Report tests:** generate a DOCX from fixture data, unzip it, and assert the header fields, row count, and summary sections are present.
- **Validation tests:** time ranges (`end > start`), future dates, negative counts, duplicate sessions.
- Manual pilot checklist is in [MVP.md](./MVP.md).

## 8. Definition of done

A task is done when:

- [ ] It works on a 360px-wide screen (for CR features) and desktop (for teacher/admin).
- [ ] Inputs are validated on the server.
- [ ] RLS covers it and a test proves it.
- [ ] The action is audited if it is in the audit list (rule 5).
- [ ] Types, lint, and tests pass.
- [ ] PROGRESS.md and any affected docs are updated.

## 9. Do not

- Do not build features outside the MVP without owner approval.
- Do not store student personal data beyond what is needed (CRs are users; other students are only counted, not stored).
- Do not disable RLS "temporarily".
- Do not hard-code IIHM template text in multiple places; keep it in `lib/reports/`.
- Do not invent syllabus content. Syllabus topics come from the institute's actual syllabus, entered by admin/teacher.
- Do not generate DOCX on the client.

## 10. Starter prompts

**Foundation:**
> Read INSTRUCTION.md, ARCHITECTURE.md, DATABASE.md, PROGRESS.md. Scaffold Phase 1: Next.js + TypeScript + Tailwind, Supabase client helpers, the migration from DATABASE.md, and role-aware middleware. Do not build feature screens yet.

**CR logging:**
> Implement Phase 2 from PROGRESS.md: the CR "Log a class" form (mobile first), server action with Zod validation, edit window, and RLS tests. Follow SECURITY.md for the permission rules.

**Weekly report:**
> Implement Phase 4: generate the Weekly Teaching Log and Summary DOCX per REPORTS.md. Add a fixture-based test that unzips the output and checks header fields and rows.
