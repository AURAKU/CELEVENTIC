import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  Users,
  Ticket,
  QrCode,
  Armchair,
  Palette,
  Mail,
  Image,
  Upload,
  Layers,
  BarChart3,
  Store,
  MapPin,
  Compass,
  Heart,
  MessageSquare,
  Megaphone,
  Wallet,
  Archive,
  Flower2,
  Settings,
  Shield,
  BookOpen,
  Video,
  Flame,
  CreditCard,
  Star,
  Clock,
  Package,
  Bell,
  Receipt,
  TrendingUp,
  Banknote,
  UserCircle,
  Building2,
  Plug,
  Lock,
} from "lucide-react";

export type WorkspaceId = "organizer" | "vendor" | "funeral" | "admin";

export interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  exact?: boolean;
}

export interface NavSection {
  id: string;
  labelKey: string;
  items: NavItem[];
}

export const ORGANIZER_NAV: NavSection[] = [
  {
    id: "home",
    labelKey: "dashboard.nav_section_home",
    items: [
      { href: "/dashboard", labelKey: "dashboard.nav_home", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    id: "events",
    labelKey: "dashboard.nav_section_events",
    items: [
      { href: "/dashboard/events", labelKey: "dashboard.nav_events", icon: Calendar },
      { href: "/dashboard/ai-planner", labelKey: "dashboard.nav_ai_planner", icon: Sparkles },
      { href: "/dashboard/guests", labelKey: "dashboard.nav_guests", icon: Users },
      { href: "/dashboard/tickets", labelKey: "dashboard.nav_tickets", icon: Ticket },
      { href: "/dashboard/qr-admission", labelKey: "dashboard.nav_qr", icon: QrCode },
      { href: "/dashboard/seating", labelKey: "dashboard.nav_seating", icon: Armchair },
    ],
  },
  {
    id: "studio",
    labelKey: "dashboard.nav_section_studio",
    items: [
      { href: "/dashboard/design-studio", labelKey: "dashboard.nav_design_studio", icon: Palette },
      { href: "/dashboard/invitations?tab=studio", labelKey: "dashboard.nav_invitation_studio", icon: Mail },
      { href: "/dashboard/flyers", labelKey: "dashboard.nav_flyer_studio", icon: Image },
      { href: "/dashboard/design-studio/assets", labelKey: "dashboard.nav_asset_library", icon: Layers },
      { href: "/dashboard/inspiration", labelKey: "dashboard.nav_inspiration", icon: Upload },
      { href: "/dashboard/design-studio/templates", labelKey: "dashboard.nav_my_templates", icon: Palette },
    ],
  },
  {
    id: "invitations",
    labelKey: "dashboard.nav_section_invitations",
    items: [
      { href: "/dashboard/invitations", labelKey: "dashboard.nav_invitations", icon: Mail, exact: true },
      { href: "/dashboard/guests", labelKey: "dashboard.nav_rsvp", icon: Users },
      { href: "/dashboard/events", labelKey: "dashboard.nav_guest_pages", icon: BookOpen },
      { href: "/dashboard/memory?tab=legacy", labelKey: "dashboard.nav_thank_you", icon: Heart },
    ],
  },
  {
    id: "marketplace",
    labelKey: "dashboard.nav_section_marketplace",
    items: [
      { href: "/marketplace", labelKey: "dashboard.nav_marketplace", icon: Store },
      { href: "/dashboard/venues", labelKey: "dashboard.nav_venues", icon: MapPin },
      { href: "/dashboard/my-collection", labelKey: "dashboard.nav_saved", icon: Heart },
      { href: "/dashboard/discovery", labelKey: "dashboard.nav_discovery", icon: Compass },
      { href: "/dashboard/design-studio/marketplace", labelKey: "dashboard.nav_template_marketplace", icon: Store },
    ],
  },
  {
    id: "communications",
    labelKey: "dashboard.nav_section_communications",
    items: [
      { href: "/dashboard/messages", labelKey: "dashboard.nav_messages", icon: MessageSquare },
      { href: "/dashboard/campaigns", labelKey: "dashboard.nav_campaigns", icon: Megaphone },
      { href: "/dashboard/campaigns?channel=EMAIL", labelKey: "dashboard.nav_email", icon: Mail },
      { href: "/dashboard/campaigns?channel=SMS", labelKey: "dashboard.nav_sms", icon: MessageSquare },
      { href: "/dashboard/campaigns?channel=WHATSAPP", labelKey: "dashboard.nav_whatsapp", icon: MessageSquare },
    ],
  },
  {
    id: "finance",
    labelKey: "dashboard.nav_section_finance",
    items: [
      { href: "/dashboard/wallet?view=overview", labelKey: "dashboard.nav_wallet", icon: Wallet },
      { href: "/dashboard/contributions", labelKey: "dashboard.nav_contributions", icon: CreditCard },
      { href: "/dashboard/invitations?tab=store", labelKey: "dashboard.nav_orders", icon: Package },
      { href: "/dashboard/wallet?view=payouts", labelKey: "dashboard.nav_payouts", icon: Banknote },
      { href: "/dashboard/wallet?view=transactions", labelKey: "dashboard.nav_transactions", icon: Receipt },
      { href: "/dashboard/wallet?view=revenue", labelKey: "dashboard.nav_revenue", icon: TrendingUp },
    ],
  },
  {
    id: "memories",
    labelKey: "dashboard.nav_section_memories",
    items: [
      { href: "/dashboard/memory", labelKey: "dashboard.nav_memory", icon: Archive, exact: true },
      { href: "/dashboard/memory?tab=guestbook", labelKey: "dashboard.nav_guestbook", icon: BookOpen },
      { href: "/dashboard/memory?tab=gallery", labelKey: "dashboard.nav_gallery", icon: Image },
      { href: "/dashboard/memory?tab=uploads", labelKey: "dashboard.nav_media_uploads", icon: Upload },
      { href: "/dashboard/memory?tab=legacy", labelKey: "dashboard.nav_legacy_archive", icon: Archive },
    ],
  },
  {
    id: "funeralos",
    labelKey: "dashboard.nav_section_funeralos",
    items: [
      { href: "/dashboard/funeral", labelKey: "dashboard.nav_funeral_dashboard", icon: Flower2 },
    ],
  },
  {
    id: "settings",
    labelKey: "dashboard.nav_section_settings",
    items: [
      { href: "/dashboard/settings", labelKey: "dashboard.nav_account", icon: UserCircle, exact: true },
      { href: "/dashboard/settings?tab=organization", labelKey: "dashboard.nav_organization", icon: Building2 },
      { href: "/dashboard/settings?tab=team", labelKey: "dashboard.nav_team", icon: Users },
      { href: "/dashboard/settings?tab=permissions", labelKey: "dashboard.nav_permissions", icon: Shield },
      { href: "/dashboard/settings?tab=branding", labelKey: "dashboard.nav_branding", icon: Palette },
      { href: "/dashboard/settings?tab=integrations", labelKey: "dashboard.nav_integrations", icon: Plug },
      { href: "/dashboard/privacy-center", labelKey: "dashboard.nav_privacy", icon: Lock },
      { href: "/dashboard/settings?tab=security", labelKey: "dashboard.nav_security", icon: Shield },
      { href: "/dashboard/settings?tab=billing", labelKey: "dashboard.nav_billing", icon: CreditCard },
    ],
  },
];

export const VENDOR_NAV: NavSection[] = [
  {
    id: "vendor",
    labelKey: "dashboard.nav_section_vendor",
    items: [
      { href: "/dashboard/vendor-portal", labelKey: "dashboard.nav_vendor_dashboard", icon: Store, exact: true },
      { href: "/dashboard/vendor-portal?section=portfolio", labelKey: "dashboard.nav_portfolio", icon: Image },
      { href: "/dashboard/vendor-portal?section=bookings", labelKey: "dashboard.nav_bookings", icon: Calendar },
      { href: "/dashboard/vendor-portal?section=clients", labelKey: "dashboard.nav_clients", icon: Users },
      { href: "/dashboard/vendor-portal?section=services", labelKey: "dashboard.nav_services", icon: Package },
      { href: "/dashboard/vendor-portal?section=availability", labelKey: "dashboard.nav_availability", icon: Clock },
      { href: "/dashboard/wallet", labelKey: "dashboard.nav_earnings", icon: Wallet },
      { href: "/dashboard/wallet", labelKey: "dashboard.nav_withdrawals", icon: Banknote },
      { href: "/dashboard/vendor-portal?section=reviews", labelKey: "dashboard.nav_reviews", icon: Star },
    ],
  },
  {
    id: "communications",
    labelKey: "dashboard.nav_section_communications",
    items: [
      { href: "/dashboard/messages", labelKey: "dashboard.nav_messages", icon: MessageSquare },
    ],
  },
  {
    id: "settings",
    labelKey: "dashboard.nav_section_settings",
    items: [
      { href: "/dashboard/settings", labelKey: "dashboard.nav_account", icon: Settings },
      { href: "/dashboard/privacy-center", labelKey: "dashboard.nav_privacy", icon: Shield },
    ],
  },
];

export const FUNERAL_NAV: NavSection[] = [
  {
    id: "funeralos",
    labelKey: "dashboard.nav_section_funeralos",
    items: [
      { href: "/dashboard/funeral", labelKey: "dashboard.nav_funeral_dashboard", icon: Flower2, exact: true },
      { href: "/dashboard/funeral?section=invitations", labelKey: "dashboard.nav_memorial_invites", icon: Mail },
      { href: "/dashboard/funeral?section=obituaries", labelKey: "dashboard.nav_obituaries", icon: BookOpen },
      { href: "/dashboard/funeral?section=tributes", labelKey: "dashboard.nav_tributes", icon: Flame },
      { href: "/dashboard/funeral?section=livestream", labelKey: "dashboard.nav_livestream", icon: Video },
      { href: "/dashboard/contributions", labelKey: "dashboard.nav_memorial_contributions", icon: Heart },
      { href: "/dashboard/memory?tab=legacy", labelKey: "dashboard.nav_legacy_archive", icon: Archive },
    ],
  },
  {
    id: "memories",
    labelKey: "dashboard.nav_section_memories",
    items: [
      { href: "/dashboard/memory", labelKey: "dashboard.nav_memory", icon: Archive },
      { href: "/dashboard/memory", labelKey: "dashboard.nav_funeral_memories", icon: Flower2 },
    ],
  },
  {
    id: "communications",
    labelKey: "dashboard.nav_section_communications",
    items: [
      { href: "/dashboard/messages", labelKey: "dashboard.nav_messages", icon: MessageSquare },
      { href: "/dashboard/campaigns", labelKey: "dashboard.nav_campaigns", icon: Megaphone },
    ],
  },
  {
    id: "settings",
    labelKey: "dashboard.nav_section_settings",
    items: [
      { href: "/dashboard/settings", labelKey: "dashboard.nav_account", icon: Settings },
      { href: "/dashboard/privacy-center", labelKey: "dashboard.nav_privacy", icon: Shield },
    ],
  },
];

export function getNavSections(workspace: WorkspaceId): NavSection[] {
  switch (workspace) {
    case "vendor":
      return VENDOR_NAV;
    case "funeral":
      return FUNERAL_NAV;
    case "admin":
      return ORGANIZER_NAV;
    default:
      return ORGANIZER_NAV;
  }
}

export const WORKSPACE_OPTIONS: { id: WorkspaceId; labelKey: string; roles?: string[] }[] = [
  { id: "organizer", labelKey: "dashboard.workspace_organizer" },
  { id: "vendor", labelKey: "dashboard.workspace_vendor", roles: ["VENDOR"] },
  { id: "funeral", labelKey: "dashboard.workspace_funeral" },
  { id: "admin", labelKey: "dashboard.workspace_admin", roles: ["ADMIN", "SUPER_ADMIN"] },
];
