"use client";

import type { ResolvedGuestAction } from "@/lib/invitation/guest-portal-actions";
import { GuestPortalQuickActions } from "@/components/guest-portal/guest-portal-action-button";
import type { InvitationActionKey } from "@/lib/invitation/guest-portal-actions";

export interface InvitationFeatureDockProps {
  actions: ResolvedGuestAction[];
  accentColor?: string;
  loadingKey?: InvitationActionKey | null;
  onRun: (action: ResolvedGuestAction) => void;
  error?: string | null;
  compact?: boolean;
}

export function InvitationFeatureDock(props: InvitationFeatureDockProps) {
  return (
    <GuestPortalQuickActions
      actions={props.actions}
      accentColor={props.accentColor}
      variant="rail"
      compact={props.compact}
      loadingKey={props.loadingKey}
      onRun={props.onRun}
      error={props.error}
    />
  );
}
