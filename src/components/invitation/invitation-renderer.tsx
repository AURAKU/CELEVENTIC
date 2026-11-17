"use client";

import { ManualGateCodeReveal } from "@/components/qr/manual-gate-code-reveal";
import { GuestEntryPass } from "@/components/admission/guest-entry-pass";
import { PartyAdmissionSwitch } from "@/components/admission/party-admission-switch";
import { PlaceCard } from "@/components/invitation/place-card";
import { ClientErrorBoundary } from "@/components/ui/client-error-boundary";
import { isAureliaEditorialLayout } from "@/lib/experience/aurelia-editorial";
import { resolveLayoutVersion } from "@/lib/invitation/layout-version";
import {
  getExperience3Layout,
  resolveInvitationLayoutBranch,
} from "@/lib/invitation/studio3/experience-registry";
import { Experience3Fallback } from "@/components/invitation/experience3-fallback";
import { LegacyInvitationLayout } from "@/components/invitation/legacy-invitation-layout";
import { InvitationMediaProvider } from "./invitation-media-context";
import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";

export type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";

function resolveInvitationLayoutContent(props: InvitationRendererProps) {
  const branch = resolveInvitationLayoutBranch(props.design);

  if (branch.mode === "legacy") {
    return <LegacyInvitationLayout {...props} />;
  }

  const Experience3Layout = getExperience3Layout(props.design.layout, branch.version);
  if (Experience3Layout) {
    return <Experience3Layout {...props} />;
  }

  return (
    <Experience3Fallback
      layout={props.design.layout}
      layoutVersion={resolveLayoutVersion(props.design)}
    />
  );
}

export function InvitationRenderer({ interactiveMedia = false, ...props }: InvitationRendererProps) {
  const renderProps = { ...props, interactiveMedia };
  const templatePlacesCardAfterHero =
    props.design.layout === "traditional-marriage-ceremony" ||
    props.design.layout === "forever-afaris-wedding";
  const templateOmitsSharedPlaceCard = isAureliaEditorialLayout(props.design.layout);
  const content = resolveInvitationLayoutContent(renderProps);

  return (
    <div className="invitation-copy-root">
      {/* Template-level isolation, a broken layout/media config must degrade to a
          friendly message instead of crashing the whole guest-facing page. */}
      <ClientErrorBoundary
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center px-4 py-16 text-center text-sm text-slate-500">
            This invitation couldn&apos;t be displayed right now. Please refresh the page.
          </div>
        }
      >
        <InvitationMediaProvider interactive={interactiveMedia}>{content}</InvitationMediaProvider>
      </ClientErrorBoundary>
      {/* Templates with a defined hero boundary mount this immediately below
          that hero. Other layouts retain the safe pre-entry-pass fallback. */}
      {props.placeCard && !templatePlacesCardAfterHero && !templateOmitsSharedPlaceCard && (
        <ClientErrorBoundary fallback={null}>
          <PlaceCard
            config={props.placeCard.config}
            recipient={props.placeCard.recipient}
            party={props.placeCard.party}
            seating={props.placeCard.seating}
            design={props.design}
          />
        </ClientErrorBoundary>
      )}
      {/* Event Access sits below Replay Opening (template closing) and above
          the entry-pass QR whenever this party has any admitted members. */}
      {props.partyAdmission &&
        props.partyAdmission.admittedCount > 0 &&
        props.invitation.uniqueLink && (
          <ClientErrorBoundary fallback={null}>
            <PartyAdmissionSwitch
              link={props.invitation.uniqueLink}
              companionHref={props.partyAdmission.companionHref}
              initialAdmittedCount={props.partyAdmission.admittedCount}
              initialAllowance={props.partyAdmission.allowance}
              initialState={props.partyAdmission.state}
              mode="invitation"
              placement="inline"
            />
          </ClientErrorBoundary>
        )}
      {/* Closing admission surface. GuestEntryPass and the portal Your Pass
          card already print the 4-digit code, so this compact copy only
          remains when nothing else will show it. */}
      {props.entryPass ? (
        <ClientErrorBoundary
          fallback={
            <div className="px-4 pb-8 text-center text-sm text-slate-500">
              Your entry pass couldn&apos;t be displayed. Refresh the page, or show this
              invitation at the entrance.
            </div>
          }
        >
          <GuestEntryPass
            token={props.entryPass.token}
            code={props.entryPass.code}
            displayName={props.entryPass.displayName}
            eventName={props.event.title}
            eventDate={props.event.startDate}
            venueName={props.event.venueName}
            status={props.entryPass.status}
            instructions={props.entryPass.instructions}
            allowDownload={props.entryPass.allowDownload}
            allowPrint={props.entryPass.allowPrint}
            layout={props.design.layout}
          />
        </ClientErrorBoundary>
      ) : props.admissionManualCode &&
        !props.admissionQrDataUrl &&
        !props.qrDataUrl &&
        !isAureliaEditorialLayout(props.design.layout) ? (
        <div className="px-4 pb-6 -mt-2">
          <ManualGateCodeReveal code={props.admissionManualCode} variant="invite" />
        </div>
      ) : null}
    </div>
  );
}
