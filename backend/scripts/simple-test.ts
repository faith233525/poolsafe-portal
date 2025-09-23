import fetch from "node-fetch";

async function simpleTest() {
  try {
    console.log("🔍 Testing server connectivity...");

    // Test health endpoint first
    const healthResponse = await fetch("http://localhost:4000/api/health");
    console.log("Health check status:", healthResponse.status);

    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log("Health data:", healthData);

      // Test authentication
      console.log("\n🔐 Testing partner login...");
      const loginResponse = await fetch(
        "http://localhost:4000/api/auth/login/partner",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "manager@testresort.com",
            password: "partner123",
          }),
        }
      );

      console.log("Login status:", loginResponse.status);
      const loginData = await loginResponse.json();
      console.log("Login response:", loginData);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

simpleTest();
