const express = require("express");
const app = express();
const PORT = 3001;

app.use(express.json());

app.get("/api/health", (req, res) => {
  console.log("Health check requested");
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`📊 Try: http://localhost:${PORT}/api/health`);
});

process.on("SIGINT", () => {
  console.log("\n🛑 Server shutting down...");
  process.exit(0);
});
