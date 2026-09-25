# DECISIONS.md

Two lists: **open questions with the assumption I made** (D-xx), and **decisions already taken** (ADR-xx). Change any assumption by editing its row and updating the affected docs.

---

## A. Open questions and current assumptions

| ID | Question | Current assumption | Status |
| --- | --- | --- | --- |
| D-01 | What does "total students" mean: number present, or class strength? | Store **students present** per session, and **class strength** on the batch. Reports can show both. | Assumed |
| D-02 | One programme or several on day one? | Schema supports many; the pilot uses one. | Assumed |
| D-03 | How do CRs log in? Do they have email addresses? | Email + password (invite-only, accounts created by admin/teacher). | **Decided** |
| D-04 | "Teach 2-3 times": same subject to several batches, several sessions a week to one batch, or both? | Both. Coverage is tracked per (batch, subject); a cross-batch view comes post-MVP. | Assumed |
| D-05 | Does "Week No." on the sheet mean teaching week of the semester or ISO calendar week? | Current number of week of the respective month (e.g., Week 1 to Week 5). | **Decided** |
| D-06 | Who verifies in the system? The sheet has Program Leader and Director signatures. | MVP: teacher verifies sessions. Program Leader and Director stay as paper signature lines. In-app verification later. | Assumed |
| D-07 | Is there a fixed timetable to preload? | Not in MVP. Enables missing-entry alerts later. | Assumed |
| D-08 | Who may grant or revoke CR access? | Both Admin and Teachers (for batches they teach). All actions logged. | **Decided** |
| D-09 | Hosting and frontend preference? | Next.js deployed on Netlify. | **Decided** |
| D-10 | DOCX approach and paper size: build in code (`docx`) or fill the institute's template (`docxtemplater`)? A4 or Letter? Output formats beyond DOCX? | `docx` library, layout copied from template (Letter as in the file, A4 switchable). DOCX only in MVP. | Assumed |
| D-11 | Who is admin? | The project owner first; an institute administrator can be added. | Assumed |
| D-12 | Can a CR edit after the teacher verifies? Edit window? | No after verification. CR edit window 24 h; back-dating limit 2 days. | Assumed |
| D-13 | How many CRs per batch? | Up to two (CR and vice-CR), each with their own account. | Assumed |

---

## B. Decisions taken

### ADR-01: Supabase for database, auth, and storage
**Why:** The owner chose it. Postgres gives real constraints and Row Level Security, which suits a multi-role app with per-batch isolation.
**Consequence:** Security rules are written as SQL policies and must be tested.

### ADR-02: Next.js (App Router) + TypeScript
**Why:** One codebase for UI, server actions, and report generation; strong Supabase SSR support; works on Vercel or Netlify.
**Alternatives considered:** Plain React + Supabase Edge Functions (more moving parts for DOCX generation); SvelteKit or Nuxt (fine, but less familiar tooling for AI assistants and most tutorials).

### ADR-03: DOCX generated server-side with the `docx` library
**Why:** Full control over table widths, fonts, and repeated rows; runs in Node; testable as a pure function.
**Alternative:** `docxtemplater` with the institute's own file. Simpler to match the look, harder for variable row counts. Revisit under D-10.

### ADR-04: Three roles: admin, teacher, cr
**Why:** Matches the requirement (CR updates class details, teachers manage and report). A Program Leader role can be added later without redesign.

### ADR-05: RLS is the enforcement layer
**Why:** Prevents a UI bug from exposing another batch's data. Every table has policies and tests.

### ADR-06: No hard deletes for core records; append-only logs
**Why:** Academic records need traceability. Deletions are done by status or `revoked_at`, and audit tables cannot be altered from the app.

### ADR-07: Sessions store a snapshot of semester and academic year
**Why:** Batches move from semester to semester. Old sessions must still report under the semester in which they happened.

### ADR-08: Week is Monday to Saturday, in IST
**Why:** Matches the paper template (six day rows) and the institute's location.

### ADR-09: Teacher-owned fields live on `class_sessions`
**Why:** Keeps one row per class and makes the weekly report a simple query. A column-guard trigger stops CRs editing those fields.

### ADR-10: Students other than CRs are counted, not stored
**Why:** Reduces personal data and compliance burden. The CR enters "students present" as a number.

---

## C. How to change a decision

1. Edit the row or ADR here.
2. Update every doc that mentions its ID (search for `D-xx`).
3. Add a line to the changelog in [PROGRESS.md](./PROGRESS.md).
