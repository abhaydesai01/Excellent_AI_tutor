module.exports = {
  apps: [
    {
      name: "excellent-api",
      script: "npx",
      args: "tsx server/index.ts",
      cwd: "/var/www/excellent-ai-tutor",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
    },
  ],
};
