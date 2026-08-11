import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getServerAppUrl } from "@/lib/app-url";
import {
  generateVendorManualCode,
  hashVendorToken,
  mintVendorToken,
  vendorTokenFromNonce,
  verifyVendorTokenSignature,
  buildVendorPassUrl,
} from "@/lib/qr-hub/vendor-token";
import { VENDOR_PRINT_ROLES } from "@/lib/qr-hub/types";
import type { SharedAccessScanResult, SharedAccessPassStatus } from "@prisma/client";

const DEFAULT_VARIANT_KEYS = [
  "dj",
  "mc",
  "security",
  "caterer",
  "celeventic_team",
  "photographer",
  "event_organiser",
];

export class SharedVendorAccessService {
  async getActive(eventId: string) {
    return prisma.sharedEventAccessPass.findFirst({
      where: { eventId, type: "VENDOR_GENERAL", status: { in: ["ACTIVE", "PAUSED"] } },
      orderBy: { tokenVersion: "desc" },
      include: { variants: { orderBy: { sortOrder: "asc" } } },
    });
  }

  /**
   * Ensure one active shared vendor credential. Returns the raw token only on
   * create/regenerate — never persisted.
   */
  async ensure(
    eventId: string,
    options: { createdById?: string | null; regenerate?: boolean } = {}
  ): Promise<{
    pass: Awaited<ReturnType<SharedVendorAccessService["getActive"]>>;
    rawToken: string | null;
    warning: string;
  }> {
    const existing = await this.getActive(eventId);
    if (existing && !options.regenerate) {
      return {
        pass: existing,
        rawToken: null,
        warning:
          "All vendor badge variants use the same shared event credential. Revoking or regenerating it will affect every printed vendor pass.",
      };
    }

    if (existing && options.regenerate) {
      await prisma.sharedEventAccessPass.update({
        where: { id: existing.id },
        data: {
          status: "REISSUED",
          revokedAt: new Date(),
          revokedReason: "Regenerated",
        },
      });
    }

    const { nonce, token } = mintVendorToken();
    const nextVersion = (existing?.tokenVersion ?? 0) + 1;
    let manualCode = generateVendorManualCode(6);
    for (let i = 0; i < 12; i++) {
      const clash = await prisma.sharedEventAccessPass.findFirst({
        where: { eventId, manualCode },
        select: { id: true },
      });
      if (!clash) break;
      manualCode = generateVendorManualCode(6);
    }

    const pass = await prisma.sharedEventAccessPass.create({
      data: {
        eventId,
        type: "VENDOR_GENERAL",
        displayName: "Vendor Access",
        tokenHash: hashVendorToken(token),
        tokenNonce: nonce,
        tokenPrefix: "cvs1",
        tokenVersion: nextVersion,
        manualCode,
        codeLength: 6,
        status: "ACTIVE",
        reusable: true,
        createdById: options.createdById ?? undefined,
        variants: {
          create: DEFAULT_VARIANT_KEYS.map((key, index) => {
            const role = VENDOR_PRINT_ROLES.find((r) => r.key === key)!;
            return {
              roleKey: role.key,
              roleHeading: role.heading,
              sortOrder: index,
            };
          }),
        },
      },
      include: { variants: { orderBy: { sortOrder: "asc" } } },
    });

    await createAuditLog({
      userId: options.createdById ?? undefined,
      action: "CREATE",
      entity: "shared_event_access_pass",
      entityId: pass.id,
      details: {
        eventId,
        tokenVersion: pass.tokenVersion,
        regenerated: Boolean(options.regenerate),
      },
    });

    return {
      pass,
      rawToken: token,
      warning:
        "All vendor badge variants use the same shared event credential. Revoking or regenerating it will affect every printed vendor pass.",
    };
  }

  async revoke(eventId: string, actorId: string, reason?: string) {
    const pass = await this.getActive(eventId);
    if (!pass) throw new Error("No active vendor access pass");
    const updated = await prisma.sharedEventAccessPass.update({
      where: { id: pass.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedReason: reason?.trim() || "Revoked by organiser",
      },
      include: { variants: true },
    });
    await createAuditLog({
      userId: actorId,
      action: "UPDATE",
      entity: "shared_event_access_pass",
      entityId: pass.id,
      details: { eventId, event: "revoked", reason },
    });
    return updated;
  }

  /** Re-derive token for QR rendering from stored nonce (signature only). */
  revealToken(pass: { tokenNonce: string; status: SharedAccessPassStatus }): string | null {
    if (!["ACTIVE", "PAUSED"].includes(pass.status)) return null;
    return vendorTokenFromNonce(pass.tokenNonce);
  }

  async toHubView(eventId: string) {
    const ensured = await this.ensure(eventId);
    const pass = ensured.pass!;
    const token = this.revealToken(pass);
    const baseUrl = await getServerAppUrl();
    const url = token ? buildVendorPassUrl(token, baseUrl) : null;
    return {
      id: pass.id,
      status: pass.status,
      manualCode: pass.manualCode,
      codeLength: pass.codeLength,
      tokenVersion: pass.tokenVersion,
      reusable: pass.reusable,
      validFrom: pass.validFrom?.toISOString() ?? null,
      validUntil: pass.validUntil?.toISOString() ?? null,
      url,
      qrPreviewUrl: url
        ? `/api/qr/image?data=${encodeURIComponent(url)}&eventId=${encodeURIComponent(eventId)}&size=512&mode=pass`
        : null,
      variants: pass.variants.map((v) => ({
        id: v.id,
        roleKey: v.roleKey,
        roleHeading: v.roleHeading,
        companyName: v.companyName,
        accentColor: v.accentColor,
        instructions: v.instructions,
      })),
      warning: ensured.warning,
      rawTokenOnce: ensured.rawToken,
    };
  }

