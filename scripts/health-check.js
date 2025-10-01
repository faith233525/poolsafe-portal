// Lightweight Node health check to avoid PowerShell one-liner issues
const http = require("http");
const https = require("https");

const url = process.argv[2] || "http://127.0.0.1:4000/api/health";
const client = url.startsWith("https") ? https : http;

const req = client.get(url, (res) => {
  let buf = "";
  res.on("data", (chunk) => (buf += chunk));
  res.on("end", () => {
    console.log("STATUS", res.statusCode);
    console.log("BODY", buf);
    process.exit(res.statusCode === 200 ? 0 : 1);
  });
});

req.on("error", (err) => {
  console.error("ERROR", err.message);
  process.exit(1);
});
