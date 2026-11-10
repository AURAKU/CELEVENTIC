/**
 * Durable CeleCard reminder runner. Invoke from crontab or PM2 cron_restart.
 * Does not start itself. Never treat a local interval as production scheduling.
 */
import { runSmartCardRenewalReminders } from "../src/services/digital-business-card/smartcard-renewal.service";

async function main() {
  const result = await runSmartCardRenewalReminders();
  console.log(JSON.stringify({ ok: true, timezone: "Africa/Accra", ...result }));
}

main().catch((error) => {
  console.error("[celecard.renewals]", error);
  process.exit(1);
});
