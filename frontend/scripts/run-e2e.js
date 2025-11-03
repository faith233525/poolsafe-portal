/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
// A Windows-friendly E2E runner that avoids start-server-and-test (wmic.exe issues)
// - Builds the app
// - Starts Vite preview on strict port
// - Polls until it's up
// - Runs Cypress
// - Cleans up server process

const { spawn, exec } = require("child_process");
const http = require("http");

function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) resolve(undefined);
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on("error", reject);
        req.end();
      });
      return;
    } catch {
      await wait(500);
    }
  }
  throw new Error(`Server did not start at ${url} within ${timeoutMs}ms`);
}

async function run() {
  // Build app
  await new Promise((resolve, reject) => {
    const cmd = /^win/.test(process.platform) ? "npm run build" : "npm run build";
    exec(cmd, { cwd: process.cwd() }, (err, stdout, stderr) => {
      process.stdout.write(stdout || "");
      process.stderr.write(stderr || "");
      if (err) return reject(err);
      resolve();
    });
  });

  // Start preview
  const previewEnv = {
    ...process.env,
    VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || "http://localhost:4000",
  };
  const preview = spawn(
    /^win/.test(process.platform) ? "npm.cmd" : "npm",
    ["run", "preview", "--", "--port", "5173", "--strictPort"],
    { stdio: "inherit", shell: true, env: previewEnv },
  );

  try {
    // Wait for server
    await waitForServer("http://localhost:5173");
    // Run Cypress
    await new Promise((resolve, reject) => {
      const cmd = /^win/.test(process.platform)
        ? "npx cypress run --browser chrome --headless --config trashAssetsBeforeRuns=false"
        : "npx cypress run --browser chrome --headless --config trashAssetsBeforeRuns=false";
      const child = exec(cmd, { cwd: process.cwd() }, (err, stdout, stderr) => {
        process.stdout.write(stdout || "");
        process.stderr.write(stderr || "");
        if (err) return reject(err);
        resolve();
      });
      if (child.stdout) child.stdout.pipe(process.stdout);
      if (child.stderr) child.stderr.pipe(process.stderr);
    });
  } finally {
    // Cleanup preview
    if (preview && !preview.killed) {
      preview.kill();
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
