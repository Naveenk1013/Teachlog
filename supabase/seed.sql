-- =============================================================================
-- Seed Data: seed.sql (Development and Local Testing)
-- =============================================================================

-- Deterministic UUIDs for seed references
do $$
declare
  v_prog_id uuid := '11111111-1111-1111-1111-111111111111';
  v_batch1_id uuid := '22222222-2222-2222-2222-222222222221';
  v_batch2_id uuid := '22222222-2222-2222-2222-222222222222';
  
  -- Subject UUIDs
  v_sub_fp2 uuid := '33333333-3333-3333-3333-333333333301';
  v_sub_fb2 uuid := '33333333-3333-3333-3333-333333333302';
  v_sub_fo2 uuid := '33333333-3333-3333-3333-333333333303';
  v_sub_fp4 uuid := '33333333-3333-3333-3333-333333333304';
  v_sub_fb4 uuid := '33333333-3333-3333-3333-333333333305';
  
  -- User UUIDs (Mock auth users)
  v_admin_id uuid := 'aaaa0000-0000-0000-0000-000000000001';
  v_teach_rajesh uuid := 'bbbb0000-0000-0000-0000-000000000001';
  v_teach_priya uuid := 'bbbb0000-0000-0000-0000-000000000002';
  v_teach_amit uuid := 'bbbb0000-0000-0000-0000-000000000003';
  v_cr_aarav uuid := 'cccc0000-0000-0000-0000-000000000001';
  v_cr_ananya uuid := 'cccc0000-0000-0000-0000-000000000002';

