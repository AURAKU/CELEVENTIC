/** Event-scoped permission keys — role mappings live in the database. */
export const EventPermissionKey = {
  VIEW_EVENT: "VIEW_EVENT",
  EDIT_EVENT: "EDIT_EVENT",
  MANAGE_COLLABORATORS: "MANAGE_COLLABORATORS",
  INVITE_COLLABORATORS: "INVITE_COLLABORATORS",
  EDIT_INVITATIONS: "EDIT_INVITATIONS",
  MANAGE_GUESTS: "MANAGE_GUESTS",
  MESSAGE_GUESTS: "MESSAGE_GUESTS",
  MANAGE_TICKETS: "MANAGE_TICKETS",
  SCAN_QR: "SCAN_QR",
  EDIT_SEATING: "EDIT_SEATING",
  MANAGE_FINANCES: "MANAGE_FINANCES",
  APPROVE_VENDORS: "APPROVE_VENDORS",
  UPLOAD_GALLERY: "UPLOAD_GALLERY",
  MANAGE_MEMORY_VAULT: "MANAGE_MEMORY_VAULT",
  EDIT_TIMELINE: "EDIT_TIMELINE",
  MANAGE_COMMUNICATIONS: "MANAGE_COMMUNICATIONS",
  VIEW_ANALYTICS: "VIEW_ANALYTICS",
  CREATE_TASKS: "CREATE_TASKS",
  MANAGE_TASKS: "MANAGE_TASKS",
  USE_TEAM_CHAT: "USE_TEAM_CHAT",
  VIEW_ACTIVITY: "VIEW_ACTIVITY",
} as const;

export type EventPermissionKey = (typeof EventPermissionKey)[keyof typeof EventPermissionKey];

export const ALL_EVENT_PERMISSION_KEYS = Object.values(EventPermissionKey);

export const EVENT_PERMISSION_META: Record<
  EventPermissionKey,
  { label: string; description: string; category: string }
> = {
  VIEW_EVENT: { label: "View event", description: "Access event workspace", category: "general" },
  EDIT_EVENT: { label: "Edit event", description: "Update event details", category: "general" },
  MANAGE_COLLABORATORS: { label: "Manage collaborators", description: "Add, remove, and edit roles", category: "team" },
  INVITE_COLLABORATORS: { label: "Invite collaborators", description: "Send collaboration invites", category: "team" },
  EDIT_INVITATIONS: { label: "Edit invitations", description: "Design and manage invitations", category: "design" },
  MANAGE_GUESTS: { label: "Manage guests", description: "Add and edit guest list", category: "guests" },
  MESSAGE_GUESTS: { label: "Message guests", description: "Send messages to guests", category: "guests" },
  MANAGE_TICKETS: { label: "Manage tickets", description: "Create and sell tickets", category: "commerce" },
  SCAN_QR: { label: "Scan QR", description: "Admission scanning", category: "admission" },
  EDIT_SEATING: { label: "Edit seating", description: "Manage seating plans", category: "guests" },
  MANAGE_FINANCES: { label: "Manage finances", description: "Wallet and expenses", category: "finance" },
  APPROVE_VENDORS: { label: "Approve vendors", description: "Vendor bookings and deliverables", category: "vendors" },
  UPLOAD_GALLERY: { label: "Upload gallery", description: "Event media uploads", category: "design" },
  MANAGE_MEMORY_VAULT: { label: "Manage Memory Vault", description: "Guest memory submissions", category: "memories" },
  EDIT_TIMELINE: { label: "Edit timeline", description: "Event schedule and milestones", category: "planning" },
  MANAGE_COMMUNICATIONS: { label: "Manage communications", description: "Campaigns and announcements", category: "communications" },
  VIEW_ANALYTICS: { label: "View analytics", description: "Reports and insights", category: "analytics" },
  CREATE_TASKS: { label: "Create tasks", description: "Create event tasks", category: "tasks" },
  MANAGE_TASKS: { label: "Manage tasks", description: "Assign and complete tasks", category: "tasks" },
  USE_TEAM_CHAT: { label: "Team chat", description: "Access event channels", category: "chat" },
  VIEW_ACTIVITY: { label: "View activity", description: "Event activity feed", category: "general" },
};
