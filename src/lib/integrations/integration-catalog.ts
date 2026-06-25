export type IntegrationCategory =
  | "payments"
  | "communications"
  | "ai"
  | "maps"
  | "storage"
  | "auth"
  | "analytics"
  | "infrastructure"
  | "custom";

export interface IntegrationCatalogEntry {
  provider: string;
  label: string;
  category: IntegrationCategory;
  description: string;
  envKeys?: string[];
  secretFieldLabel?: string;
  publicKeyLabel?: string;
  webhookPath?: string;
  docsUrl?: string;
}

export const INTEGRATION_CATEGORIES: { id: IntegrationCategory; label: string }[] = [
  { id: "payments", label: "Payments" },
  { id: "communications", label: "Communications" },
  { id: "ai", label: "Intelligence" },
  { id: "maps", label: "Maps" },
  { id: "storage", label: "Storage" },
  { id: "auth", label: "Authentication" },
  { id: "analytics", label: "Analytics" },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "custom", label: "Custom" },
];

export const INTEGRATION_CATALOG: IntegrationCatalogEntry[] = [
  {
    provider: "PAYSTACK",
    label: "Paystack",
    category: "payments",
    description: "Card and mobile money payments for Ghana and Africa.",
    envKeys: ["PAYSTACK_SECRET_KEY", "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY"],
    secretFieldLabel: "Secret Key",
    publicKeyLabel: "Public Key",
    webhookPath: "/api/payments/webhook",
    docsUrl: "https://paystack.com/docs",
  },
  {
    provider: "FLUTTERWAVE",
    label: "Flutterwave",
    category: "payments",
    description: "Multi-currency payment gateway.",
    envKeys: ["FLUTTERWAVE_SECRET_KEY", "NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY"],
    secretFieldLabel: "Secret Key",
    publicKeyLabel: "Public Key",
    docsUrl: "https://developer.flutterwave.com",
  },
  {
    provider: "HUBTEL",
    label: "Hubtel",
    category: "payments",
    description: "Ghana payments and SMS via Hubtel.",
    envKeys: ["HUBTEL_CLIENT_ID", "HUBTEL_CLIENT_SECRET"],
    secretFieldLabel: "Client Secret",
    publicKeyLabel: "Client ID",
    docsUrl: "https://developers.hubtel.com",
  },
  {
    provider: "RESEND",
    label: "Resend",
    category: "communications",
    description: "Transactional email delivery.",
    envKeys: ["RESEND_API_KEY"],
    secretFieldLabel: "API Key",
    docsUrl: "https://resend.com/docs",
  },
  {
    provider: "SMS",
    label: "SMS Provider",
    category: "communications",
    description: "Bulk SMS for invitations and reminders.",
    envKeys: ["SMS_PROVIDER_API_KEY", "SMS_SENDER_ID"],
    secretFieldLabel: "API Key",
    docsUrl: "https://docs.celeventic.com/sms",
  },
  {
    provider: "WHATSAPP",
    label: "WhatsApp Business",
    category: "communications",
    description: "WhatsApp template messages for guests.",
    envKeys: ["WHATSAPP_BUSINESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
    secretFieldLabel: "Access Token",
    publicKeyLabel: "Phone Number ID",
    docsUrl: "https://developers.facebook.com/docs/whatsapp",
  },
  {
    provider: "OPENAI",
    label: "OpenAI",
    category: "ai",
    description: "Celeventic Event Intelligence and invitation copy generation.",
    envKeys: ["OPENAI_API_KEY"],
    secretFieldLabel: "API Key",
    docsUrl: "https://platform.openai.com/docs",
  },
  {
    provider: "ANTHROPIC",
    label: "Anthropic",
    category: "ai",
    description: "Claude models for planning and content.",
    envKeys: ["ANTHROPIC_API_KEY"],
    secretFieldLabel: "API Key",
    docsUrl: "https://docs.anthropic.com",
  },
  {
    provider: "GOOGLE_MAPS",
    label: "Google Maps",
    category: "maps",
    description: "Venue maps and location autocomplete.",
    envKeys: ["GOOGLE_MAPS_API_KEY", "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"],
    secretFieldLabel: "API Key",
    docsUrl: "https://developers.google.com/maps",
  },
  {
    provider: "CLOUDINARY",
    label: "Cloudinary",
    category: "storage",
    description: "Media storage and image transforms.",
    envKeys: ["CLOUDINARY_API_KEY", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_SECRET"],
    secretFieldLabel: "API Secret",
    publicKeyLabel: "API Key",
    docsUrl: "https://cloudinary.com/documentation",
  },
  {
    provider: "GOOGLE_OAUTH",
    label: "Google OAuth",
    category: "auth",
    description: "Sign in with Google for organizers.",
    envKeys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    secretFieldLabel: "Client Secret",
    publicKeyLabel: "Client ID",
    docsUrl: "https://developers.google.com/identity",
  },
  {
    provider: "SENTRY",
    label: "Sentry",
    category: "analytics",
    description: "Error monitoring and performance.",
    envKeys: ["SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN"],
    secretFieldLabel: "DSN",
    docsUrl: "https://docs.sentry.io",
  },
  {
    provider: "POSTHOG",
    label: "PostHog",
    category: "analytics",
    description: "Product analytics and feature flags.",
    envKeys: ["NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST"],
    secretFieldLabel: "Project API Key",
    docsUrl: "https://posthog.com/docs",
  },
  {
    provider: "REDIS",
    label: "Redis",
    category: "infrastructure",
    description: "Caching and rate limiting.",
    envKeys: ["REDIS_URL"],
    secretFieldLabel: "Connection URL",
    docsUrl: "https://redis.io/docs",
  },
  {
    provider: "PUSHER",
    label: "Pusher",
    category: "infrastructure",
    description: "Real-time updates for dashboards.",
    envKeys: ["PUSHER_APP_ID", "PUSHER_KEY", "PUSHER_SECRET"],
    secretFieldLabel: "Secret",
    publicKeyLabel: "Key",
    docsUrl: "https://pusher.com/docs",
  },
  {
    provider: "LARAVEL_API",
    label: "Laravel API",
    category: "custom",
    description: "Optional external Laravel backend proxy.",
    envKeys: ["LARAVEL_API_URL", "LARAVEL_API_TOKEN"],
    secretFieldLabel: "API Token",
    publicKeyLabel: "Base URL",
    docsUrl: "https://laravel.com/docs",
  },
];

export function getCatalogEntry(provider: string): IntegrationCatalogEntry | undefined {
  return INTEGRATION_CATALOG.find((e) => e.provider === provider);
}

export function slugifyProvider(name: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return base.startsWith("CUSTOM_") ? base : `CUSTOM_${base || "API"}`;
}
