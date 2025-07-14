module.exports = {
  apps: [
    {
      name: 'youtube-sentiment-server',
      script: 'server/index.ts',
      interpreter: 'node',
      interpreter_args: '--loader ts-node/esm',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
      log_file: './logs/server-combined.log',
      time: true
    },
    {
      name: 'sentiment-analysis-service',
      script: 'sentiment_service/main.py',
      interpreter: 'python',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        PYTHONPATH: './sentiment_service'
      },
      error_file: './logs/sentiment-error.log',
      out_file: './logs/sentiment-out.log',
      log_file: './logs/sentiment-combined.log',
      time: true
    }
  ],

  deploy: {
    production: {
      user: 'node',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/yt_cmnt_sentiment.git',
      path: '/var/www/production',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
}; 