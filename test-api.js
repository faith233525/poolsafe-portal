async function testAPI() {
  const url = process.argv[2] || "http://127.0.0.1:4000/api/health";
  console.log("Testing API:", url);
  try {
    if (typeof fetch === "function") {
      const res = await fetch(url);
      const text = await res.text();
      console.log("Status:", res.status);
      console.log("Body:", text);
      process.exit(res.ok ? 0 : 1);
    } else {
      const http = require(url.startsWith("https") ? "https" : "http");
      const req = http.get(url, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          console.log("Status:", res.statusCode);
          console.log("Body:", data);
          process.exit(res.statusCode === 200 ? 0 : 1);
        });
      });
      req.on("error", (err) => {
        console.error("API Test failed:", err.message);
        process.exit(1);
      });
    }
  } catch (error) {
    console.error("API Test failed:", error.message);
    process.exit(1);
  }
}

testAPI();
