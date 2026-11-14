import { NextResponse } from "next/server";
import { runSmartCardRenewalReminders } from "@/services/digital-business-card/smartcard-renewal.service";
import {
  expireCeleYouProTrials,
  runCeleYouTrialReminders,
} from "@/services/digital-business-card/trial.service";

function cronAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET || process.env.SMARTCARD_CRON_SECRET;
  const header = req.headers.get("authorization");
  const token = req.headers.get("x-cron-secret");
  if (secret) {
    return header === `Bearer ${secret}` || token === secret;
  }
  return process.env.NODE_ENV !== "production";
}

export async function POST(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const trialReminders = await runCeleYouTrialReminders();
  const expiredTrials = await expireCeleYouProTrials();
  const renewals = await runSmartCardRenewalReminders();
  return NextResponse.json({
    success: true,
    data: { ...renewals, expiredTrials, trialReminders },
  });
}

export async function GET(req: Request) {
  return POST(req);
}
