module.exports = {
  apps: [
    {
      name: 'seedy-discord-bot',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/discord-err.log',
      out_file: './logs/discord-out.log',
      log_file: './logs/discord-combined.log',
      time: true
    },
    {
      name: 'seedy-api-server',
      script: 'api/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        API_PORT: 3001
      },
      error_file: './logs/api-err.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true
    }
  ]
};

