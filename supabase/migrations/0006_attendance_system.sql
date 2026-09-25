-- =============================================================================
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
  ('IIHM26HYD001', 'Komara Jai Kishen Rao', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD002', 'Jalli Abhi', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD003', 'Vasanth Vankudoth', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD004', 'DITTAKAVI GEETHA SAI KIRAN', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD005', 'Bharatham Sathwik', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD006', 'Konda Sathwik', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD007', 'Benjarapu Bhavya Goud', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD008', 'YALLA VIDYA CHARAN', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD009', 'Velpula Sagar', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD010', 'KARNATI SAI SARAN GOUD', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD011', 'BADA Nikith Babu', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD012', 'Vani', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD013', 'Metre Arvind', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD014', 'BOJJOLU VENKATARAMANA', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD015', 'NASKANTI Vignesh', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD016', 'ANISETTY SAJITH', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD017', 'Shaik Mastan', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD018', 'Rathod Sarkar Venkatesh', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD019', 'Aayush Tolani', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD020', 'Srujan Reddy', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD021', 'Srishti Ekka', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD022', 'Chinthala Manish Kumar', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD023', 'Suri Venkata Naga Sampreeti', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD024', 'Gujjula Chandukar Reddy', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD025', 'Gulam Hamzakhan', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD026', 'Erekar Sai Teja', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD027', 'Ramana Sidharth reddy', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD028', 'Shresta Ghantoji', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD029', 'Baswaraj Sai Teja Yadav', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD030', 'Gunturu Naga Sai Manikanta', 1, 'Sec A', 'P1', '2026-27'),
  ('IIHM26HYD031', 'Dittakavi Mohan Sai Charan', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD032', 'Mavin Yuvraj', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD033', 'AMBATI VISHNUVARDHAN REDDY', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD034', 'Akanksha Kerketta', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD035', 'Gangavarapu Sri Harsha', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD036', 'Indhuvadhani Ramachandran', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD037', 'Boppu Harshith Varma', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD038', 'ANUGU GURUNATH REDDY', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD039', 'Chanda Revanth', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD040', 'Siripuram Mani Charan', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD041', 'Abdul Huzaifa', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD042', 'Vemula Thrivikram', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD043', 'Kapuganti Venkata Surya Narayana', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD044', 'PINNIKA RAMANJI', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD045', 'Pomar Gagandeep', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD046', 'Aliza Pirani', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD047', 'Gundu Rishi', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD048', 'Thota Karuna Sri', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD049', 'ALLADA DIPANWITA', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD050', 'Jayamangala Jyothi Durga', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD051', 'N Samiksha Rao', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD052', 'Chintala Gowtham', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD053', 'Kanneboina Prasad', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD054', 'Stallone Allen Walker', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD055', 'Arjampudi Narayan Sai Ram', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD056', 'Ugranam Sai Kumar', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD057', 'Kummari Rishab', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD058', 'Gangarapu Varshith Goud', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD059', 'Baddam Snehith Reddy', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD060', 'Nakkana Harish', 1, 'Sec A', 'P2', '2026-27'),
  ('IIHM26HYD061', 'Pasham Jaswanth Reddy', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD062', 'Tejavath Rambabu', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD063', 'NANDIBHATLA KAILASH', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD064', 'Jinuka shiva charan', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD065', 'Pittala Harinesh', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD066', 'Antharam Abhilash', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD067', 'KURNI NAVEEN KUMAR B', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD068', 'Abdul Mujeeb', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD069', 'Muthyala Shashi kumar', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD070', 'Gadagoni Harshavardhan', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD071', 'Sappidi Shashank Reddy', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD072', 'Sura Chandrashekar Reddy', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD073', 'Gurram Suryateja', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD074', 'Ampilli Jashuva', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD075', 'Dammalapati Yaswanth', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD076', 'MD Umair', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD077', 'Asi Sirish Kumar', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD078', 'Jagithyala Anish Goud', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD079', 'Shaik Fayaz', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD080', 'Avvaru Naga Siva Sai charan teja', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD081', 'METTI HEMA LOKESH', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD082', 'Kothuri Vamshi', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD083', 'Salivendri Ganesh Reddy', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD084', 'Bimanaboina Veerendra', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD085', 'AKULA SURYATEJA', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD086', 'RATHNAGAR RISHITH', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD087', 'BERELLI PRIYADATH', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD088', 'Talluri John Welsey', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD089', 'Sah Mohith Kumar', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD090', 'KATTA SIDDHARTHA', 1, 'Sec B', 'P3', '2026-27'),
  ('IIHM26HYD091', 'Goshika Sushanth', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD092', 'Gurram Manith Reddy', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD093', 'Madireddy Pujith Reddy', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD094', 'Karanam Bhaskar', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD095', 'Inaganti Vignesh Chowdary', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD096', 'Saysani Karthik Reddy', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD097', 'Shiva Teja Ek', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD098', 'Mohammed Rehan', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD099', 'Chalamala Pavani Krishnaveni', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD100', 'Regula Thirumalesh', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD101', 'Sreeshanth Raj Kanjarla', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD102', 'Mitta Lohith Reddy', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD103', 'Edara Hitesh Balaji', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD104', 'Sheelam Shivaraju', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD105', 'Pullapalli Teja Charan', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD106', 'Gudi UmaKanth', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD107', 'Gunasainath Majjari', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD108', 'Nagavarapu Sai Nikhila', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD109', 'Vejju Hasya Sai Shivani', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD110', 'Rathod Venkata Narasimha', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD111', 'Akshath Chowdari Gowri Mundru', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD112', 'Jannu John Banyan', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD113', 'Dasari Sai Ram', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD114', 'Gargi Mitra', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD115', 'Gannu Sanjeev Srinivas', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD116', 'Sushant Kumar Singh', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD117', 'Katta Ajay Kumar', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD118', 'Krishna Suresh Agrawal', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM26HYD119', 'Palle Maheeth Reddy', 1, 'Sec B', 'P4', '2026-27'),
  ('IIHM25HYD002', 'Vedant Vidyadhar Kuntala', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD003', 'Edurinti Mohan', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD004', 'Mukkisa Harsha Vardhan Redyy', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD005', 'Seetammagari Siva Kumar', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD006', 'Mallipeddi Venkata Naga Sai Tejaswini', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD007', 'Pellate Sai Nikhil', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD008', 'Vardhini Nalli', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD009', 'Kadakuditi Jaya Suryanarayana Murthy', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD010', 'Srikanth Singh Bidla', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD012', 'Rangu Sandeep', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD013', 'Bollikonda Venkat Sai', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD014', 'Teki Ram Charan Tej', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD015', 'Kannale Nishanth', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD016', 'Nehal Basant Ray', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD022', 'Kalangi Seetharam', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD023', 'Varaganti Sandeep', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD024', 'Burra Abhilash', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD025', 'Jagannath THOTOLLLA', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD026', 'Donakonda Shiva Kumar', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD027', 'Lambu Laleep Krishnasai', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD028', 'Silla Dinakar', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD029', 'Basit Ali Nawab', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD030', 'Harsh Kumar', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD031', 'Nagappagari Bharath Reddy', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD033', 'Pathan Taheer', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD034', 'Lakshmi Manaswi Puttapaka', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD035', 'Teja Keshav', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD036', 'Subhash .', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD037', 'Karthik .', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD038', 'Kusuru Shyam', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD039', 'Sathwik Challa', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD044', 'Busireddy Abhilash', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD050', 'Gajulla Gowtham', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD052', 'Nadiminti Narasimha', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD064', 'Medisetti Narasimha Murthy', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD075', 'Garlapati Aravind', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD076', 'Garlapati Navadeep', 4, 'Sec A', null, '2026-27'),
  ('IIHM25HYD119', 'Venkatesh', 4, 'Sec A', null, '2026-27'),
  ('IIHM24HYD001', 'Byagari Harshavardhan', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD002', 'Rohan Natakam', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD004', 'Debapriya Saha', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD005', 'Jadhao Aryan Vijayrao', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD006', 'Vanshika Saraf', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD007', 'Jatin Gupta', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD008', 'Vanga Vijay Raghava Reddy', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD009', 'Galigudem Dinesh Kumar', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD010', 'Pachi Palli Vaishnavi', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD012', 'Ashray Pasula', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD013', 'Bandaru Maheshwar', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD014', 'Khatroth Vikranth Rathod', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD015', 'Matta Venkata Chandra Mouli', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD016', 'V YETHIN NEEL KUMAR', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD017', 'Vangur Chaitanya', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD018', 'Borigam Chandu', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD019', 'Sanne Vishnu Vedhanth Reddy', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD020', 'Pagadala Abhinav Sidharth', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD021', 'Dwaram Tejodhar Reddy', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD022', 'Pamulapati Dimple Chowdary', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD024', 'Manne Hari Krishna', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD025', 'Ivan Parker', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD026', 'Donda Durgaprasad', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD027', 'M Sai Sujal', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD029', 'Kelvin John Patrick', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD030', 'Abhishek', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD031', 'Chennuru Venkata Sree Shyam Kasyap', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD032', 'Kummari Durga Prasad', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD033', 'Nomula Hrishikesh', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD034', 'Sravan Gundu', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD036', 'Barma Sagar', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD037', 'Vajjala Venkatesh', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD038', 'Sriram Ananya', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD039', 'Guduru Sairam', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD041', 'Gadwal Abhinav', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD042', 'N Arthik Goud', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD043', 'Farhatul Nasreen', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD044', 'Amalapuram Susheela', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD045', 'Palakati Hanumanthu', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD046', 'Sambarapu Anil', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD047', 'Aarushi Sharma', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD049', 'Ramapurapu Reuel Wilson', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD050', 'Joy Joshua N', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD051', 'Sheri Rohith Reddy', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD055', 'Abhishek Singh Pawar', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD056', 'Mohammad Abrar Ul Haq', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD057', 'Yeruva Sashank Reddy', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD058', 'Ramavath Hanmanthu Naik', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD061', 'Mojjada Shiva', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD063', 'Unkili Suresh', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD064', 'Uyyala Sathwik', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD065', 'Nalla Ramcharan Reddy', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD066', 'Syed Rehan Hassan Razvi', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD068', 'Kommu Trinesh', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD069', 'Gundekari Vivek', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD070', 'Zara Hasan', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD071', 'Pothana Himaja', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD073', 'Vatsa Rakesh', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD074', 'MEDAM SRAVAN', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD075', 'Velagapudi Jathin', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD076', 'Dubbakula Thrilok', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD077', 'Sirigiri Lohith Kumar', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD078', 'P Manivardhan Reddy', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD079', 'Pamoti Chandrasekhar', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD081', 'Gaddamedi Prabhas', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD082', 'Ratnala Anand Vardhan Goud', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD083', 'Mekala Kavya Sri', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD084', 'Gawali Vaishnavi Ravi', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM24HYD085', 'Shaik Abdul Moied Shareef', 5, 'Mixed A&B', null, '2026-27'),
  ('IIHM20HYD023', 'MUDAVATH SUMAN', 5, 'Mixed A&B', null, '2026-27')
on conflict (roll_number) do update set
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
