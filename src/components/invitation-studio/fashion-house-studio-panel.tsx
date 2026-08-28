"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LUXURY_FASHION_HOUSE_DEFAULTS,
  mergeFashionHouse,
  type FashionOpeningStyle,
  type FashionSilkStyle,
  type LuxuryFashionHouseConfig,
} from "@/lib/experience/luxury-fashion";

export function FashionHouseStudioPanel({
  value,
  viralFooterEnabled = false,
  onChange,
  onViralFooterChange,
}: {
  value?: LuxuryFashionHouseConfig;
  viralFooterEnabled?: boolean;
  onChange: (next: LuxuryFashionHouseConfig) => void;
  onViralFooterChange?: (enabled: boolean) => void;
}) {
  const house = mergeFashionHouse(LUXURY_FASHION_HOUSE_DEFAULTS, value);

  function patch(partial: Partial<LuxuryFashionHouseConfig>) {
    onChange(mergeFashionHouse(house, partial));
  }

  return (
    <div className="space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800/80">
        Fashion house
      </p>
      <div className="grid gap-2">
        <Label>House name</Label>
        <Input value={house.houseName} onChange={(e) => patch({ houseName: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Monogram</Label>
        <Input value={house.monogram} maxLength={3} onChange={(e) => patch({ monogram: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Event title</Label>
        <Input value={house.eventTitle} onChange={(e) => patch({ eventTitle: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Opening copy</Label>
        <Input value={house.teaserLine} onChange={(e) => patch({ teaserLine: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Whisper line</Label>
        <Input value={house.whisperLine} onChange={(e) => patch({ whisperLine: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Whisper eyebrow</Label>
        <Input
          value={house.whisperEyebrow ?? ""}
          onChange={(e) => patch({ whisperEyebrow: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Whisper script</Label>
        <Input
          value={house.whisperScript ?? ""}
          onChange={(e) => patch({ whisperScript: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Logo URL</Label>
        <Input
          value={house.logoUrl ?? ""}
          onChange={(e) => patch({ logoUrl: e.target.value || null })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Mark style</Label>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={house.markVariant ?? "letter"}
          onChange={(e) => patch({ markVariant: e.target.value as "letter" | "botanical" })}
        >
          <option value="letter">Letter monogram</option>
          <option value="botanical">Botanical mark</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label>Invitation lede</Label>
        <Input value={house.hubLede} onChange={(e) => patch({ hubLede: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Unveiling CTA</Label>
        <Input value={house.unveilingLabel} onChange={(e) => patch({ unveilingLabel: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Portal welcome</Label>
        <Input value={house.portalWelcome} onChange={(e) => patch({ portalWelcome: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Portal prompt</Label>
        <Input value={house.portalPrompt} onChange={(e) => patch({ portalPrompt: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Swipe hint</Label>
        <Input value={house.swipeHint} onChange={(e) => patch({ swipeHint: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>RSVP heading</Label>
        <Input value={house.rsvpHeading} onChange={(e) => patch({ rsvpHeading: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>RSVP yes label</Label>
        <Input value={house.rsvpAcceptedLabel} onChange={(e) => patch({ rsvpAcceptedLabel: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Dates label</Label>
        <Input value={house.datesLabel} onChange={(e) => patch({ datesLabel: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Hours label</Label>
        <Input value={house.hoursLabel} onChange={(e) => patch({ hoursLabel: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Location name</Label>
        <Input value={house.locationName} onChange={(e) => patch({ locationName: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Address</Label>
        <Input value={house.address} onChange={(e) => patch({ address: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Google Maps URL</Label>
        <Input value={house.mapsUrl} onChange={(e) => patch({ mapsUrl: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Countdown before</Label>
        <Input value={house.countdownBeforeLabel} onChange={(e) => patch({ countdownBeforeLabel: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Countdown after</Label>
        <Input value={house.countdownAfterLabel} onChange={(e) => patch({ countdownAfterLabel: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Countdown ended</Label>
        <Input
          value={house.countdownEndedLabel ?? ""}
          onChange={(e) => patch({ countdownEndedLabel: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Opening style</Label>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={house.openingStyle ?? "folio-silk"}
          onChange={(e) => patch({ openingStyle: e.target.value as FashionOpeningStyle })}
        >
          <option value="folio-silk">Folio + silk</option>
          <option value="silk-only">Silk only</option>
          <option value="portal-only">Portal only</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label>Folio face line</Label>
        <Input
          value={house.folioFaceLine ?? ""}
          onChange={(e) => patch({ folioFaceLine: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Place teaser</Label>
        <Input
          value={house.teaserPlaceLine ?? ""}
          onChange={(e) => patch({ teaserPlaceLine: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Date teaser</Label>
        <Input
          value={house.teaserDateLine ?? ""}
          onChange={(e) => patch({ teaserDateLine: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Teaser clip URL</Label>
        <Input
          value={house.teaserClipUrl ?? ""}
          onChange={(e) => patch({ teaserClipUrl: e.target.value || null })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Teaser poster URL</Label>
        <Input
          value={house.teaserPosterUrl ?? ""}
          onChange={(e) => patch({ teaserPosterUrl: e.target.value || null })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Maps CTA</Label>
        <Input
          value={house.mapsCtaLabel ?? ""}
          onChange={(e) => patch({ mapsCtaLabel: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Silk reveal style</Label>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={house.silkStyle}
          onChange={(e) => patch({ silkStyle: e.target.value as FashionSilkStyle })}
        >
          <option value="ivory-champagne">Ivory champagne</option>
          <option value="pearl-mocha">Pearl mocha</option>
          <option value="espresso-gold">Espresso gold</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label>Film CTA</Label>
        <Input value={house.filmCta} onChange={(e) => patch({ filmCta: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Continue label</Label>
        <Input value={house.filmSkipLabel} onChange={(e) => patch({ filmSkipLabel: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Lookbook title</Label>
        <Input value={house.lookbookTitle} onChange={(e) => patch({ lookbookTitle: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Finale kicker</Label>
        <Input value={house.finaleKicker} onChange={(e) => patch({ finaleKicker: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Final message</Label>
        <Textarea rows={3} value={house.finaleMessage} onChange={(e) => patch({ finaleMessage: e.target.value })} />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800/80 pt-1">
        Social
      </p>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="mt-1"
          checked={house.showSocialSection === true}
          onChange={(e) => patch({ showSocialSection: e.target.checked })}
        />
        <span>Show social section</span>
      </label>
      <div className="grid gap-2">
        <Label>Instagram handle</Label>
        <Input
          value={house.instagramHandle ?? ""}
          placeholder="@atelier"
          onChange={(e) => {
            const instagramHandle = e.target.value;
            const rest = (house.socialLinks ?? []).filter((link) => link.platform !== "instagram");
            patch({
              instagramHandle,
              socialLinks: [
                {
                  platform: "instagram",
                  handle: instagramHandle,
                  url: house.instagramUrl,
                  enabled: true,
                  ctaLabel: house.socialCtaLabel,
                },
                ...rest,
              ],
            });
          }}
        />
      </div>
      <div className="grid gap-2">
        <Label>Instagram URL</Label>
        <Input
          value={house.instagramUrl ?? ""}
          placeholder="https://www.instagram.com/atelier/"
          onChange={(e) => {
            const instagramUrl = e.target.value;
            const rest = (house.socialLinks ?? []).filter((link) => link.platform !== "instagram");
            patch({
              instagramUrl,
              socialLinks: [
                {
                  platform: "instagram",
                  handle: house.instagramHandle,
                  url: instagramUrl,
                  enabled: true,
                  ctaLabel: house.socialCtaLabel,
                },
                ...rest,
              ],
            });
          }}
        />
      </div>
      <div className="grid gap-2">
        <Label>Social intro text</Label>
        <Input
          value={house.socialIntroText ?? ""}
          onChange={(e) => patch({ socialIntroText: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Social title</Label>
        <Input
          value={house.socialTitle ?? ""}
          placeholder="Stay Connected"
          onChange={(e) => patch({ socialTitle: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Instagram button label</Label>
        <Input
          value={house.socialCtaLabel ?? ""}
          placeholder="Follow on Instagram"
          onChange={(e) => patch({ socialCtaLabel: e.target.value })}
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="mt-1"
          checked={house.showSocialIconsInFinale === true}
          onChange={(e) => patch({ showSocialIconsInFinale: e.target.checked })}
        />
        <span>Show social icons on the finale</span>
      </label>
      <p className="text-[11px] text-slate-500">
        Only enabled social links appear on the invitation. Leave the URL empty to show a handle
        without a Follow button. Additional platforms can be added later through socialLinks.
      </p>
      {onViralFooterChange ? (
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-1"
            checked={viralFooterEnabled}
            onChange={(e) => onViralFooterChange(e.target.checked)}
          />
          <span>
            Show “Create your own invitation with Celeventic” on the closing page.
            Off by default for luxury fashion openings so the finale stays brand-led.
          </span>
        </label>
      ) : null}
      <p className="text-[11px] text-slate-500">
        Store film and lookbook use Studio Media (hero video, poster, gallery). Empty media
        removes those chapters. Maps, RSVP and countdown follow the same invitation feature
        flags as every other Celeventic template. Music uses the existing soundtrack picker.
      </p>
    </div>
  );
}
