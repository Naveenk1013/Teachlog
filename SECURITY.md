# SECURITY.md

Roles, permissions, authorisation logging, and data protection for the system. The database enforces these rules through RLS ([DATABASE.md](./DATABASE.md)); the UI only mirrors them.

## 1. Roles

| Role | Who | Created by |
| --- | --- | --- |
| `admin` | Project owner, and any institute administrator named later (D-11) | Manually in Supabase / seed |
| `teacher` | IIHM faculty | Admin invites |
| `cr` | Class Representative, one student per batch (up to two if a vice-CR is allowed, D-13) | Admin, or a teacher of that batch (D-08) |

There is **no public sign-up**. An account exists only if someone with authority invited it.

## 2. Permission matrix

| Action | CR | Teacher | Admin |
| --- | --- | --- | --- |
| Log a session | Own authorised batch, date within the last 2 days | Own subjects | All |
| Edit a session | Own entries, within 24 h, not verified | Own sessions, any time | All |
| Delete a session | No | No (soft-delete later) | Soft-delete only |
| View sessions | Own batch | Own subjects and batches | All |
| Edit teacher fields (planned topic, method, assignment) | No | Yes | Yes |
| Verify a session | No | Yes (own) | Yes |
| Write weekly summary | No | Own | Yes |
| Generate reports | No | Within own scope | All |
| Grant / revoke CR access | No | For batches they teach (D-08) | All |
| Manage users, batches, subjects, syllabus | No | No | Yes |
| View audit and access logs | No | CR-related entries for own batches (post-MVP) | All |

Numbers such as "2 days" and "24 h" are defaults. They are constants in one place so the owner can change them.

## 3. CR provisioning and revocation

**Grant**

1. Admin/teacher enters the student's name, email, batch, and academic year.
2. Server (service role) sends an invite and creates `profiles` (`role = cr`) and `cr_authorisations`.
3. `granted_by` and `granted_at` are recorded automatically; the change is audited.

**Revoke**

1. Set `revoked_at`, `revoked_by`, `revoke_reason`. No row is deleted.
2. Access stops immediately because RLS checks `revoked_at is null`.
3. If the person is leaving the CR role entirely, also set `profiles.is_active = false`.

**Semester / year change**

- When a batch is promoted (new `current_semester`, new `academic_year`), CR authorisations are **reviewed**, not silently carried over. Provide an admin screen listing active CRs per batch with one-click renew or revoke.
- Authorisations are scoped by `academic_year`, so an old one does not authorise the new year automatically.

## 4. Logging

### 4.1 Authorisation register (`cr_authorisations`)

The answer to "which students are authorised to use the interface, who authorised them, and when". History is kept forever; entries are never overwritten.

### 4.2 Access log (`access_logs`)

Recorded by the server for: `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `ACCESS_DENIED`. Fields: user (when known), email attempted, IP, user agent, timestamp.

Login events can be captured in the app's login handler and auth callback. Supabase Auth also keeps its own auth logs; verify what your plan retains before relying on them.

### 4.3 Audit log (`audit_logs`)

Written by database triggers and the server for: session create/update/delete, verification, weekly summary changes, CR grant/revoke, report generation. Old and new values are stored as JSON.

### 4.4 Protection of the logs

- No client can insert, update, or delete log rows; revoke those privileges from API roles.
- Only admins read them in the MVP.
- Retention: decide with the institute (suggestion: keep the full academic-year history plus one year).

## 5. Authentication settings

- Password minimum length 10, or use magic link/OTP only.
- Email confirmation on.
- Rate-limit login attempts (Supabase Auth limits plus an app-level counter on `access_logs`).
- Session lifetime: reasonable for a phone (for example 7 days), shorter for admin if practical.
- Optional later: MFA for admin and teachers.

## 6. Data protection

Personal data in this system is limited to **staff and CR accounts** (name, email, role) and the **aggregate** number of students present. Individual student attendance is not stored, and the weekly summary field "Slow Learners Identified" is free text that teachers may fill with names.

Guidance:

- Tell teachers to record **initials or roll numbers, not full names**, in the "Slow Learners Identified" field, and to keep detail minimal. Show a hint on the form.
- Only teachers and admins can read weekly summaries; CRs cannot.
- Store the minimum. Do not add student phone numbers, addresses, or photos.
- India's Digital Personal Data Protection Act, 2023 may apply to this data. This document is not legal advice; confirm obligations (consent notice, retention, breach handling) with IIHM's administration or counsel before going live.
- Provide a way to correct or remove a person's account data on request (deactivate profile, anonymise name in logs if required).

## 7. Threats and mitigations

| Threat | Mitigation |
| --- | --- |
| CR reads another batch's data | RLS via `cr_has_batch()`; RLS test per table |
| CR edits teacher-owned fields or verified rows | Column-guard trigger; policy on `status`; tests |
| Shared or leaked CR password | Per-user accounts, magic link/OTP, access log, instant revoke |
| Service-role key exposed | Server-only module, no `NEXT_PUBLIC_`, secret scanning in CI |
| Tampered audit trail | Append-only privileges; only triggers/server write |
| Fake or back-dated entries | Date window for CRs, teacher verification, audit trail |
| Ex-student keeps access | Yearly authorisation review; `is_active` flag |
| Report leaks other teachers' data | Reports run under the caller's JWT, so RLS applies |
| Injection / bad input | Zod validation, parameterised queries via Supabase client |

## 8. Pre-launch checklist

- [ ] RLS enabled on every table and tested
- [ ] Service-role key only in server environment variables
- [ ] Public sign-up disabled in Supabase Auth settings
- [ ] Email templates and redirect URLs set for production domain only
- [ ] Audit and access logs verified append-only
- [ ] Backups confirmed and a restore tried once
- [ ] Data-protection notice agreed with IIHM
- [ ] Admin account uses a strong password (and MFA if enabled)
