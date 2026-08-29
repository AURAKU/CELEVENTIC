"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { GalleryUploadPanel } from "@/components/media/gallery-upload-panel";
import { VideoUploader, type UploadedVideoResult } from "@/components/media/video-uploader";
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
  orderId,
  galleryUrls,
  onGalleryChange,
  storeFilmUrl,
  storePosterUrl,
  onStoreFilm,
  onClearStoreFilm,
}: {
  value?: LuxuryFashionHouseConfig;
  viralFooterEnabled?: boolean;
  onChange: (next: LuxuryFashionHouseConfig) => void;
  onViralFooterChange?: (enabled: boolean) => void;
  orderId?: string;
  galleryUrls?: string[];
  onGalleryChange?: (urls: string[]) => void;
  storeFilmUrl?: string | null;
  storePosterUrl?: string | null;
  onStoreFilm?: (input: { url: string; posterUrl?: string | null }) => void;
  onClearStoreFilm?: () => void;
}) {
  const house = mergeFashionHouse(LUXURY_FASHION_HOUSE_DEFAULTS, value);
  const [uploadError, setUploadError] = useState("");

  function patch(partial: Partial<LuxuryFashionHouseConfig>) {
    onChange(mergeFashionHouse(house, partial));
  }

  function onFilmUploaded(result: UploadedVideoResult) {
    if (!result.processedMp4Url) return;
    onStoreFilm?.({ url: result.processedMp4Url, posterUrl: result.posterUrl });
    if (!onStoreFilm) {
      patch({ filmUrl: result.processedMp4Url, filmPosterUrl: result.posterUrl ?? house.filmPosterUrl });
    }
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
      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800/80 pt-1">
        The first look
      </p>
      <p className="text-[11px] text-slate-500">
        Upload the store film, stills, and collection looks here. Saves to this live invitation
        for the organizer and admin. Guests see the new files on their unique link after save.
      </p>
      <div className="grid gap-2">
        <Label>Film heading</Label>
        <Input
          value={house.filmChapterTitle ?? ""}
          onChange={(e) => patch({ filmChapterTitle: e.target.value })}
          placeholder="The first look"
        />
      </div>
      <div className="grid gap-2">
        <Label>Film line</Label>
        <Input
          value={house.filmChapterLede ?? ""}
          onChange={(e) => patch({ filmChapterLede: e.target.value })}
          placeholder="Experience the house"
        />
      </div>
      <VideoUploader
        category="INVITATION_BACKGROUND"
        orderId={orderId}
        role="hero"
        buttonLabel={storeFilmUrl || house.filmUrl ? "Replace store preview video" : "Upload store preview video"}
        hint="MP4, MOV, or phone clip. Plays in full on Store Preview on the live invitation."
        previewUrl={storeFilmUrl ?? house.filmUrl}
        onClear={onClearStoreFilm}
        onUploaded={onFilmUploaded}
        onError={setUploadError}
      />
      <ImageUploadCropper
        label="Store preview still"
        buttonLabel={storePosterUrl || house.filmPosterUrl ? "Replace film still" : "Upload film still"}
        hint="Poster shown before the film plays."
        defaultAspect="free"
        extraFormFields={{ role: "poster", buildMode: "template" }}
        previewUrl={storePosterUrl ?? house.filmPosterUrl}
        onUploaded={(r) => {
          patch({ filmPosterUrl: r.url });
        }}
        onError={setUploadError}
      />
      <ImageUploadCropper
        label="House logo"
        buttonLabel={house.logoUrl ? "Replace logo" : "Upload logo"}
        hint="Crest on the whisper, envelope, and invitation."
        defaultAspect="free"
        extraFormFields={{ role: "logo", buildMode: "template" }}
        previewUrl={house.logoUrl}
        onUploaded={(r) => patch({ logoUrl: r.url })}
        onClear={() => patch({ logoUrl: null })}
        onError={setUploadError}
      />
      <ImageUploadCropper
        label="Invitation card photo"
        buttonLabel={house.flyerCardUrl ? "Replace invitation card" : "Upload invitation card"}
        hint="Physical card photo under Step inside."
        defaultAspect="free"
        extraFormFields={{ role: "flyer", buildMode: "template" }}
        previewUrl={house.flyerCardUrl}
        onUploaded={(r) => patch({ flyerCardUrl: r.url })}
        onClear={() => patch({ flyerCardUrl: null })}
        onError={setUploadError}
      />
      {onGalleryChange ? (
        <GalleryUploadPanel
          urls={galleryUrls ?? []}
          onChange={onGalleryChange}
          orderId={orderId}
          title="Collection looks"
          description="Replaces the bundled looks on the live invitation. Photos appear in View Collection and the vision store."
          extraFormFields={{ role: "gallery", buildMode: "template" }}
        />
      ) : null}
      {uploadError ? <p className="text-[11px] text-red-600">{uploadError}</p> : null}
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
        <Label>Share preview image URL</Label>
        <Input
          value={house.shareOgImageUrl ?? ""}
          onChange={(e) => patch({ shareOgImageUrl: e.target.value || null })}
          placeholder="/templates/femmora/share-placecard.jpg"
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
        <Label>RSVP lede</Label>
        <Input value={house.rsvpLede ?? ""} onChange={(e) => patch({ rsvpLede: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>Guest wishes heading</Label>
        <Input
          value={house.wishesTitle ?? ""}
          onChange={(e) => patch({ wishesTitle: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Guest wishes empty line</Label>
        <Input
          value={house.wishesEmpty ?? ""}
          onChange={(e) => patch({ wishesEmpty: e.target.value })}
        />
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
          value={house.openingStyle === "folio-silk" ? "card-envelope" : house.openingStyle ?? "card-envelope"}
          onChange={(e) => patch({ openingStyle: e.target.value as FashionOpeningStyle })}
        >
          <option value="card-envelope">Card envelope</option>
          <option value="silk-only">Silk only</option>
          <option value="portal-only">Portal only</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label>Envelope face line</Label>
        <Input
          value={house.envelopeFaceLine ?? house.folioFaceLine ?? ""}
          onChange={(e) => patch({ envelopeFaceLine: e.target.value, folioFaceLine: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Card CTA</Label>
        <Input
          value={house.cardCtaLabel ?? ""}
          onChange={(e) => patch({ cardCtaLabel: e.target.value })}
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
        <Label>Lookbook kicker</Label>
        <Input
          value={house.lookbookKicker ?? ""}
          onChange={(e) => patch({ lookbookKicker: e.target.value })}
          placeholder="First looks"
        />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800/80 pt-1">
        Vision store
      </p>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="mt-1"
          checked={house.visionStoreEnabled === true}
          onChange={(e) => patch({ visionStoreEnabled: e.target.checked })}
        />
        <span>Show iPhone vision-store teaser in Enter Experience</span>
      </label>
      <div className="grid gap-2">
        <Label>Vision store kicker</Label>
        <Input
          value={house.visionStoreKicker ?? ""}
          onChange={(e) => patch({ visionStoreKicker: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Vision store title</Label>
        <Input
          value={house.visionStoreTitle ?? ""}
          onChange={(e) => patch({ visionStoreTitle: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Vision store line</Label>
        <Input
          value={house.visionStoreLine ?? ""}
          onChange={(e) => patch({ visionStoreLine: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Nationwide delivery line</Label>
        <Input
          value={house.visionStoreDeliveryLine ?? ""}
          onChange={(e) => patch({ visionStoreDeliveryLine: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Opening soon label</Label>
        <Input
          value={house.visionStoreSoonLabel ?? ""}
          onChange={(e) => patch({ visionStoreSoonLabel: e.target.value })}
        />
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
        <Label>TikTok handle</Label>
        <Input
          value={house.tiktokHandle ?? ""}
          placeholder="@atelier"
          onChange={(e) => {
            const tiktokHandle = e.target.value;
            const rest = (house.socialLinks ?? []).filter((link) => link.platform !== "tiktok");
            const hasTikTok = Boolean(tiktokHandle.trim() || house.tiktokUrl?.trim());
            patch({
              tiktokHandle,
              socialLinks: hasTikTok
                ? [
                    ...rest,
                    {
                      platform: "tiktok",
                      handle: tiktokHandle,
                      url: house.tiktokUrl,
                      enabled: true,
                    },
                  ]
                : rest,
            });
          }}
        />
      </div>
      <div className="grid gap-2">
        <Label>TikTok URL</Label>
        <Input
          value={house.tiktokUrl ?? ""}
          placeholder="https://www.tiktok.com/@atelier"
          onChange={(e) => {
            const tiktokUrl = e.target.value;
            const rest = (house.socialLinks ?? []).filter((link) => link.platform !== "tiktok");
            const hasTikTok = Boolean(house.tiktokHandle?.trim() || tiktokUrl.trim());
            patch({
              tiktokUrl,
              socialLinks: hasTikTok
                ? [
                    ...rest,
                    {
                      platform: "tiktok",
                      handle: house.tiktokHandle,
                      url: tiktokUrl,
                      enabled: true,
                    },
                  ]
                : rest,
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
        without a Follow button. Instagram and TikTok can be replaced here without touching other platforms.
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
        Video, logo, card photo, and collection looks upload here and in Assets. They save to
        this order and appear on the live guest link. Date, venue, and maps also follow Event
        details. Music uses the soundtrack picker.
      </p>
    </div>
  );
}
