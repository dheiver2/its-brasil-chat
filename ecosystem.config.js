// PM2 — mantém o app rodando como serviço (auto-restart, logs, boot).
// Uso no Windows Server:
//   npm install -g pm2
//   npm run build
//   pm2 start ecosystem.config.js
//   pm2 save
//   (para iniciar no boot do Windows, use pm2-installer ou NSSM — ver DEPLOY-WINDOWS.md)
module.exports = {
  apps: [
    {
      name: "its-brasil-chat",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
