module.exports = {
  apps: [
    {
      name: "task-flow",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      cwd: "/home/user/task-flow",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Auto restart on failure
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      // Logging
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      // Memory limit - restart if exceeds
      max_memory_restart: "512M",
    },
  ],
};
