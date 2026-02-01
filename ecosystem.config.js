// PM2 Ecosystem Configuration for SendBandit Local Development
// Start all services: pm2 start ecosystem.config.js
// Stop all services: pm2 stop all
// View logs: pm2 logs
// Monitor: pm2 monit

module.exports = {
  apps: [
    // ============ API Workers ============
    {
      name: 'api-auth',
      cwd: './services/api-auth',
      script: 'npx',
      args: 'wrangler dev --port 8787 --local',
      env: {
        NODE_ENV: 'development',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'api-clients',
      cwd: './services/api-clients',
      script: 'npx',
      args: 'wrangler dev --port 8788 --local',
      env: {
        NODE_ENV: 'development',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'api-templates',
      cwd: './services/api-templates',
      script: 'npx',
      args: 'wrangler dev --port 8789 --local',
      env: {
        NODE_ENV: 'development',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'api-campaigns',
      cwd: './services/api-campaigns',
      script: 'npx',
      args: 'wrangler dev --port 8790 --local',
      env: {
        NODE_ENV: 'development',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'api-analytics',
      cwd: './services/api-analytics',
      script: 'npx',
      args: 'wrangler dev --port 8791 --local',
      env: {
        NODE_ENV: 'development',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'api-billing',
      cwd: './services/api-billing',
      script: 'npx',
      args: 'wrangler dev --port 8792 --local',
      env: {
        NODE_ENV: 'development',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },

    // ============ Background Workers ============
    {
      name: 'scheduler',
      cwd: './services/scheduler',
      script: 'npx',
      args: 'wrangler dev --port 8793 --local',
      env: {
        NODE_ENV: 'development',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'queue-processor',
      cwd: './services/queue-processor',
      script: 'npx',
      args: 'wrangler dev --port 8794 --local',
      env: {
        NODE_ENV: 'development',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'webhooks',
      cwd: './services/webhooks',
      script: 'npx',
      args: 'wrangler dev --port 8795 --local',
      env: {
        NODE_ENV: 'development',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'realtime',
      cwd: './services/realtime',
      script: 'npx',
      args: 'wrangler dev --port 8796 --local',
      env: {
        NODE_ENV: 'development',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },

    // ============ Frontend ============
    {
      name: 'web',
      cwd: './apps/web',
      script: 'npx',
      args: 'next dev --port 3000',
      env: {
        NODE_ENV: 'development',
        NEXT_PUBLIC_API_URL: 'https://api.sendbandit.local',
        NODE_TLS_REJECT_UNAUTHORIZED: '0',
        NODE_EXTRA_CA_CERTS: '/Users/stefanjovic/Documents/workspace/sendbandit/.caddy-data/caddy/pki/authorities/local/root.crt',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },

    // ============ Caddy Reverse Proxy ============
    {
      name: 'sendbandit-caddy',
      cwd: './',
      script: 'caddy',
      args: 'run --config Caddyfile',
      env: {
        NODE_ENV: 'development',
        XDG_DATA_HOME: '/Users/stefanjovic/Documents/workspace/sendbandit/.caddy-data',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
  ],
}
