export type IntegrationCategory =
  | "payments"
  | "communications"
  | "ai"
  | "storage"
  | "auth"
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

/** Providers removed from the product surface — kept only to disable legacy DB rows. */
export const RETIRED_PROVIDERS = [
  "FLUTTERWAVE",
  "HUBTEL",
  "ANTHROPIC",
  "GOOGLE_MAPS",
  "SENTRY",
  "POSTHOG",
  "PUSHER",
  "LARAVEL_API",
] as const;

export const INTEGRATION_CATEGORIES: { id: IntegrationCategory; label: string }[] = [
  { id: "payments", label: "Payments" },
  { id: "communications", label: "Communications" },
  { id: "ai", label: "Intelligence" },
  { id: "storage", label: "Storage" },
  { id: "auth", label: "Authentication" },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "custom", label: "Custom APIs" },
];

/**
 * Product catalog — only services Celeventic actually uses.
 * Admins can still add custom APIs (CUSTOM_*) beyond this list.
 */
export const INTEGRATION_CATALOG: IntegrationCatalogEntry[] = [
  {
    provider: "PAYSTACK",
    label: "Paystack",
    category: "payments",
    description: "Card and mobile money checkout for Ghana and Africa.",
    envKeys: ["PAYSTACK_SECRET_KEY", "PAYSTACK_PUBLIC_KEY", "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY"],
    secretFieldLabel: "Secret Key",
    publicKeyLabel: "Public Key",
    webhookPath: "/api/payments/webhook",
    docsUrl: "https://paystack.com/docs",
  },
  {
    provider: "RESEND",
    label: "Resend",
    category: "communications",
    description: "Transactional email for invitations, receipts, and reminders.",
    envKeys: ["RESEND_API_KEY"],
    secretFieldLabel: "API Key",
    docsUrl: "https://resend.com/docs",
  },
  {
    provider: "SMS",
    label: "SMS Gateway",
    category: "communications",
    description: "Bulk SMS for invitations and reminders. Set config.endpoint to your gateway URL.",
    envKeys: ["SMS_PROVIDER_API_KEY", "SMS_SENDER_ID"],
    secretFieldLabel: "API Key",
  },
  {
    provider: "WHATSAPP",
    label: "WhatsApp Business",
    category: "communications",
    description: "WhatsApp template messages for guests via Meta Cloud API.",
    envKeys: ["WHATSAPP_BUSINESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
    secretFieldLabel: "Access Token",
    publicKeyLabel: "Phone Number ID",
    docsUrl: "https://developers.facebook.com/docs/whatsapp",
  },
  {
    provider: "OPENAI",
    label: "OpenAI",
    category: "ai",
    description: "Event intelligence and invitation copy assistance.",
    envKeys: ["OPENAI_API_KEY"],
    secretFieldLabel: "API Key",
    docsUrl: "https://platform.openai.com/docs",
  },
  {
    provider: "AWS_S3",
    label: "AWS S3 + CloudFront",
    category: "storage",
    description:
      "Primary media storage. Store Access Key ID as public key, Secret Access Key as secret; set region/bucket/CloudFront in config JSON.",
    envKeys: [
      "AWS_REGION",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_S3_BUCKET",
      "AWS_CLOUDFRONT_URL",
    ],
    secretFieldLabel: "Secret Access Key",
    publicKeyLabel: "Access Key ID",
    docsUrl: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html",
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
    provider: "REDIS",
    label: "Redis",
    category: "infrastructure",
    description: "Caching and rate limiting.",
    envKeys: ["REDIS_URL"],
    secretFieldLabel: "Connection URL",
    docsUrl: "https://redis.io/docs",
  },
];

export function getCatalogEntry(provider: string): IntegrationCatalogEntry | undefined {
  return INTEGRATION_CATALOG.find((e) => e.provider === provider);
}

export function isRetiredProvider(provider: string): boolean {
  return (RETIRED_PROVIDERS as readonly string[]).includes(provider);
}

export function slugifyProvider(name: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return base.startsWith("CUSTOM_") ? base : `CUSTOM_${base || "API"}`;
}
