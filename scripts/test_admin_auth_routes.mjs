import fs from "fs";

// Read .env.local manually
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

async function testAuthRoutes() {
  console.log("=== Testing Authenticated Admin Pages Rendering ===");

  // 1. Submit login form as admin
  const loginRes = await fetch("http://localhost:3000/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      email: "admin@iihmhyd.edu.in",
      password: "password123",
    }),
    redirect: "manual",
  });

  const cookies = loginRes.headers.get("set-cookie");
  console.log("Login status:", loginRes.status, "Cookies present:", !!cookies);

  // Split and extract cookie header
  const cookieHeader = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ') : cookies?.split(';')[0] || '';

  const pages = [
    "/admin",
    "/admin/teachers",
    "/admin/subjects",
    "/admin/allocations",
    "/admin/batches",
  ];

  for (const page of pages) {
    const res = await fetch("http://localhost:3000" + page, {
      headers: {
        Cookie: cookieHeader,
      },
    });
    console.log(`Page: ${page} -> HTTP ${res.status}`);
    if (res.status !== 200) {
      const text = await res.text();
      console.error(`Error on ${page}:`, text.slice(0, 300));
      process.exit(1);
    }
  }

  console.log("🎉 All Admin pages compiled and rendered with HTTP 200 OK!");
}

testAuthRoutes().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
