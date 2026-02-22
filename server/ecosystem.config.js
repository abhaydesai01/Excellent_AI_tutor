module.exports = {
  apps: [
    {
      name: "excellent-api",
      script: "npm",
      args: "start",
      cwd: "/var/www/excellent-ai-tutor/Excellent_AI_tutor",
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
