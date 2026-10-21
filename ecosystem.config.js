// Konfigurasi PM2 untuk output standalone Next.js (server.js).
// Di Docker dijalankan lewat `pm2-runtime`.
module.exports = {
  apps: [
    {
      name: 'smartfarm-web',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
