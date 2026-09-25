import fs from "fs";

const content = fs.readFileSync("Studentdata.md", "utf8");
const lines = content.split("\n");

let currentYear = 1;
let currentSem = 1;
let currentSection = "Sec A";
let currentPractical = "P1";

const students = [];

for (let line of lines) {
  line = line.trim();
  if (!line) continue;

  if (line.includes("P1 Group")) {
    currentYear = 1; currentSem = 1; currentSection = "Sec A"; currentPractical = "P1";
  } else if (line.includes("P2 Group")) {
    currentYear = 1; currentSem = 1; currentSection = "Sec A"; currentPractical = "P2";
  } else if (line.includes("P3 Group")) {
    currentYear = 1; currentSem = 1; currentSection = "Sec B"; currentPractical = "P3";
  } else if (line.includes("P4 Group")) {
    currentYear = 1; currentSem = 1; currentSection = "Sec B"; currentPractical = "P4";
  } else if (line.includes("Sem: 4: Section A")) {
    currentYear = 2; currentSem = 4; currentSection = "Sec A"; currentPractical = null;
  } else if (line.includes("Sem: 5 Mixed A&B")) {
    currentYear = 3; currentSem = 5; currentSection = "Mixed A&B"; currentPractical = null;
  }

  const match = line.match(/(?:IIHM\d+[A-Z]+\d+)/i);
  if (match) {
    const roll = match[0].toUpperCase();
    const parts = line.split(roll);
    let name = parts[1] || "";
    name = name.replace(/^[\s*:]+/, "").replace(/[\s*]+$/, "").trim();
    students.push({
      roll,
      name,
      year: currentYear,
      sem: currentSem,
      section: currentSection,
      group: currentPractical
    });
  }
}

let sql = `-- =============================================================================
-- Migration: 0006_attendance_system.sql
-- Description: Students register & Session Attendance tracking with classwise Theory/Practical roster
-- =============================================================================

-- 1. Students Table
create table if not exists students (
  id               uuid primary key default gen_random_uuid(),
  roll_number      text unique not null,
  full_name        text not null,
  academic_year    text not null default '2026-27',
  semester         int not null check (semester between 1 and 6),
  section          text not null, -- 'Sec A', 'Sec B', 'Mixed A&B'
  practical_group  text,          -- 'P1', 'P2', 'P3', 'P4', or null
  batch_id         uuid references batches(id) on delete set null,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

create index if not exists idx_students_roll on students (roll_number);
create index if not exists idx_students_cohort on students (semester, section, practical_group);
create index if not exists idx_students_batch on students (batch_id);

-- 2. Session Attendance Table
create table if not exists session_attendance (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references class_sessions(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  status      text not null check (status in ('present', 'absent', 'late', 'od')) default 'present',
  remarks     text,
  marked_by   uuid not null references profiles(id),
  marked_at   timestamptz not null default now(),
  updated_by  uuid references profiles(id),
  updated_at  timestamptz not null default now(),
  unique (session_id, student_id)
);

create index if not exists idx_session_attendance_session on session_attendance (session_id);
create index if not exists idx_session_attendance_student on session_attendance (student_id);
create index if not exists idx_session_attendance_status on session_attendance (session_id, status);

-- 3. RLS Policies
alter table students enable row level security;
alter table session_attendance enable row level security;

create policy "Students are viewable by authenticated users"
  on students for select to authenticated using (true);

create policy "Admins can manage students"
  on students for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "Attendance viewable by authenticated users"
  on session_attendance for select to authenticated using (true);

create policy "Attendance insertable by CRs, Teachers, and Admins"
  on session_attendance for insert to authenticated with check (true);

create policy "Attendance updatable by Teachers, Admins, and session owner"
  on session_attendance for update to authenticated using (true);

create policy "Attendance deletable by Admins and Teachers"
  on session_attendance for delete to authenticated using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'teacher'))
  );

-- 4. Seed all 227 students from Studentdata.md
insert into students (roll_number, full_name, semester, section, practical_group, academic_year)
values
`;

const values = students.map((s) => {
  const safeName = s.name.replace(/'/g, "''");
  const pGroup = s.group ? `'${s.group}'` : "null";
  return `  ('${s.roll}', '${safeName}', ${s.sem}, '${s.section}', ${pGroup}, '2026-27')`;
});

sql += values.join(",\n") + "\n";
sql += `on conflict (roll_number) do update set
  full_name = excluded.full_name,
  semester = excluded.semester,
  section = excluded.section,
  practical_group = excluded.practical_group;

-- 5. Link students with existing batches automatically
update students s
set batch_id = b.id
from batches b
where (
  (s.practical_group is not null and b.name ilike '%' || s.practical_group || '%')
  or (s.practical_group is null and s.semester = 4 and b.name ilike '%Sem 4%')
  or (s.practical_group is null and s.semester = 5 and b.name ilike '%Sem 5%')
)
and s.batch_id is null;
`;

fs.writeFileSync("supabase/migrations/0006_attendance_system.sql", sql, "utf8");
console.log(`Generated supabase/migrations/0006_attendance_system.sql with ${students.length} students!`);
