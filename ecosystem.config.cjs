module.exports = {
  apps: [
    {
      name: 'webapp',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=webapp-production --local --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
