module.exports = {
  apps: [
    {
      name: "3bigha",
      cwd: "/var/www/3bigha-portal",
      script: "npm",
      args: "start",
      interpreter: "none",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      restart_delay: 3000,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
