# PROGRESS.md

Live tracker. Update it at the end of every work session.

**Legend:** `[x]` done · `[~]` in progress · `[ ]` not started · `[!]` blocked

**Current phase:** Phase 5: Admin Controls & Pre-Pilot Security Hardening
**Last updated:** 2026-09-24

---

## Current focus

1. Address security audit findings (Dev auth cookie production guard, CR batch authorization check in server action, weekly summary faculty ownership check).
2. Prepare pilot rollout and testing with live batch & faculty accounts.

## Blockers

None.

---

## Phase 0: Planning

- [x] Analyse the existing weekly log template (fields, columns, layout facts)
- [x] Write README, INSTRUCTION, ARCHITECTURE, DATABASE, SECURITY, REPORTS, MVP, PROGRESS, DECISIONS
- [x] Owner reviews docs and answers open questions (D-03, D-05, D-08, D-09 decided)
- [x] Confirm with IIHM: template provided (IIHM_Hyderabad_Weekly_Teaching_Log_Sheet.docx) and placed in templates/
- [x] Create Supabase projects (connected to live cloud project xvgwnibqawgrsdsuvzpm)

## Phase 1: Foundation (M1)

- [x] Scaffold Next.js + TypeScript + Tailwind + shadcn/ui
- [x] Supabase client helpers (browser, server, middleware, admin)
- [x] Migrations `0001`-`0005` applied to live cloud database
- [x] Generate and commit DB types (`lib/types/database.ts`)
- [x] Seed script with curriculum and institute data applied in live database
- [x] Login page, session handling, role-based redirect middleware (`/login`, `middleware.ts`)
- [x] Disable public sign-up; invite-only flow
- [x] Access-log writes on login success/failure/logout
- [x] Supabase cloud instance link & live authentication verified
- [x] Added root `.gitignore` to prevent credential/artifact leaks

## Phase 2: CR Logging & Multi-Subject Workflow (M2)

- [x] CR "Log a class" form (mobile first) with Zod validation
- [x] Dynamic multi-subject dropdown (all 6+ semester core subjects per batch)
- [x] Dynamic faculty dropdown with lead teacher auto-selection & substitute teacher override
- [x] Server action + friendly error mapping (duplicate, window, unauthorised)
- [x] Topic Planned & Topic Covered automatic synchronization
- [x] CR history page with 24h edit window lock
- [x] Column-guard trigger (CR cannot touch teacher fields) tested and verified
- [x] Interactive Student Academic Calendar view (`/cr/calendar`)

## Phase 3: Teacher Side & Academic Calendar (M3)

- [x] Teacher dashboard (week picker, subject filters, verification badges, status counts)
- [x] Session detail/enrich: planned topic, method, assignment, syllabus topic link
- [x] Single session verification & batch 1-click week verification (`verifyAllWeekSessionsAction`)
- [x] Weekly summary form (7 standard sections: Syllabus Coverage, Practicals, Assessments, Slow Learners, Remedial, AI/Digital Tools, Industry Examples)
- [x] Prefill "Syllabus Coverage" and auto-sync
- [x] Interactive Academic Calendar (`/calendar`): custom holidays, institute events, state festivals, semester exams, and teaching schedules with multi-view filters

## Phase 4: Weekly Report Generation (.docx) (M4)

- [x] Official IIHM Logo integration in header block (Navy Blue `#1B365D`, Gold `#D4AF37`)
- [x] High-fidelity DOCX generation matching physical template layout (`lib/reports/weekly-log.ts`)
- [x] Complete metadata grid (Faculty, Department, Subject, Code, Programme, Batch, Semester, Week No/Month, Academic Year, Duration)
- [x] Monday–Saturday 7-column class log table with automatic empty day placeholders
- [x] Full 7-section Weekly Teaching Summary block in Word export
- [x] Dual-column physical signature block (Faculty Signature & Program Leader Signature)
- [x] Download endpoint (`/api/reports/weekly-log`) with filename sanitization and audit logging
- [x] Direct export integration in Teacher Dashboard and Admin Reports

