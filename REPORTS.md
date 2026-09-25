# REPORTS.md

## 1. Report catalogue

| # | Report | Audience | Phase |
| --- | --- | --- | --- |
| R1 | **Weekly Teaching Log and Summary** (IIHM template) | Teacher, Program Leader, Director | **MVP** |
| R2 | Session history (filtered list) | Teacher, Admin | MVP (simple export) |
| R3 | Syllabus coverage per subject and batch | Teacher, Admin | Post-MVP |
| R4 | Subject-wise topic history across batches (repeat teaching) | Teacher | Post-MVP |
| R5 | Faculty workload (sessions and hours per period) | Admin | Post-MVP |
| R6 | CR authorisation and access log | Admin | MVP (basic), richer later |
| R7 | Custom report builder | Teacher, Admin | Post-MVP |
| R8 | Missing-entry report (expected vs logged) | Teacher, Admin | Post-MVP, needs timetable |

## 2. R1: Weekly Teaching Log and Summary

### 2.1 What the current template contains

Taken from `templates/IIHM_Weekly_Teaching_Log_and_Summary_TEMPLATE.docx`.

**Title block:** `IIHM HYDERABAD` / `WEEKLY TEACHING LOG SHEET`

**Header fields:**

| Template field | Source |
| --- | --- |
| Faculty Name | `profiles.full_name` of the teacher |
| Department | `profiles.department` |
| Subject | `subjects.name` (+ code if present) |
| Programme | `programmes.name` |
| Batch / Semester | `batches.name` + `class_sessions.semester` |
| Week No. | Week of the respective month (e.g. Week 1 to 5) |
| Academic Year | `class_sessions.academic_year` |

**Log table** (7 columns, rows for Monday to Saturday):

| Template column | Source |
| --- | --- |
| Day & Date | Weekday name + `session_date` |
| Time | `start_time` - `end_time` |
| Topic Planned | `topic_planned` (teacher) |
| Topic Completed | `topic_covered` (CR), or teacher-edited text |
| Teaching Method | `teaching_method` (teacher) |
| Assignment/Activity | `assignment_activity` (teacher) |
| Faculty Signature | **Left blank** for a wet signature |

**Weekly Summary** (7 sections, free text, from `weekly_summaries`):

1. Syllabus Coverage This Week
2. Practical / Demonstration Conducted
3. Assessment Conducted
4. Slow Learners Identified
5. Remedial Action Planned
6. AI / Digital Tools Used
7. Industry Examples / Case Studies Discussed

**Footer lines:** Date of Submission, Faculty Signature, Verified by Program Leader, Director Signature. All printed as blank signature lines, except Date of Submission, which may be prefilled from `weekly_summaries.submitted_on`.

### 2.2 Layout facts read from the template file

Use these as the starting point for `lib/reports/styles.ts`, then compare a rendered output against the original side by side.

| Property | Value found |
| --- | --- |
| Page | US Letter portrait (12240 x 15840 twips) |
| Margins | 0.75 inch on all sides (1080 twips) |
| Font | Times New Roman |
| Text sizes | Body about 11 pt; log table about 9 pt; headings about 13-14 pt |
| Log table column widths (twips) | 1200, 900, 1439, 1561, 1500, 1900, 1701 |
| Header | Page header exists but is empty |

The template contains one drawing/shape element and no embedded images. Inspect it when building (open the file in Word, or unzip and read `word/document.xml`). Alignment, borders, and any shading were not captured here, so match them by eye. If IIHM would rather use A4 for print, that is a one-line change; confirm with the institute.

### 2.3 Rendering rules

- **One row per session.** If a day has two sessions for the same subject, output two rows. Repeat the day label, or merge cells if it renders cleanly.
- **Days with no session** still appear (Monday to Saturday) with empty cells, matching the paper sheet.
- **Long text** wraps within cells; do not shrink below the template's table font size. If a row gets too tall, let it break across pages with the header row repeating.
- **Empty summary sections** print the heading and blank lines, so the teacher can handwrite.
- **Prefill suggestion for "Syllabus Coverage This Week":** join the topics from that week's sessions into a draft the teacher can edit. Saved text always wins over the draft.
- **Status marker:** if any session in the week is not `verified`, show a small "Draft: contains unverified entries" line in the footer area (configurable, off for the final print).
- **File name:** `WeeklyLog_<SubjectCode-or-Name>_<Batch>_W<weekNo>_<YYYY-MM-DD>.docx`, sanitised for filesystems.

### 2.4 Generation flow

1. `GET /api/reports/weekly-log?subjectId=&batchId=&weekStart=`
2. Server authenticates, loads header data, sessions for Monday to Saturday, and the weekly summary, all under the user's RLS.
3. `buildWeeklyLog(data): Promise<Buffer>` in `lib/reports/weekly-log.ts` creates the document with the `docx` library.
4. Response returns the file as a download, with `Content-Disposition: attachment`.
5. A `report_exports` row and an audit entry are written. Optionally the file is saved in a private Storage bucket.

### 2.5 Library choice

Primary: **`docx`** (npm). It builds the file in code, runs in Node, and gives full control over table widths and fonts.

Alternative: **`docxtemplater`** filling the institute's own .docx with placeholders. This keeps the exact original look with less code. The catch is that a variable number of session rows per day needs loop tags in the template, and any template edit means editing placeholders. See D-10 for the decision.

### 2.5.1 Test

Generate from a fixture, unzip the result, and assert: header values present, 6 weekdays present, row count equals sessions plus empty days, all 7 summary headings present.

## 3. Other reports (post-MVP outlines)

### R3: Syllabus coverage

Per `(batch, subject)`: list of syllabus topics with covered/not covered, date covered, teacher. Summary line: `covered / total (%)`. Source: `v_syllabus_coverage` and `session_syllabus_topics`.

### R4: Repeat-teaching view

For a subject taught to multiple batches or several times: a matrix of topics by batch showing which sessions covered them. Helps a teacher see that Batch A is ahead of Batch B.

### R5: Faculty workload

Sessions and total hours per teacher for a date range, grouped by subject and batch.

### R6: CR authorisation and access log

Table of authorisations (who, batch, granted by, granted at, revoked at, reason) and access events (login success/failure, time, IP). Filter by batch and date range.

### R7: Report builder

A form where a teacher chooses:

- **Scope:** teacher (self/all for admin), subject(s), batch(es), semester, academic year
- **Date range:** week, month, custom
- **Status:** submitted, verified, both
- **Columns:** pick from date, time, subject, batch, topic covered, topic planned, method, assignment, present, teacher, verified by
- **Group by:** none, date, subject, batch
- **Output:** DOCX first; CSV and XLSX next; PDF later

Implementation idea: a declarative report config (`{ scope, range, columns, groupBy }`) validated with Zod and executed by one generic query + one generic DOCX table renderer. Save configs as "saved reports" in a later iteration.

### R8: Missing entries

Needs a weekly timetable table (batch, subject, weekday, slot). Compare expected sessions to logged ones and list gaps. Not in the MVP data model.

## 4. AI-assisted summary (optional, later)

An opt-in "Draft summary" button could take the week's logged topics and produce a first draft of the seven summary sections for the teacher to edit. The teacher must review before submission. Keep it clearly labelled as a draft, send only the topic text (no student data), and store the teacher's final text, not the raw AI output.
