module.exports = {
  apps: [
    {
      name: 'ocorte-bot-api',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'ocorte-bot-worker',
      script: 'src/worker.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '2500M',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'ocorte-bot-scheduler',
      script: 'src/scheduler.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