  async verifyAndScan(input: {
    eventId: string;
    token?: string | null;
    code?: string | null;
    scannedById?: string | null;
    gate?: string | null;
    deviceInfo?: string | null;
    operatorRoleNote?: string | null;
    vendorLabel?: string | null;
    offline?: boolean;
    clientRecordId?: string | null;
  }) {
    let pass =
      input.token && verifyVendorTokenSignature(input.token)
        ? await prisma.sharedEventAccessPass.findUnique({
            where: { tokenHash: hashVendorToken(input.token) },
          })
        : null;

    if (!pass && input.code) {
      const code = input.code.replace(/\D/g, "");
      pass = await prisma.sharedEventAccessPass.findFirst({
        where: { eventId: input.eventId, manualCode: code },
      });
    }

    const result = this.evaluate(pass, input.eventId, input.gate);
    if (pass) {
      try {
        await prisma.sharedAccessPassScan.create({
          data: {
            passId: pass.id,
            eventId: input.eventId,
            result,
            scannedById: input.scannedById ?? undefined,
            gate: input.gate ?? undefined,
            deviceInfo: input.deviceInfo ?? undefined,
            operatorRoleNote: input.operatorRoleNote ?? undefined,
            vendorLabel: input.vendorLabel ?? undefined,
            offline: Boolean(input.offline),
            clientRecordId: input.clientRecordId ?? undefined,
          },
        });
      } catch {
        // Unique clientRecordId on offline replay — ignore.
      }
    }

    const event = await prisma.event.findUnique({
      where: { id: input.eventId },
      select: { title: true },
    });

    return {
      result,
      valid: result === "VALID",
      message:
        result === "VALID"
          ? `Shared vendor access is active for ${event?.title ?? "this event"}.`
          : this.messageFor(result),
      eventTitle: event?.title ?? null,
      credentialStatus: pass?.status ?? null,
      validFrom: pass?.validFrom?.toISOString() ?? null,
      validUntil: pass?.validUntil?.toISOString() ?? null,
      reusable: pass?.reusable ?? true,
      operatorRoleNote: input.operatorRoleNote ?? null,
      scannedAt: new Date().toISOString(),
      // Role heading is operator note only — never cryptographic proof.
      roleVerified: false,
    };
  }

  private evaluate(
    pass: {
      eventId: string;
      status: SharedAccessPassStatus;
      validFrom: Date | null;
      validUntil: Date | null;
      allowedGates: unknown;
    } | null,
    eventId: string,
    gate?: string | null
  ): SharedAccessScanResult {
    if (!pass) return "INVALID_CODE";
    if (pass.eventId !== eventId) return "WRONG_EVENT";
    if (pass.status === "REVOKED" || pass.status === "REISSUED") return "REVOKED";
    if (pass.status === "PAUSED") return "PAUSED";
    if (pass.status === "EXPIRED") return "EXPIRED";
    const now = Date.now();
    if (pass.validFrom && pass.validFrom.getTime() > now) return "OUTSIDE_ACCESS_WINDOW";
    if (pass.validUntil && pass.validUntil.getTime() < now) return "OUTSIDE_ACCESS_WINDOW";
    const gates = Array.isArray(pass.allowedGates) ? (pass.allowedGates as string[]) : [];
    if (gates.length > 0 && gate && !gates.includes(gate)) return "GATE_NOT_ALLOWED";
    return "VALID";
  }

  private messageFor(result: SharedAccessScanResult): string {
    switch (result) {
      case "EXPIRED":
        return "This vendor access pass has expired.";
      case "REVOKED":
        return "This vendor access pass has been revoked.";
      case "WRONG_EVENT":
        return "This pass belongs to a different event.";
      case "OUTSIDE_ACCESS_WINDOW":
        return "Vendor access is outside its valid window.";
      case "GATE_NOT_ALLOWED":
        return "This pass is not allowed at this gate.";
      case "PAUSED":
        return "Vendor access is temporarily paused.";
      case "RATE_LIMITED":
        return "Too many attempts. Please wait and try again.";
      default:
        return "Invalid vendor access code.";
    }
  }

  /** Safe offline verification slice — hashes/codes only, never raw tokens. */
  async offlineSlice(eventId: string) {
    const pass = await this.getActive(eventId);
    if (!pass || pass.status !== "ACTIVE") return null;
    return {
      id: pass.id,
      h: pass.tokenHash,
      c: pass.manualCode,
      v: pass.tokenVersion,
      status: pass.status,
      reusable: pass.reusable,
      validFrom: pass.validFrom?.toISOString() ?? null,
      validUntil: pass.validUntil?.toISOString() ?? null,
      allowedGates: pass.allowedGates ?? [],
    };
  }
}

export const sharedVendorAccessService = new SharedVendorAccessService();
