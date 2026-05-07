const path = require("node:path");
const apiDir = path.resolve(__dirname, "..", "apps", "api");

module.exports = {
  apps: [
    {
      name: "revise-plus-api",
      cwd: apiDir,
      script: "dist/src/server.js",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
