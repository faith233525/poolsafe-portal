module.exports = {
  apps: [
    {
      name: "portal-api",
      script: "dist/src/index.js",
      exec_mode: "cluster",
      instances: process.env.PM2_API_INSTANCES ? parseInt(process.env.PM2_API_INSTANCES, 10) : 2,
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: process.env.PM2_API_MAX_MEM || "500M",
      watch: false,
    },
    {
      name: "email-worker",
      script: "dist/src/worker/emailWorker.js",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        EMAIL_WORKER_ENABLED: process.env.EMAIL_WORKER_ENABLED || "true",
      },
      watch: false,
      max_memory_restart: process.env.PM2_WORKER_MAX_MEM || "300M",
    },
  ],
};
