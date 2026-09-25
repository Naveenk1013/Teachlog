async function main() {
  const cookieVal = encodeURIComponent(JSON.stringify({
    id: "aaaa0000-0000-0000-0000-000000000001",
    role: "admin",
    name: "Admin Office",
    email: "admin@iihmhyd.edu.in",
    is_active: true,
  }));

  const res = await fetch("http://localhost:3000/admin/crs", {
    headers: {
      Cookie: `teachlog_dev_session=${cookieVal}`,
    },
  });

  console.log("Status:", res.status);
  const html = await res.text();
  console.log("HTML length:", html.length);

  const checks = [
    "Add New Student CR",
    "Select Existing",
    "Register New Student",
    "Student Full Name",
    "Official Student Email",
    "Assign Cohort / Batch",
  ];

  for (const c of checks) {
    const found = html.includes(c);
    console.log(`Checking for "${c}": ${found ? "✅ FOUND" : "❌ NOT FOUND"}`);
  }
}

main().catch(console.error);
