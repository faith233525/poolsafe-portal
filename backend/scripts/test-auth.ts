import fetch from "node-fetch";

const API_BASE = "http://localhost:4000/api";

async function testAuthentication() {
  console.log("🧪 Testing Pool Safe Portal Authentication\n");

  try {
    // Test 1: Partner Login
    console.log("1️⃣ Testing Partner Login...");
    const partnerLoginResponse = await fetch(`${API_BASE}/auth/login/partner`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "manager@testresort.com",
        password: "partner123",
      }),
    });

    const partnerLogin: any = await partnerLoginResponse.json();
    if (partnerLogin.token) {
      console.log("✅ Partner login successful");
      console.log(`   Token: ${partnerLogin.token.substring(0, 20)}...`);
      console.log(`   User: ${partnerLogin.user.displayName} (${partnerLogin.user.role})`);

      // Test protected route with partner token
      console.log("\n2️⃣ Testing Partner Access to Own Data...");
      const partnerDataResponse = await fetch(`${API_BASE}/partners`, {
        headers: {
          Authorization: `Bearer ${partnerLogin.token}`,
          "Content-Type": "application/json",
        },
      });

      if (partnerDataResponse.ok) {
        const partnerData: any = await partnerDataResponse.json();
        console.log("✅ Partner can access their data");
        console.log(`   Found ${partnerData.length} partner(s)`);
      } else {
        console.log("❌ Partner cannot access data");
      }
    } else {
      console.log("❌ Partner login failed:", partnerLogin);
    }

    // Test 2: Support Login
    console.log("\n3️⃣ Testing Support Login...");
    const supportLoginResponse = await fetch(`${API_BASE}/auth/login/partner`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "support@poolsafe.com",
        password: "support123",
      }),
    });

    const supportLogin: any = await supportLoginResponse.json();
    if (supportLogin.token) {
      console.log("✅ Support login successful");
      console.log(`   User: ${supportLogin.user.displayName} (${supportLogin.user.role})`);

      // Test admin-level access
      console.log("\n4️⃣ Testing Support Access to All Data...");
      const allPartnersResponse = await fetch(`${API_BASE}/partners`, {
        headers: {
          Authorization: `Bearer ${supportLogin.token}`,
          "Content-Type": "application/json",
        },
      });

      if (allPartnersResponse.ok) {
        const allPartners: any = await allPartnersResponse.json();
        console.log("✅ Support can access all partner data");
        console.log(`   Found ${allPartners.length} partner(s)`);
      } else {
        console.log("❌ Support cannot access data");
      }
    } else {
      console.log("❌ Support login failed:", supportLogin);
    }

    // Test 3: Unauthorized Access
    console.log("\n5️⃣ Testing Unauthorized Access...");
    const unauthorizedResponse = await fetch(`${API_BASE}/users`);
    if (unauthorizedResponse.status === 401) {
      console.log("✅ Unauthorized access properly blocked");
    } else {
      console.log("❌ Unauthorized access was allowed");
    }

    console.log("\n🎉 Authentication testing completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testAuthentication();
