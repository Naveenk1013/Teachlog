import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = fs.readFileSync(".env.local", "utf8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const idx = trimmed.indexOf("=");
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      process.env[key] = val;
    }
  }
}

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function seed() {
  console.log("=== Seeding Full Class Sessions for 14-Sep, 21-Sep, and 28-Sep Weeks ===");

  // Find Sem 1 batches
  const { data: batches } = await adminClient
    .from("batches")
    .select("id, name, current_semester, academic_year")
    .eq("current_semester", 1);

  const secA = batches.find((b) => b.name === "(Sem 1) - Sec A") || batches[0];
  const secB = batches.find((b) => b.name === "(Sem 1) - Sec B") || batches[1];
  const p1 = batches.find((b) => b.name.includes("P1")) || secA;
  const p2 = batches.find((b) => b.name.includes("P2")) || secA;
  const p3 = batches.find((b) => b.name.includes("P3")) || secB;
  const p4 = batches.find((b) => b.name.includes("P4")) || secB;

  // Find subjects for Sem 1
  const { data: subjects } = await adminClient
    .from("subjects")
    .select("id, name, code, semester")
    .eq("semester", 1);

  const foSub = subjects.find((s) => s.name.toLowerCase().includes("front office")) || subjects[0];
  const aiSub = subjects.find((s) => s.name.toLowerCase().includes("ai")) || subjects[1];

  // Teachers
  const naveenId = "1be77f6b-81f7-403d-97d0-874dc8d316a4"; // Mr. Naveen Kumar
  const testUserId = "19dcd486-0d4a-4f0d-89e8-d296502e7b6e"; // Test_user

  const teacherIds = [naveenId, testUserId];

  // Helper to ensure teaching assignments exist
  for (const tid of teacherIds) {
    for (const sub of [foSub, aiSub]) {
      for (const b of [secA, secB, p1, p2, p3, p4]) {
        const { data: exist } = await adminClient
          .from("teaching_assignments")
          .select("id")
          .eq("teacher_id", tid)
          .eq("subject_id", sub.id)
          .eq("batch_id", b.id)
          .maybeSingle();

        if (!exist) {
          await adminClient.from("teaching_assignments").insert({
            teacher_id: tid,
            subject_id: sub.id,
            batch_id: b.id,
            academic_year: "2026-27",
          });
        }
      }
    }
  }

  // Week 1: 2026-09-14 to 2026-09-19 (the exact week user tested)
  const week14Sessions = [
    // Mon 14-Sep
    { date: "2026-09-14", start: "09:00:00", end: "10:00:00", batch: secA, sub: foSub, topic: "Front Office Operations - Organization Structure & Role of Front Desk in Luxury Hotels", method: "Interactive Lecture with PPT & Visual Audio-Visual Aids", activity: "Organizational hierarchy chart & department workflow concept map" },
    { date: "2026-09-14", start: "11:15:00", end: "12:15:00", batch: secB, sub: aiSub, topic: "AI in Hospitality - Foundations of Machine Learning & Intelligent Automation", method: "Lecture with Case Analysis & Interactive Discussion", activity: "Analysis sheet of digital guest touchpoints in modern hotels" },
    // Tue 15-Sep
    { date: "2026-09-15", start: "10:00:00", end: "12:00:00", batch: p1, sub: foSub, topic: "Front Office Practical - Check-in Terminal Familiarization & Key Card Encoding", method: "Demonstration & Guided Hands-on Practical Training", activity: "Individual SOP Drill & Workstation Cleanliness on Check-in Terminal" },
    { date: "2026-09-15", start: "14:00:00", end: "15:00:00", batch: secA, sub: foSub, topic: "Guest Cycle Stages - Pre-Arrival, Arrival, Stay, and Departure Workflows", method: "Interactive Lecture with PPT & Real-world Hotel Scenarios", activity: "Draft guest cycle matrix and critical touchpoint list" },
    // Wed 16-Sep
    { date: "2026-09-16", start: "10:00:00", end: "12:00:00", batch: p3, sub: foSub, topic: "Front Office Practical - Registration Card Processing & Guest Folio Setup", method: "Demonstration & Guided Hands-on Practical Training", activity: "PMS terminal registration entry drill & guest profile verification" },
    { date: "2026-09-16", start: "14:00:00", end: "15:00:00", batch: secB, sub: foSub, topic: "Hotel Classification - Basis of Size, Star Rating, Location & Target Clientele", method: "Lecture & Comparative Industry Presentation", activity: "Classification worksheet & Indian hotel brand categorization chart" },
    // Thu 17-Sep
    { date: "2026-09-17", start: "11:15:00", end: "13:15:00", batch: p4, sub: aiSub, topic: "AI Lab Practical - Conversational AI, Concierge Chatbots & Automated Booking Engines", method: "Guided Lab Simulation & Practical Demonstration", activity: "Chatbot prompt configuration & guest FAQ query test drill" },
    { date: "2026-09-17", start: "15:00:00", end: "16:00:00", batch: secA, sub: aiSub, topic: "Smart Hotel Rooms - IoT Sensors, Voice Interfaces & Energy Management Systems", method: "Lecture with Case Analysis & Audio-Visual Media", activity: "Case study review on connected smart rooms in Marriott & Hilton" },
    // Fri 18-Sep
    { date: "2026-09-18", start: "10:00:00", end: "12:00:00", batch: p2, sub: foSub, topic: "Front Office Practical - Check-in Role-Play & Sequence of Service Table Drills", method: "Demonstration & Guided Hands-on Practical Training", activity: "Role-play scenario & Sequence of Service drill for check-in" },
    { date: "2026-09-18", start: "14:00:00", end: "15:00:00", batch: secB, sub: foSub, topic: "Telephone Etiquette & Professional Reservation Call Handling Procedures", method: "Role-Play & Simulation with Telephone Console", activity: "Standard telephone reservation call script drill & call log review" },
    // Sat 19-Sep
    { date: "2026-09-19", start: "10:00:00", end: "12:00:00", batch: secA, sub: foSub, topic: "Weekly Review, Terminology Viva & Guest Cycle SOP Drill", method: "Formative Assessment & Structured Review Session", activity: "Weekly spot quiz, viva assessment & concept reinforcement handouts" },
  ];

  for (const tid of teacherIds) {
    // Delete existing sessions for week 14
    await adminClient
      .from("class_sessions")
      .delete()
      .eq("teacher_id", tid)
      .gte("session_date", "2026-09-14")
      .lte("session_date", "2026-09-19");

    for (const item of week14Sessions) {
      await adminClient.from("class_sessions").insert({
        batch_id: item.batch.id,
        subject_id: item.sub.id,
        teacher_id: tid,
        semester: 1,
        academic_year: "2026-27",
        session_date: item.date,
        start_time: item.start,
        end_time: item.end,
        students_present: item.batch.name.includes("P") ? 24 : 48,
        topic_covered: item.topic,
        topic_planned: item.topic,
        teaching_method: item.method,
        assignment_activity: item.activity,
        status: "verified",
        entered_by: tid,
      });
    }
    console.log(`✅ Seeded 11 complete sessions for teacher ${tid} in Week 14-Sep-2026.`);
  }

  // Week 2: 2026-09-21 to 2026-09-26 for Mr. Naveen Kumar as well
  const week21Sessions = [
    { date: "2026-09-21", start: "11:00:00", end: "12:00:00", batch: secA, sub: foSub, topic: "Front Office Operations - Room Tariff Structures & Meal Plans (EP, CP, MAP, AP)", method: "Lecture / Theory / Presentation", activity: "Room tariff calculation worksheet & meal plan comparison chart" },
    { date: "2026-09-22", start: "10:00:00", end: "12:00:00", batch: p1, sub: foSub, topic: "Front Office Practical - PMS Room Allocation & Walk-in Guest Check-in", method: "Demonstration & Guided Hands-on Practical Training", activity: "Standard Operating Procedure (SOP) Drill on Check-in Terminal" },
    { date: "2026-09-22", start: "14:00:00", end: "15:00:00", batch: secA, sub: foSub, topic: "Guest Registration Documents - GRC (Guest Registration Card) Verification", method: "Lecture & Document Analysis", activity: "Review questions & guest cycle flow chart" },
    { date: "2026-09-23", start: "10:00:00", end: "12:00:00", batch: p2, sub: foSub, topic: "Front Office Practical - Foreign National Registration (Form C Procedures)", method: "Demonstration & Guided Hands-on Practical Training", activity: "Form C compliance drill & passport verification exercise" },
    { date: "2026-09-23", start: "14:00:00", end: "15:00:00", batch: secB, sub: foSub, topic: "Front Office Accounting Basics - Guest Ledger vs City Ledger", method: "Problem Solving, Numerical Exercises & Lecture Presentation", activity: "Classification of guest accounts and ledger ledger balancing drill" },
    { date: "2026-09-24", start: "14:00:00", end: "15:00:00", batch: secA, sub: aiSub, topic: "AI in Hospitality - Automated Revenue Management Algorithms & Dynamic Pricing", method: "Lecture with Case Analysis & Interactive Discussion", activity: "Case study review on AI concierge and chatbot integration in luxury hotels" },
    { date: "2026-09-24", start: "15:00:00", end: "16:00:00", batch: secA, sub: foSub, topic: "Guest Registration & PMS Check-in SOPs (Sec A)", method: "Interactive Discussion & Presentation", activity: "Draft guest folio & check-in billing exercise" },
    { date: "2026-09-25", start: "10:00:00", end: "12:00:00", batch: p3, sub: foSub, topic: "Front Office Practical - Group Check-in & Luggage Tagging Protocol", method: "Practical / Hands-on Demonstration", activity: "Guest interaction role-play & key card handling evaluation" },
    { date: "2026-09-25", start: "14:00:00", end: "15:00:00", batch: secA, sub: foSub, topic: "Front Office Operations - Weekly Theory Revision (Sec A & B)", method: "Lecture & Spot Questioning", activity: "Weekly unit quiz & conceptual assessment" },
    { date: "2026-09-25", start: "15:00:00", end: "16:00:00", batch: secB, sub: foSub, topic: "Telephone Etiquette & Reservation Queries (Sec B)", method: "Role-Play & Simulation", activity: "Standard reservation script drill & call handling logs" },
    { date: "2026-09-26", start: "10:00:00", end: "12:00:00", batch: secA, sub: foSub, topic: "Tutorial Session - Review of Weekly Front Desk SOPs & Formative Assessment", method: "Interactive Group Discussion & Oral Viva", activity: "Weekly assessment quiz & remedial concept review" },
  ];

  await adminClient
    .from("class_sessions")
    .delete()
    .eq("teacher_id", naveenId)
    .gte("session_date", "2026-09-21")
    .lte("session_date", "2026-09-26");

  for (const item of week21Sessions) {
    await adminClient.from("class_sessions").insert({
      batch_id: item.batch.id,
      subject_id: item.sub.id,
      teacher_id: naveenId,
      semester: 1,
      academic_year: "2026-27",
      session_date: item.date,
      start_time: item.start,
      end_time: item.end,
      students_present: item.batch.name.includes("P") ? 24 : 48,
      topic_covered: item.topic,
      topic_planned: item.topic,
      teaching_method: item.method,
      assignment_activity: item.activity,
      status: "verified",
      entered_by: naveenId,
    });
  }
  console.log(`✅ Seeded 11 complete sessions for Mr. Naveen Kumar in Week 21-Sep-2026.`);

  // Week 3: 2026-09-28 to 2026-10-03 (current week) - update and enrich existing + fill missing days
  const week28Sessions = [
    { date: "2026-09-28", start: "09:00:00", end: "10:00:00", batch: secA, sub: foSub, topic: "Front Office Management - Group Handling Procedures, Rooming Lists & Group Reservations", method: "Lecture with Case Analysis & Interactive Discussion", activity: "Group reservation rooming list verification & voucher entry drill" },
    { date: "2026-09-29", start: "11:00:00", end: "13:00:00", batch: p1, sub: foSub, topic: "Front Office Practical - VIP Welcome Protocols & Express Check-in Procedures", method: "Demonstration & Guided Hands-on Practical Training", activity: "Individual SOP Drill & Workstation Cleanliness on VIP arrivals" },
    { date: "2026-09-30", start: "10:00:00", end: "12:00:00", batch: p2, sub: foSub, topic: "Front Office Practical - Guest Folio Billing, Cashiering & Currency Exchange SOPs", method: "Demonstration & Guided Hands-on Practical Training", activity: "Drafting guest folio, cashier settlement receipt & ledger posting" },
    { date: "2026-10-01", start: "11:00:00", end: "13:00:00", batch: p3, sub: aiSub, topic: "AI in Hospitality 1 - Machine Learning Algorithms & Turing Test Applications in Hotels", method: "Guided Lab Simulation & Practical Demonstration", activity: "Hands-on machine learning model evaluation for guest sentiment analysis" },
    { date: "2026-10-01", start: "14:00:00", end: "16:00:00", batch: p1, sub: aiSub, topic: "AI in Hospitality 1 - Natural Language Processing (NLP) & Virtual Concierge Systems", method: "Guided Hands-on Lab Session & Role-play", activity: "NLP conversational query testing & prompt engineering drill" },
    { date: "2026-10-02", start: "10:00:00", end: "12:00:00", batch: p4, sub: foSub, topic: "Front Office Practical - Handling Guest Complaints & Service Recovery Techniques", method: "Role-Play & Simulation with Real Hotel Case Studies", activity: "LAST (Listen, Apologize, Solve, Thank) model role-play & incident report draft" },
    { date: "2026-10-02", start: "14:00:00", end: "15:00:00", batch: secB, sub: foSub, topic: "Front Office Security Procedures - Key Card Security, Safe Deposit Lockers & Emergency SOPs", method: "Interactive Lecture with PPT & Security Video Demonstration", activity: "Safe deposit locker register drill & emergency escalation flowchart" },
    { date: "2026-10-03", start: "10:00:00", end: "12:00:00", batch: secA, sub: foSub, topic: "Weekly Review, Terminology Viva & PMS Certification Skill Check", method: "Formative Assessment & Structured Review Session", activity: "Weekly spot questioning viva & PMS terminal practical competency check" },
  ];

  for (const tid of teacherIds) {
    await adminClient
      .from("class_sessions")
      .delete()
      .eq("teacher_id", tid)
      .eq("semester", 1)
      .gte("session_date", "2026-09-28")
      .lte("session_date", "2026-10-03");

    for (const item of week28Sessions) {
      await adminClient.from("class_sessions").insert({
        batch_id: item.batch.id,
        subject_id: item.sub.id,
        teacher_id: tid,
        semester: 1,
        academic_year: "2026-27",
        session_date: item.date,
        start_time: item.start,
        end_time: item.end,
        students_present: item.batch.name.includes("P") ? 24 : 48,
        topic_covered: item.topic,
        topic_planned: item.topic,
        teaching_method: item.method,
        assignment_activity: item.activity,
        status: "verified",
        entered_by: tid,
      });
    }
    console.log(`✅ Seeded 8 complete sessions for teacher ${tid} in Week 28-Sep-2026.`);
  }

  console.log("\n🎉 ALL 3 WEEKS FULLY SEEDED FOR BOTH TEACHERS!");
}

seed();
