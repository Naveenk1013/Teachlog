async function main() {
  const cookieVal = encodeURIComponent(JSON.stringify({
    id: "cccc0000-0000-0000-0000-000000000001",
    role: "cr",
    name: "Aarav Patel",
    email: "aarav.cr@student.iihmhyd.edu.in",
    is_active: true,
  }));

  const res = await fetch("http://localhost:3000/cr/log", {
    headers: {
      Cookie: `teachlog_dev_session=${cookieVal}`,
    },
  });

  console.log("Status:", res.status);
  const html = await res.text();
  console.log("HTML length:", html.length);

  const checks = [
    "BHM211",
    "BHM212",
    "BHM213",
    "BHM214",
    "BHM215",
    "BHM216",
    "Chef Rajesh Kumar",
    "Ms. Priya Sharma",
    "Mr. Amit Roy",
    "Mr. Ananta Srinivas",
    "Ms. Neha Kapoor",
    "Mr. Suresh Venkat",
    "Select Teacher",
    "Select Subject",
  ];

  for (const c of checks) {
    const found = html.includes(c);
    console.log(`Checking for "${c}": ${found ? "✅ FOUND" : "❌ NOT FOUND"}`);
  }

  console.log("\n=== Testing Ananya Reddy (Sem 2 CR) ===");
  const cookieVal2 = encodeURIComponent(JSON.stringify({
    id: "cccc0000-0000-0000-0000-000000000002",
    role: "cr",
    name: "Ananya Reddy",
    email: "ananya.cr@student.iihmhyd.edu.in",
    is_active: true,
  }));

  const res2 = await fetch("http://localhost:3000/cr/log", {
    headers: {
      Cookie: `teachlog_dev_session=${cookieVal2}`,
    },
  });

  console.log("Status Sem 2:", res2.status);
  const html2 = await res2.text();
  const checks2 = [
    "BHM111",
    "BHM112",
    "BHM113",
    "BHM114",
    "BHM115",
    "BHM116",
    "Chef Rajesh Kumar",
    "Ms. Priya Sharma",
    "Dr. Meenakshi Sundaram",
    "Er. Vikram Rathore",
  ];

  for (const c of checks2) {
    const found = html2.includes(c);
    console.log(`Sem 2: Checking for "${c}": ${found ? "✅ FOUND" : "❌ NOT FOUND"}`);
  }
}

main().catch(console.error);
