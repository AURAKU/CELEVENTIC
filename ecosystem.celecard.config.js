/**
 * Staging sidecar for CeleCard renewal reminders.
 * Do not start this from production ecosystem.config.js.
 * Do not run `pm2 restart all`.
 *
 *   pm2 start ecosystem.celecard.config.js --only celeventic-celecard-renewals
 *
 * Requires RESEND (or the configured mail adapter) and CRON_SECRET if the
 * HTTP route is used instead of this process.
 */
module.exports = {
  apps: [
    {
      name: "celeventic-celecard-renewals",
      cwd: __dirname,
      script: "npx",
      args: "tsx scripts/run-celecard-renewals.ts",
      instances: 1,
      exec_mode: "fork",
      cron_restart: "15 * * * *",
      autorestart: false,
      env: {
        NODE_ENV: "production",
        TZ: "Africa/Accra",
      },
      time: true,
    },
  ],
};
