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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("=== Seeding Syllabus Topics for All Subjects ===");

  const subjectTopics = [
    // BHM212: Food & Beverage Management
    {
      subjectId: "33333333-3333-3333-3333-333333333305",
      topics: [
        "Beverage Cost Control and Cellar Management",
        "Menu Engineering and Pricing Strategies",
        "Banquet and Event Catering Operations",
        "Bar Management, Spirits, and Cocktails",
        "Financial Budgeting and F&B Performance Metrics",
      ],
    },
    // BHM213: Front Office Management
    {
      subjectId: "33333333-3333-3333-3333-333333333306",
      topics: [
        "Yield Management and Forecasting Occupancy",
        "Property Management System (PMS) Advanced Controls",
        "Guest Relation Executive (GRE) Protocol & VIP Handling",
        "Night Audit Procedures and Revenue Reconciliation",
        "Credit Monitoring, City Ledger, and Dispute Resolution",
      ],
    },
    // BHM214: Accommodation Management
    {
      subjectId: "33333333-3333-3333-3333-333333333307",
      topics: [
        "Linen Room Operations, Par Stocks, and Inventory Control",
        "Laundry Equipment, Chemicals, and Dry Cleaning Flow",
        "Interior Decoration, Colour Schemes, and Lighting in Hotels",
        "Safety, Security, Pest Control, and Eco-Friendly Practices",
        "Housekeeping Budgeting and Capital Asset Maintenance",
      ],
    },
    // BHM215: Hospitality Marketing & Sales
    {
      subjectId: "33333333-3333-3333-3333-333333333308",
      topics: [
        "Hospitality Marketing Environment & Market Segmentation",
        "Hotel Product Lifecycle, Positioning, and Branding",
        "Digital Marketing, OTA Channels, and Online Reputation",
        "Personal Selling, Corporate Contracts, and MICE Sales",
        "Customer Relationship Management (CRM) in Hospitality",
      ],
    },
    // BHM216: Hotel Accountancy & Financial Controls
    {
      subjectId: "33333333-3333-3333-3333-333333333309",
      topics: [
        "Uniform System of Accounts for the Lodging Industry (USALI)",
        "Income Statement and Departmental Revenue Analysis",
        "Working Capital Management and Cash Flow Forecasting",
        "Break-Even Analysis, Operating Ratios, and ADR/RevPAR",
        "Internal Audit, Stock Audits, and Statutory Compliance",
      ],
    },
    // BHM113: Front Office Operations
    {
      subjectId: "33333333-3333-3333-3333-333333333303",
      topics: [
        "Introduction to Hotel Industry & Front Office Organization",
        "Reservation Systems, Modes, and Channels",
        "Check-In Procedures, Room Allocation, and Key Cards",
        "Front Desk Communication & Handling Guest Queries",
        "Bell Desk Operations and Left Luggage Management",
      ],
    },
    // BHM114: Accommodation Operations
    {
      subjectId: "33333333-3333-3333-3333-333333333310",
      topics: [
        "Role of Housekeeping Department in Hospitality",
        "Cleaning Equipment, Brushes, Mops, and Mechanical Devices",
        "Cleaning Agents, Chemicals, and pH Scale Usage",
        "Daily Guest Room Cleaning & Bed Making Standards",
        "Public Area Cleaning Schedules and Deep Cleaning Procedures",
      ],
    },
    // BHM115: Principles of Food Science & Nutrition
    {
      subjectId: "33333333-3333-3333-3333-333333333311",
      topics: [
        "Food Contamination, Spoilage, and Foodborne Illnesses",
        "HACCP Principles and Kitchen Sanitation Guidelines",
        "Macronutrients: Carbohydrates, Proteins, and Lipids",
        "Micronutrients, Vitamins, Minerals, and Water Balance",
        "Balanced Diet Planning and Cooking Methods on Nutrient Retention",
      ],
    },
    // BHM116: Hotel Engineering & Maintenance
    {
      subjectId: "33333333-3333-3333-3333-333333333312",
      topics: [
        "Engineering Department Organization and Maintenance Types",
        "HVAC Systems, Air Handling Units, and Temperature Controls",
        "Water Supply, Softening, Plumbing, and Sewage Treatment",
        "Electrical Distribution, Generators, and Energy Conservation",
        "Fire Fighting Systems, Alarms, and Emergency Evacuation",
      ],
    },
  ];

  for (const st of subjectTopics) {
    const { data: existing } = await adminClient
      .from("syllabus_topics")
      .select("id")
      .eq("subject_id", st.subjectId);

    if (!existing || existing.length === 0) {
      console.log(`Inserting ${st.topics.length} topics for subject ${st.subjectId}...`);
      const rows = st.topics.map((title, idx) => ({
        subject_id: st.subjectId,
        unit_no: Math.floor(idx / 2) + 1,
        seq: idx + 1,
        title,
      }));
      const { error } = await adminClient.from("syllabus_topics").insert(rows);
      if (error) console.error("Error inserting topics:", error);
      else console.log("   ✅ Topics inserted.");
    } else {
      console.log(`Subject ${st.subjectId} already has ${existing.length} topics.`);
    }
  }

  console.log("🎉 All syllabus topics seeded!");
}

main().catch(console.error);
