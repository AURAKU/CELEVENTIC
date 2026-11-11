import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  DEMO_CARD_SLUG,
  getDemoCardBySlug,
  isDemoCardSlug,
} from "@/lib/digital-business-card/demo-card";
import { resolveCeleYouPublicShare, toGuestPublicPayload } from "@/lib/digital-business-card/access";
import { celeCardGrantCookieName } from "@/lib/digital-business-card/privacy";
import { isCeleCardPhotoUrl } from "@/lib/digital-business-card/portraits";
import type { DigitalCardPublicPayload } from "@/lib/digital-business-card/types";
import {
  buildVCard,
  celeYouContactProfileUrl,
  vcardContentDisposition,
  vcardDelivery,
  vcardFileName,
  type VCardPhoto,
} from "@/lib/digital-business-card/vcard";
import { celeYouGuestOrigin, getServerAppUrl } from "@/lib/app-url";
import { readUploadFile } from "@/lib/uploads/file-storage";
import {
  getDigitalCardBySlug,
  recordSmartCardInteraction,
} from "@/services/digital-business-card/digital-business-card.service";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import { viewerMayOpenDummyLive } from "@/lib/digital-business-card/demo-live-access";
import { resolveCeleCardGrant } from "@/services/digital-business-card/celecard-access.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const card = await resolveGuestCard(slug);
  if (!card) {
    return new NextResponse("This CeleYou is not available.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const origin = celeYouGuestOrigin(await getServerAppUrl());
  const photo = await readVCardPhoto(card.avatarUrl);
  const vcf = buildVCard(card, {
    cardUrl: celeYouContactProfileUrl(card.slug, origin),
    photo,
  });
  const filename = vcardFileName(card);
  const agent = request.headers.get("user-agent") || "";
  const delivery = vcardDelivery(agent);
  const skipCount = new URL(request.url).searchParams.get("delivery") === "1";
  if (!skipCount && !isDemoCardSlug(slug)) {
    const live = await getDigitalCardBySlug(slug);
    const policy = await getCeleCardLifecyclePolicy();
    if (live && resolveCeleYouPublicShare({ card: live, channel: "vcard", policy }).recordOpen) {
      void recordSmartCardInteraction(live.id, "vcard_save", { surface: "vcf" }).catch(() => undefined);
    }
  }

  return new NextResponse(vcf, {
    status: 200,
    headers: {
      "Content-Type": delivery.contentType,
      "Content-Disposition": vcardContentDisposition(delivery.disposition, filename),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

async function resolveGuestCard(slug: string): Promise<DigitalCardPublicPayload | null> {
  const demoSlug = isDemoCardSlug(slug) && slug !== DEMO_CARD_SLUG ? DEMO_CARD_SLUG : slug;
  const demo = getDemoCardBySlug(demoSlug);
  if (demo) {
    if (!(await viewerMayOpenDummyLive())) return null;
    return demo;
  }

  const card = await getDigitalCardBySlug(slug);
  if (!card || card.deletedAt) return null;
  const policy = await getCeleCardLifecyclePolicy();
  const jar = await cookies();
  const grant = await resolveCeleCardGrant(card.id, jar.get(celeCardGrantCookieName(card.id))?.value);
  const payload = toGuestPublicPayload(card, grant?.itemKeys ?? [], policy);
  if (!payload.isLive) {
    const denied = resolveCeleYouPublicShare({ card, channel: "vcard", policy });
    void recordSmartCardInteraction(card.id, "vcard_denied", {
      surface: "vcf",
      reason: denied.reason,
    }).catch(() => undefined);
    return null;
  }
  return payload;
}

async function readVCardPhoto(avatarUrl?: string | null): Promise<VCardPhoto | null> {
  if (!isCeleCardPhotoUrl(avatarUrl) || !avatarUrl) return null;
  try {
    const buffer = await loadPhotoBytes(avatarUrl);
    if (!buffer || buffer.length < 32 || buffer.length > 1_500_000) return null;
    const jpeg = await sharp(buffer, { failOn: "error", animated: false })
      .rotate()
      .resize(480, 480, { fit: "cover" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return { type: "JPEG", base64: jpeg.toString("base64") };
  } catch {
    return null;
  }
}

async function loadPhotoBytes(avatarUrl: string): Promise<Buffer | null> {
  const pathname = photoPathname(avatarUrl);
  if (!pathname || pathname.includes("..")) return null;

  if (pathname.startsWith("/uploads/") || pathname.startsWith("/api/uploads/")) {
    const relative = pathname.replace(/^\/api\/uploads\//, "").replace(/^\/uploads\//, "");
    return readUploadFile(relative);
  }

  if (pathname.startsWith("/digital-cards/")) {
    return readFile(path.join(process.cwd(), "public", pathname.replace(/^\//, "")));
  }

  if (/^https?:\/\//i.test(avatarUrl)) {
    const res = await fetch(avatarUrl, { cache: "no-store" });
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > 1_500_000) return null;
    return bytes;
  }

  return null;
}

function photoPathname(avatarUrl: string): string | null {
  try {
    if (/^https?:\/\//i.test(avatarUrl)) return new URL(avatarUrl).pathname;
  } catch {
    return null;
  }
  const pathOnly = avatarUrl.split("?")[0] || "";
  return pathOnly.startsWith("/") ? pathOnly : null;
}
