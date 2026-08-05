import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { generateBrandedQrPng, generateBrandedQrSvg } from "@/lib/qr/branded-qr-generator";
import { createZipBufferFromFiles } from "@/lib/qr/zip-pack";
import { qrBrandingService } from "@/services/qr/qr-branding.service";
import { eventQrHubService } from "@/services/qr-hub/event-qr-hub.service";
import type { QrHubAssetKind } from "@/lib/qr-hub/types";
import { createAuditLog } from "@/lib/audit";
import type { QrExportSize } from "@/lib/qr/qr-constants";

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "event"
  );
}

export class EventQrPackService {
  async buildZip(input: {
    eventId: string;
    actorId: string;
    kinds: QrHubAssetKind[];
    format: "png" | "svg";
    size?: QrExportSize;
  }): Promise<{ buffer: Buffer; filename: string }> {
    const overview = await eventQrHubService.overview(input.eventId, input.actorId);
    const selected = overview.assets.filter((a) => input.kinds.includes(a.kind) && a.url);
    const slug = slugify(overview.event.title);
    const centerImage = await qrBrandingService.resolveCenterImageUrl(input.eventId);
    const logoSize = await qrBrandingService.resolveLogoSize(input.eventId);
    const size = input.size ?? 1024;
    const dir = await mkdtemp(join(tmpdir(), "cele-qr-pack-"));

    try {
      const files: string[] = [];
      for (const asset of selected) {
        if (!asset.url) continue;
        const name = `${slug}-${asset.kind.toLowerCase().replace(/_/g, "-")}`;
        if (input.format === "svg") {
          const svg = await generateBrandedQrSvg(asset.url, centerImage, size, "brand", logoSize);
          const path = join(dir, `${name}.svg`);
          await writeFile(path, svg);
          files.push(path);
        } else {
          const png = await generateBrandedQrPng(asset.url, centerImage, size, "brand", logoSize);
          const path = join(dir, `${name}.png`);
          await writeFile(path, png);
          files.push(path);
        }
      }

      const zipBuffer = await createZipBufferFromFiles(files);
      await createAuditLog({
        userId: input.actorId,
        action: "CREATE",
        entity: "event_qr_pack",
        entityId: input.eventId,
        details: { format: input.format, count: files.length, kinds: input.kinds },
      });

      return { buffer: zipBuffer, filename: `${slug}-ground-qr-pack-${input.format}.zip` };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  async buildPdf(input: {
    eventId: string;
    actorId: string;
    kinds: QrHubAssetKind[];
    perPage?: 1 | 2 | 4 | 6;
  }): Promise<{ buffer: Buffer; filename: string }> {
    const overview = await eventQrHubService.overview(input.eventId, input.actorId);
    const selected = overview.assets.filter((a) => input.kinds.includes(a.kind) && a.url);
    const slug = slugify(overview.event.title);
    const centerImage = await qrBrandingService.resolveCenterImageUrl(input.eventId);
    const logoSize = await qrBrandingService.resolveLogoSize(input.eventId);
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    const body = await pdf.embedFont(StandardFonts.Helvetica);
    const perPage = input.perPage ?? 2;
    const pageSize: [number, number] = [595.28, 841.89];
    let page = pdf.addPage(pageSize);
    let slot = 0;

    for (const asset of selected) {
      if (!asset.url) continue;
      const pngBytes = await generateBrandedQrPng(asset.url, centerImage, 1024, "brand", logoSize);
      const image = await pdf.embedPng(pngBytes);

      if (slot >= perPage) {
        page = pdf.addPage(pageSize);
        slot = 0;
      }

      const cols = perPage === 1 ? 1 : 2;
      const rows = Math.ceil(perPage / cols);
      const cellW = pageSize[0] / cols;
      const cellH = pageSize[1] / rows;
      const col = slot % cols;
      const row = Math.floor(slot / cols);
      const x = col * cellW + 36;
      const yTop = pageSize[1] - row * cellH - 36;

      page.drawText((asset.printHeading || asset.title).slice(0, 60), {
        x,
        y: yTop - 18,
        size: 14,
        font,
        color: rgb(0.05, 0.2, 0.2),
      });
      page.drawText((asset.printSupporting || asset.purpose).slice(0, 140), {
        x,
        y: yTop - 36,
        size: 9,
        font: body,
        color: rgb(0.25, 0.25, 0.25),
        maxWidth: cellW - 72,
      });

      const qrSize = Math.min(180, cellW - 72, cellH - 120);
      page.drawImage(image, {
        x: x + (cellW - 72 - qrSize) / 2,
        y: yTop - 50 - qrSize,
        width: qrSize,
        height: qrSize,
      });

      if (asset.printFooter) {
        page.drawText(asset.printFooter.slice(0, 80), {
          x,
          y: yTop - 60 - qrSize,
          size: 8,
          font: body,
          color: rgb(0.35, 0.35, 0.35),
          maxWidth: cellW - 72,
        });
      }

      slot += 1;
    }

    const bytes = await pdf.save();
    await createAuditLog({
      userId: input.actorId,
      action: "CREATE",
      entity: "event_qr_pack",
      entityId: input.eventId,
      details: { format: "pdf", count: selected.length, perPage },
    });

    return { buffer: Buffer.from(bytes), filename: `${slug}-ground-qr-pack.pdf` };
  }
}

export const eventQrPackService = new EventQrPackService();
