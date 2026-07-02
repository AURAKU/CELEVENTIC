"use client";

import type { ResolvedGuestAction } from "@/lib/invitation/guest-portal-actions";
import { GuestPortalQuickActions } from "@/components/guest-portal/guest-portal-action-button";
import type { InvitationActionKey } from "@/lib/invitation/guest-portal-actions";

export interface InviteQuickChipsProps {
  actions: ResolvedGuestAction[];
  loadingKey?: InvitationActionKey | null;
  onRun: (action: ResolvedGuestAction) => void;
  error?: string | null;
  compact?: boolean;
}

export function InviteQuickChips(props: InviteQuickChipsProps) {
  return (
    <GuestPortalQuickActions
      actions={props.actions}
      variant="rail"
      compact={props.compact}
      loadingKey={props.loadingKey}
      onRun={props.onRun}
      error={props.error}
    />
  );
}
