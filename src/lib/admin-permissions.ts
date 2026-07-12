export {
  canAccessAdminPanel,
  canSwitchAdminView,
  canAssignUserRoles,
  canAssignAdminRole,
  assignableRolesFor,
  assertRoleAssignmentAllowed,
  isPlatformAdmin as isPlatformAdminRole,
  canModifyUser,
  assertUserModificationAllowed,
} from "@/lib/rbac/role-management";
