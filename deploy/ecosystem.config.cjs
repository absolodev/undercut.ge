const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const appEnv = loadEnvFile("/opt/undercut/.env");

module.exports = {
  apps: [
    {
      name: "undercut-web",
      cwd: "/opt/undercut/app/apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        ...appEnv,
      },
      autorestart: true,
      max_memory_restart: "1G",
    },
    {
      name: "undercut-ws",
      cwd: "/opt/undercut/app/services/ws-server",
      script: "dist/index.js",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        WS_PORT: 3001,
        REDIS_URL: appEnv.REDIS_URL || "redis://127.0.0.1:6379",
        MOCK: appEnv.MOCK || "false",
        ...appEnv,
      },
      autorestart: true,
      max_memory_restart: "512M",
    },
  ],
};
