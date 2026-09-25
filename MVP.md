# MVP.md

## 1. MVP goal

> A CR logs a class in under a minute, the teacher verifies it, and at the end of the week the teacher downloads a correct **Weekly Teaching Log and Summary** .docx, all with a trustworthy record of who was authorised and who changed what.

If this loop works reliably for one batch over one real week, the MVP is successful.

## 2. Scope (MoSCoW)

### Must have

| # | Feature |
| --- | --- |
| M1 | Login with roles (CR, teacher, admin); no public sign-up |
| M2 | Admin master data: programme, batches, subjects, teaching assignments (simple forms or seed script) |
| M3 | CR "Log a class" form: subject, topic, date, start/end time, students present |
| M4 | CR history for the last few days with edit inside the edit window |
| M5 | Teacher dashboard: sessions by week, batch, subject, status |
| M6 | Teacher edits planned topic, teaching method, assignment; verifies sessions |
| M7 | Weekly summary form (7 sections) |
| M8 | **R1: Weekly Teaching Log and Summary .docx** matching the template |
| M9 | CR authorisation register (grant, revoke, history) |
| M10 | Access log and audit log (admin view) |
| M11 | RLS on all tables with automated tests |

### Should have

| # | Feature |
| --- | --- |
| S1 | Syllabus topics per subject, with a picker on the teacher side |
| S2 | Session history export (R2) as DOCX or CSV |
| S3 | Duplicate-entry warnings ("this class is already logged") |
| S4 | Dashboard counters: unverified sessions, missing weekly summaries |

### Could have (post-MVP)

Report builder (R7), coverage dashboard (R3), repeat-teaching matrix (R4), workload report (R5), PDF export, notifications, PWA/offline entry, AI-drafted summary, Program Leader / Director verification in-app, timetable and missing-entry detection (R8).

### Won't have (for now)

Per-student attendance, student-facing views, marks/grades, parent access, integration with any existing ERP/LMS, multi-campus support.

## 3. User stories and acceptance criteria

### US-1: CR logs a class

*As a CR, I want to log a class quickly after it ends so the record is accurate.*

- I only see my batch and only the subjects assigned to it.
- Required: subject, topic, date, start time, end time, students present.
- Date defaults to today; I can go back at most 2 days.
- End must be after start. Students present cannot exceed class strength.
- If the same class (batch, subject, date, start time) exists, I get a clear "already logged" message.
- On a 360px phone screen the form fits without horizontal scrolling.
- Success shows a confirmation and the entry appears in my history.

### US-2: CR corrects an entry

- I can edit my own entry within 24 hours if the teacher has not verified it.
- After that, or after verification, the entry is read-only and I see why.

### US-3: Teacher reviews the week

- I see sessions for my subjects, grouped by day, with batch and status.
- I can fill planned topic, teaching method, assignment for each session.
- I can mark sessions verified, individually or "verify all in this week".
- Verified sessions cannot be changed by CRs.

### US-4: Teacher writes the weekly summary

- One form per subject + batch + week with the 7 template sections.
- "Syllabus Coverage" is prefilled with the week's topics; my saved text overrides it.
- I can save a draft and submit later.

### US-5: Teacher generates the weekly DOCX

- I pick subject, batch, and week, then download the file.
- The file has the same header fields, 7 log columns, 7 summary sections, and signature lines as the IIHM template.
- Sessions appear on the correct weekday, with the right times and topics.
- Generation takes under 10 seconds.
- Opening in Microsoft Word and LibreOffice shows no broken layout.

### US-6: Admin manages CR access

- I can invite a student as CR for a batch and academic year.
- I can revoke access; the CR is blocked immediately.
- The register shows who granted or revoked, when, and why.

### US-7: Admin reviews logs

- I can list logins (success and failure) and data changes, filtered by user and date.
- Log entries cannot be edited or deleted from the app.

## 4. Data needed at launch

Before the pilot, someone must enter:

- 1 programme, its batches (with class strength and semester start date)
- The subjects for the pilot semester(s)
- Teaching assignments (teacher, subject, batch)
- Teacher accounts and one CR account per pilot batch
- Syllabus topics for pilot subjects (only if S1 is included)

## 5. Milestones

Estimates assume part-time work by one person alongside teaching duties. Treat them as rough.

| Milestone | Contents | Rough effort |
| --- | --- | --- |
| **M0: Planning** | Docs, decisions on open questions | Done / in progress |
| **M1: Foundation** | Repo, Supabase, migrations, seed, auth, role middleware, RLS tests | 1 - 2 weeks |
| **M2: CR logging** | US-1, US-2 | 1 week |
| **M3: Teacher side** | US-3, US-4 | 1 - 2 weeks |
| **M4: Weekly report** | US-5 with tests | 1 week |
| **M5: Admin + logs** | US-6, US-7, master-data screens | 1 week |
| **M6: Pilot** | One batch, 2-3 teachers, 2 real weeks | 2 weeks |

## 6. Pilot plan

- **Who:** one batch, one CR (plus optionally a vice-CR), 2-3 willing teachers.
- **How long:** two consecutive teaching weeks.
- **Compare:** the generated weekly DOCX against the teacher's paper sheet for the same week.
- **Collect:** time taken per entry, number of corrections, missed entries, teacher feedback on the DOCX layout.

## 7. Success measures

| Measure | Target |
| --- | --- |
| Sessions logged within 24 h of class | 90% or more |
| CR time to log one class | Under 60 seconds |
| Teachers who generate the weekly DOCX without manual layout fixes | All pilot teachers |
| RLS tests | 100% pass; zero cross-batch leaks |
| Report generation time | Under 10 seconds |
| Teacher verdict after pilot | "I would use this instead of the paper sheet" |

## 8. MVP cut lines

If time is short, cut in this order (last item first):

1. Should-have items S1-S4
2. Admin UI for master data (keep seed script / Supabase dashboard entry)
3. Weekly-summary prefill

Do **not** cut: RLS tests, audit/access logs, the verification step, or the DOCX fidelity check. Those are what make the data trustworthy.