## Phase 5: Admin Controls & Batch Management (M5)

- [x] Admin Batches & Cohorts Management (`/admin/batches`)
- [x] **Section & Practical Group Architecture**:
  - Theory Sections (`Sec A`, `Sec B`, `Sec C`, `Custom`)
  - Practical Lab Groups (`P1`, `P2` for Sec A; `P3`, `P4` for Sec B; `P5`, `P6` for Sec C)
  - Smart default class strengths (60 for whole section, 30 for lab groups)
  - Standardized auto-generated naming (`Intake 2026-29 (Sem 1) - Sec A [P1]`)
  - **⚡ Quick Semester Setup (Batch Multi-Generator)**: 1-click generation of all 6 cohorts/groups per semester
- [x] Student CR Management & Registration (`/admin/crs`):
  - Direct account registration with custom passwords
  - Assign existing students to CR role
  - Co-CR support (multiple CRs per batch without overwriting)
  - View real student emails, active statuses, and grant dates
- [x] Teaching Assignments, Faculty Management, and Subject Master Data
- [x] Cross-Role Weekly Teaching Logs & Quick Editor (`/admin/logs`, `/weekly-logs`, `/cr/logs`):
  - Inline editing of sessions for admins, teachers, and student CRs with role-scoped permissions
  - Instant status toggle (submitted / verified)
  - Synced Planned & Covered topics

## Phase 6: Pilot & Security Audit (M6)

- [x] Conducted comprehensive security audit:
  - Verified SQL injection safety (parameterized queries)
  - Verified XSS safety (React DOM auto-escaping, zero dangerous HTML)
  - Added `.gitignore` to prevent credential exposure
  - Identified IDOR & dev-session cookie areas for pre-pilot hardening
- [x] Pre-launch IDOR & cookie hardening patches (dev cookie production guard, CR batch auth, session ownership, faculty ownership)
- [ ] Onboard pilot faculty and student CRs
- [ ] Pilot trial run and feedback collection

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-09-21 | Planning docs created from the IIHM weekly log template and project brief. |
| 2026-09-21 | Confirmed D-03, D-05, D-08, D-09; added institutional docx template to templates/. |
| 2026-09-22 | Phase 1 Foundation built: Next.js 15, Tailwind, Supabase helpers, migrations 0001-0004, seed data. |
| 2026-09-22 | Phase 2 CR Logging (M2) completed: mobile log form, duplicate protection, 24h edit window. |
| 2026-09-22 | Phase 3 Teacher Side (M3) completed: dashboard, verification actions, 7-section summary form. |
| 2026-09-23 | Built Academic Calendar with holiday/event customization and migration 0005. |
| 2026-09-23 | Phase 4 DOCX generator completed with official IIHM logo, exact typography, and signature blocks. |
| 2026-09-23 | Implemented Universal Weekly Teaching Logs & Quick Editor across all roles. |
| 2026-09-23 | Multi-Subject & Faculty selector implemented for student class logging (`/cr/log`). |
| 2026-09-23 | Student CR registration modal added in Admin Portal (`createStudentAndGrantCRAction`). |
| 2026-09-23 | Modified Batch Registration with Section (Sec A, Sec B) and Practical Group (P1-P4) support + Quick Semester Generator. |
| 2026-09-24 | Conducted security audit across authentication, authorization, and database layer; added root `.gitignore`. |
| 2026-09-25 | Applied pre-pilot security hardening: dev cookie production guard (middleware, cr.ts, teacher.ts), CR batch authorization in createClassSessionAction, session ownership in updateClassSessionAction, faculty ownership in saveWeeklySummaryAction. |

## Notes for next session

- Security hardening complete. Remaining pre-pilot tasks:
  1. Onboard pilot faculty and student CRs.
  2. Pilot trial run and feedback collection.
  3. Student data file added (`Studentdata.md`) for future attendance tracking feature.
