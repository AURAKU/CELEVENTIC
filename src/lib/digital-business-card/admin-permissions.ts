import { Permission, type RbacContext } from "@/lib/rbac/types";
import { hasPermission as roleHasPermission } from "@/lib/rbac/permissions";

export const CELECARD_ADMIN_PERMISSIONS = [
  Permission.CELECARD_VIEW,
  Permission.CELECARD_CREATE,
  Permission.CELECARD_EDIT,
  Permission.CELECARD_ACTIVATE,
  Permission.CELECARD_DEACTIVATE,
  Permission.CELECARD_SUSPEND,
  Permission.CELECARD_SUBSCRIPTION_MANAGE,
  Permission.CELECARD_GRANT_COMPLIMENTARY,
  Permission.CELECARD_PRICING_MANAGE,
  Permission.CELECARD_TEMPLATE_MANAGE,
  Permission.CELECARD_SUPPORT,
  Permission.CELECARD_AUDIT_VIEW,
] as const;

export type CeleCardAdminAction =
  | "activate"
  | "deactivate"
  | "reactivate"
  | "suspend"
  | "unsuspend"
  | "extend"
  | "change_plan"
  | "complimentary"
  | "promotional"
  | "manual"
  | "duplicate_design"
  | "send_invitation"
  | "save_draft"
  | "remind_renewal"
  | "nfc_register"
  | "nfc_pause"
  | "nfc_resume"
  | "nfc_lost"
  | "nfc_replace"
  | "nfc_revoke";

export const CELECARD_ACTION_PERMISSION: Record<CeleCardAdminAction, (typeof Permission)[keyof typeof Permission]> = {
  activate: Permission.CELECARD_ACTIVATE,
  deactivate: Permission.CELECARD_DEACTIVATE,
  reactivate: Permission.CELECARD_ACTIVATE,
  suspend: Permission.CELECARD_SUSPEND,
  unsuspend: Permission.CELECARD_SUSPEND,
  extend: Permission.CELECARD_SUBSCRIPTION_MANAGE,
  change_plan: Permission.CELECARD_SUBSCRIPTION_MANAGE,
  complimentary: Permission.CELECARD_GRANT_COMPLIMENTARY,
  promotional: Permission.CELECARD_GRANT_COMPLIMENTARY,
  manual: Permission.CELECARD_GRANT_COMPLIMENTARY,
  duplicate_design: Permission.CELECARD_EDIT,
  send_invitation: Permission.CELECARD_SUPPORT,
  save_draft: Permission.CELECARD_EDIT,
  remind_renewal: Permission.CELECARD_SUPPORT,
  nfc_register: Permission.CELECARD_EDIT,
  nfc_pause: Permission.CELECARD_EDIT,
  nfc_resume: Permission.CELECARD_EDIT,
  nfc_lost: Permission.CELECARD_EDIT,
  nfc_replace: Permission.CELECARD_EDIT,
  nfc_revoke: Permission.CELECARD_EDIT,
};

export const CELECARD_BULK_ENABLED_ACTIONS = ["preview", "invite", "notify", "assign_template"] as const;
export type CeleCardBulkAction = (typeof CELECARD_BULK_ENABLED_ACTIONS)[number] | "complimentary" | "activate" | "deactivate";

export function canPerformCeleCardAction(ctx: RbacContext, action: CeleCardAdminAction): boolean {
  return roleHasPermission(ctx, CELECARD_ACTION_PERMISSION[action]);
}

export function canGrantComplimentary(ctx: RbacContext): boolean {
  return roleHasPermission(ctx, Permission.CELECARD_GRANT_COMPLIMENTARY);
}

export function bulkActionIsEnabled(action: string): boolean {
  return (CELECARD_BULK_ENABLED_ACTIONS as readonly string[]).includes(action);
}