begin
  -- 1. Programme
  insert into programmes (id, code, name, duration_years, total_semesters)
  values (v_prog_id, 'BHA', 'B.Sc in Hospitality & Hotel Administration', 3, 6)
  on conflict (code) do nothing;

  -- 2. Batches
  insert into batches (id, programme_id, name, intake_year, current_semester, academic_year, semester_start_date, class_strength)
  values 
    (v_batch1_id, v_prog_id, 'Intake 2024-27 (Sem 4)', 2024, 4, '2026-27', '2026-06-15', 60),
    (v_batch2_id, v_prog_id, 'Intake 2025-28 (Sem 2)', 2025, 2, '2026-27', '2026-06-15', 65)
  on conflict (programme_id, name) do nothing;

  -- 3. Subjects
  insert into subjects (id, programme_id, semester, code, name)
  values
    (v_sub_fp2, v_prog_id, 2, 'BHM111', 'Food Production Principles'),
    (v_sub_fb2, v_prog_id, 2, 'BHM112', 'Food & Beverage Service Operations'),
    (v_sub_fo2, v_prog_id, 2, 'BHM113', 'Front Office Operations'),
    (v_sub_fp4, v_prog_id, 4, 'BHM211', 'Food Production Management'),
    (v_sub_fb4, v_prog_id, 4, 'BHM212', 'Food & Beverage Management')
  on conflict (programme_id, semester, name) do nothing;

  -- 4. Syllabus Topics for Food Production Principles (BHM111)
  insert into syllabus_topics (subject_id, unit_no, seq, title)
  values
    (v_sub_fp2, 1, 1, 'Introduction to Cookery & Kitchen Organisation'),
    (v_sub_fp2, 1, 2, 'Aims and Objectives of Cooking Food'),
    (v_sub_fp2, 2, 3, 'Basic Principles of Food Production & Heat Transfer'),
    (v_sub_fp2, 2, 4, 'Methods of Cooking Food: Boiling, Poaching, Steaming'),
    (v_sub_fp2, 3, 5, 'Stocks: Classification, White, Brown, and Vegetable'),
    (v_sub_fp2, 3, 6, 'Mother Sauces: Béchamel, Velouté, Espagnole, Tomato, Hollandaise'),
    (v_sub_fp2, 4, 7, 'Soups: Classification, Consommé, Puree, Cream, Chowders'),
    (v_sub_fp2, 5, 8, 'Culinary Terms and French Classical Menu')
  on conflict (subject_id, seq) do nothing;

  -- 5. Syllabus Topics for Food & Beverage Service Operations (BHM112)
  insert into syllabus_topics (subject_id, unit_no, seq, title)
  values
    (v_sub_fb2, 1, 1, 'The Food & Beverage Service Industry Overview'),
    (v_sub_fb2, 1, 2, 'Department Hierarchy and Attributes of Service Staff'),
    (v_sub_fb2, 2, 3, 'Food & Beverage Service Equipment: Glassware, Crockery, Cutlery'),
    (v_sub_fb2, 3, 4, 'Table Setting & Mise-en-place Procedures'),
    (v_sub_fb2, 4, 5, 'Types of Food Service: Silver, American, English, Buffet')
  on conflict (subject_id, seq) do nothing;

  -- 5b. Syllabus Topics for Food Production Management (BHM211)
  insert into syllabus_topics (subject_id, unit_no, seq, title)
  values
    (v_sub_fp4, 1, 1, 'Quantity Food Production & Kitchen Layout Planning'),
    (v_sub_fp4, 2, 2, 'Meat Cookery, Fabrication & Butcher''s Yield Testing'),
    (v_sub_fp4, 3, 3, 'Larder Work, Charcuterie & Garde Manger Preparations'),
    (v_sub_fp4, 4, 4, 'Regional Indian Cuisines (Awadhi, Hyderabadi, Chettinad)'),
    (v_sub_fp4, 5, 5, 'Bakery & Pastry: Yeast Goods, Shortcrust & Choux Pastry'),
    (v_sub_fp4, 6, 6, 'Food Production Costing, Standard Recipe Cards & Yield Management')
  on conflict (subject_id, seq) do nothing;

  -- 5c. Syllabus Topics for Food & Beverage Management (BHM212)
  insert into syllabus_topics (subject_id, unit_no, seq, title)
  values
    (v_sub_fb4, 1, 1, 'Menu Engineering and Pricing Strategies'),
    (v_sub_fb4, 2, 2, 'Beverage Management, Wine Cellar & Bar Operations'),
    (v_sub_fb4, 3, 3, 'Banquet & Event Catering Operations'),
    (v_sub_fb4, 4, 4, 'F&B Cost Control and Sales Analysis')
  on conflict (subject_id, seq) do nothing;

  -- 6. Insert Mock Auth Users into auth.users (with password: password123)
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    phone_change,
    phone_change_token,
    email_change_token_current,
    reauthentication_token,
    created_at,
    updated_at
  )
  values
    ('00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated', 'admin@iihmhyd.edu.in', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name": "Admin Naveen"}'::jsonb, '', '', '', '', '', '', '', '', now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_teach_rajesh, 'authenticated', 'authenticated', 'rajesh.kumar@iihmhyd.edu.in', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name": "Chef Rajesh Kumar"}'::jsonb, '', '', '', '', '', '', '', '', now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_teach_priya, 'authenticated', 'authenticated', 'priya.sharma@iihmhyd.edu.in', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name": "Ms. Priya Sharma"}'::jsonb, '', '', '', '', '', '', '', '', now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_teach_amit, 'authenticated', 'authenticated', 'amit.roy@iihmhyd.edu.in', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name": "Mr. Amit Roy"}'::jsonb, '', '', '', '', '', '', '', '', now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_cr_aarav, 'authenticated', 'authenticated', 'aarav.cr@student.iihmhyd.edu.in', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name": "Aarav Patel (CR Sem 4)"}'::jsonb, '', '', '', '', '', '', '', '', now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_cr_ananya, 'authenticated', 'authenticated', 'ananya.cr@student.iihmhyd.edu.in', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name": "Ananya Reddy (CR Sem 2)"}'::jsonb, '', '', '', '', '', '', '', '', now(), now())
  on conflict (id) do nothing;

  -- Ensure any existing rows have empty strings instead of NULL for GoTrue scanner
  update auth.users 
  set 
    confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change = coalesce(email_change, ''),
    phone_change = coalesce(phone_change, ''),
    phone_change_token = coalesce(phone_change_token, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    reauthentication_token = coalesce(reauthentication_token, '');

  -- 6b. Identities for Supabase Auth
  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values
    (v_admin_id, v_admin_id, format('{"sub":"%s","email":"%s"}', v_admin_id, 'admin@iihmhyd.edu.in')::jsonb, 'email', 'admin@iihmhyd.edu.in', now(), now(), now()),
    (v_teach_rajesh, v_teach_rajesh, format('{"sub":"%s","email":"%s"}', v_teach_rajesh, 'rajesh.kumar@iihmhyd.edu.in')::jsonb, 'email', 'rajesh.kumar@iihmhyd.edu.in', now(), now(), now()),
    (v_teach_priya, v_teach_priya, format('{"sub":"%s","email":"%s"}', v_teach_priya, 'priya.sharma@iihmhyd.edu.in')::jsonb, 'email', 'priya.sharma@iihmhyd.edu.in', now(), now(), now()),
    (v_teach_amit, v_teach_amit, format('{"sub":"%s","email":"%s"}', v_teach_amit, 'amit.roy@iihmhyd.edu.in')::jsonb, 'email', 'amit.roy@iihmhyd.edu.in', now(), now(), now()),
    (v_cr_aarav, v_cr_aarav, format('{"sub":"%s","email":"%s"}', v_cr_aarav, 'aarav.cr@student.iihmhyd.edu.in')::jsonb, 'email', 'aarav.cr@student.iihmhyd.edu.in', now(), now(), now()),
    (v_cr_ananya, v_cr_ananya, format('{"sub":"%s","email":"%s"}', v_cr_ananya, 'ananya.cr@student.iihmhyd.edu.in')::jsonb, 'email', 'ananya.cr@student.iihmhyd.edu.in', now(), now(), now())
  on conflict (id) do nothing;

  -- 7. Profiles
  insert into profiles (id, full_name, role, department, is_active)
  values
    (v_admin_id, 'Admin Naveen', 'admin', 'Academic Administration', true),
    (v_teach_rajesh, 'Chef Rajesh Kumar', 'teacher', 'Food Production', true),
    (v_teach_priya, 'Ms. Priya Sharma', 'teacher', 'Food & Beverage Service', true),
    (v_teach_amit, 'Mr. Amit Roy', 'teacher', 'Rooms Division', true),
    (v_cr_aarav, 'Aarav Patel', 'cr', 'Hospitality Studies', true),
    (v_cr_ananya, 'Ananya Reddy', 'cr', 'Hospitality Studies', true)
  on conflict (id) do nothing;

  -- 8. Teaching Assignments (Demonstrating repeat teaching)
  insert into teaching_assignments (teacher_id, subject_id, batch_id, academic_year)
  values
    -- Chef Rajesh teaches Food Production to Batch 2 AND Batch 1
    (v_teach_rajesh, v_sub_fp2, v_batch2_id, '2026-27'),
    (v_teach_rajesh, v_sub_fp4, v_batch1_id, '2026-27'),
    -- Ms. Priya teaches F&B Service
    (v_teach_priya, v_sub_fb2, v_batch2_id, '2026-27'),
    (v_teach_priya, v_sub_fb4, v_batch1_id, '2026-27'),
    -- Mr. Amit teaches Front Office
    (v_teach_amit, v_sub_fo2, v_batch2_id, '2026-27')
  on conflict (teacher_id, subject_id, batch_id, academic_year) do nothing;

  -- 9. CR Authorisations
  insert into cr_authorisations (cr_id, batch_id, academic_year, granted_by)
  values
    (v_cr_aarav, v_batch1_id, '2026-27', v_admin_id),
    (v_cr_ananya, v_batch2_id, '2026-27', v_admin_id)
  on conflict do nothing;

end $$;
