import { LEGAL_CONTACT, LEGAL_POLICY_SLUGS } from "./constants";
import type { LegalPolicySlug } from "./constants";
import { FRENCH_LEGAL_CONTENT } from "./french-legal-content";

export interface LegalDocumentDefaults {
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  descriptionFr: string;
  contentEn: string;
  contentFr: string;
}

const { phone, email, company, jurisdiction } = LEGAL_CONTACT;

export const DEFAULT_LEGAL_DOCUMENTS: Record<LegalPolicySlug, LegalDocumentDefaults> = {
  terms: {
    titleEn: "Terms and Conditions",
    titleFr: "Conditions générales",
    descriptionEn: "Terms governing your use of Celeventic invitation, event, and marketplace services.",
    descriptionFr: "Conditions régissant l'utilisation des services Celeventic.",
    contentEn: `## 1. Agreement
These Terms and Conditions ("Terms") are a binding agreement between you and ${company}, operating from the ${jurisdiction}. Contact: ${email} | ${phone}.

By creating an account, placing an invitation order, using VendorOS, or accessing guest invitation links, you agree to these Terms and our [Privacy Policy](/legal/privacy).

## 2. Platform Overview
Celeventic is an Event Operating System that includes:

- **InvitationOS** — digital invitation studio, guest portal, RSVP, QR admission, and production workflow
- **VendorOS** — vendor marketplace, profiles, lead requests, and verified vendor plans
- **Event tools** — guest CRM, ticketing, communications, and event discovery
- **Celeventic Intelligence** — smart design assistance and content tools (publicly branded as AGI Engine / Celeventic Intelligence)

Features vary by package, role, and subscription plan.

## 3. Accounts & Roles
You must provide accurate registration information and keep credentials secure. Celeventic supports organizer, vendor, venue, agency, and admin roles. You are responsible for all activity under your account.

## 4. Invitation Orders
The invitation flow works as follows:

1. Choose a template and package (Starter, Celebration, Signature, Prestige, or Bespoke)
2. Add event details, blocks, and optional add-ons
3. Review checkout pricing in GHS (with USD/GBP display references)
4. Pay via Paystack where applicable
5. Progress through production stages: information collection → design → review → revisions → approval → publish

You confirm event details and accept these Terms, [Refund Policy](/legal/refund), and [Privacy Policy](/legal/privacy) at checkout.

## 5. Production & Delivery
Digital invitations are delivered electronically via your unique guest link (\`/invite/[link]\`), QR codes, and optional WhatsApp sharing. Delivery timelines depend on your package. Delays caused by incomplete information, late feedback, or revision rounds may extend timelines.

Production modes include self-service, designer-assisted, and bespoke flows as described at checkout.

## 6. Revisions
Included revisions depend on your package. Minor information changes (date, time, venue, spelling) may be handled differently from major design changes (layout, theme, new sections). See our [Revision Policy](/legal/revision-policy).

## 7. Payments
Prices are displayed in Ghana Cedis (GHS). Paystack processes card and mobile money payments in GHS. Payment references and transaction metadata are stored; Celeventic does not store full card numbers. See [Refund Policy](/legal/refund) for cancellation rules.

## 8. VendorOS Marketplace
Vendors may create profiles, upload media within plan limits, receive leads, and subscribe to Free, Verified, Premium, or Enterprise plans. Organizers may browse vendors, request quotes, and save favorites. Vendor listings must be accurate and lawful. Celeventic may verify, suspend, or remove vendors who violate these Terms.

## 9. Guest Data & Organiser Responsibilities
As an event organiser, you are responsible for lawful collection and use of guest data (names, phone numbers, RSVP responses). You must have appropriate consent to upload guest lists and send communications. Celeventic processes guest data on your instructions to deliver invitation and admission services.

## 10. Intellectual Property
Celeventic retains rights in platform code, base templates, and design systems. You retain rights in your personal content. Portfolio showcase requires explicit opt-in at checkout. See [Intellectual Property Policy](/legal/intellectual-property).

## 11. Acceptable Use
You may not: spam guests; commit fraud; scrape the platform; upload infringing or harmful content; misuse vendor or guest data; attempt unauthorised access; or circumvent payment or plan limits.

## 12. Limitation of Liability
To the fullest extent permitted by Ghanaian law, Celeventic is not liable for indirect or consequential damages. Our aggregate liability for a single paid order is limited to fees paid for that order in the preceding twelve months, except where liability cannot be limited by law.

## 13. Modifications
We may update these Terms via the Legal Center. Material changes may require re-acceptance when you next sign in. Continued use after notice constitutes acceptance where permitted by law.

## 14. Governing Law
These Terms are governed by the laws of the ${jurisdiction}. Disputes should first be raised via ${email}.

## 15. Contact
${email} | ${phone}`,
    contentFr: `## Accord
Contrat entre vous et ${company} (${jurisdiction}). Contact : ${email}

## Plateforme
Celeventic comprend InvitationOS (invitations, RSVP, QR), VendorOS (marketplace prestataires), et les outils événementiels associés.

## Commandes
Choix du modèle et forfait, paiement Paystack en GHS, production et publication via lien invité unique.

## Révisions et remboursements
Voir [Politique de révision](/legal/revision-policy) et [Politique de remboursement](/legal/refund).

## Propriété intellectuelle
Voir [Politique de propriété intellectuelle](/legal/intellectual-property).

## Droit applicable
Lois de la ${jurisdiction}. Contact : ${email} | ${phone}`,
  },

  privacy: {
    titleEn: "Privacy Policy",
    titleFr: "Politique de confidentialité",
    descriptionEn: "How Celeventic collects, uses, and protects your personal data across InvitationOS and VendorOS.",
    descriptionFr: "Comment Celeventic collecte, utilise et protège vos données personnelles.",
    contentEn: `## Effective Date
This Privacy Policy applies to all users of Celeventic — organisers, vendors, guests, and administrators.

## Data Controller
${company} is the data controller for personal information processed through our platform. Primary place of business: ${jurisdiction}.

Contact: ${email} | Phone: ${phone}

## Scope
This policy covers data processed through:

- Account registration and authentication (including NextAuth sessions and optional 2FA)
- InvitationOS orders, guest portals, RSVP, and QR admission
- VendorOS profiles, leads, media uploads, and marketplace interactions
- Payments via Paystack (we receive references and metadata, not full card numbers)
- Communications (email, SMS, WhatsApp where enabled)
- Privacy Center consent records and cookie preferences

We design this policy with reference to the Ghana Data Protection Act, 2012 (Act 843).

## Data We Collect

| Category | Examples |
|----------|----------|
| Account | Name, email, phone, role, password hash |
| Event & invitation | Event title, date, venue, photos, messages, blocks |
| Guest data | Names, RSVP status, dietary notes, QR tokens (uploaded by organisers) |
| Vendor | Business name, category, portfolio media, verification documents |
| Payment | Paystack reference, amount, status, purpose |
| Technical | IP address, device type, browser, session logs |
| Consent | Terms version, privacy version, cookie choice, portfolio opt-in |

## How We Use Data
We process data to: deliver invitation and event services; operate VendorOS; process payments; send service notifications; provide Celeventic Intelligence features; prevent fraud; maintain security audit logs; and comply with legal obligations.

## Legal Basis
Contract performance (fulfilling your order); legitimate interests (security, analytics, service improvement); consent (marketing, portfolio showcase, non-essential cookies); and legal obligation.

## Data Sharing
We share data with: Paystack and other payment processors; hosting providers; email/SMS/WhatsApp providers; designers assigned to your order; and authorities when required by law. We do not sell personal data.

## Retention
Account data is retained while active and for a reasonable period after closure. Payment and order records are kept for accounting, disputes, and legal compliance. Guest RSVP data may be retained per organiser settings and event lifecycle.

## Your Rights
Under Act 843 you may access, correct, delete, restrict, or object to processing, and withdraw consent. Exercise rights via [Data Rights](/legal/data-rights) or Dashboard → [Privacy Center](/dashboard/privacy-center).

## Cookies
See our [Cookie Policy](/legal/cookie). Manage preferences in Privacy Center or via the site cookie banner.

## Security
We use access controls, encryption in transit, audit logging, and staff confidentiality obligations. Report concerns to ${email}.

## Children's Data
Services are not directed at children under 16 without guardian involvement. Organisers are responsible for lawful guest data collection.

## Updates
Material changes are published in the Legal Center and may require re-acceptance.

## Contact
${company} — ${email} | ${phone}`,
    contentFr: `## Responsable
${company}, ${jurisdiction}. Contact : ${email}

## Données collectées
Compte, invitations, données invités, profils vendeurs, paiements Paystack, consentements.

## Vos droits
Accès, rectification, suppression via [Droits sur les données](/legal/data-rights) ou le [Centre de confidentialité](/dashboard/privacy-center).

## Cookies
Voir [Politique des cookies](/legal/cookie).

## Contact
${email} | ${phone}`,
  },

  refund: {
    titleEn: "Refund Policy",
    titleFr: "Politique de remboursement",
    descriptionEn: "Refund rules for Celeventic digital invitation packages and production services.",
    descriptionFr: "Règles de remboursement pour les forfaits d'invitation numérique.",
    contentEn: `## Nature of Service
Celeventic provides custom digital invitation and design production through InvitationOS. Once creative production begins — including designer assignment, draft creation, or AGI Engine-assisted generation — resources are allocated specifically to your project.

## Package Reference

| Package | Price (GHS) | Included Revisions |
|---------|-------------|-------------------|
| Starter | Free | 1 |
| Celebration | 199 | 2 |
| Signature | 499 | 3 |
| Prestige | 999 | 5 |
| Bespoke | 2,499 | 10 |

Paid packages are subject to the refund rules below. Free Starter orders have no payment to refund.

## Full Refund — Before Production Starts
You may request a full refund if:

- Payment was made in error
- You cancel before production status moves beyond payment/information collection
- You contact us within 48 hours of payment

Refunds are processed to the original Paystack payment method where possible.

## No Refund After Production Begins
Once production status reaches **Production Started**, **Design Ready**, **Revision In Progress**, or beyond, fees are generally non-refundable because custom work has begun.

This includes partial completion, designer-assisted work, and revision rounds.

## Payment Processor Fees
Paystack and other processor fees may be non-refundable and deducted from approved refunds.

## Revisions Before Refunds
If you are dissatisfied with design direction, use your included revisions or purchase extra revisions per our [Revision Policy](/legal/revision-policy) before requesting cancellation.

## Extra Revision Purchases
Paid extra revisions (default GHS 79 per round beyond package allowance) are non-refundable once the revision work has started.

## How to Request a Refund
Email ${email} or call ${phone} with your order reference. We review production status, revision history, and package terms. Approved refunds are processed within 14 business days.

## Chargebacks
Unauthorised chargebacks without contacting us first may result in account suspension.

## Contact
${email} | ${phone}`,
    contentFr: `## Service personnalisé
Les invitations numériques sont produites sur mesure. Après le début de la production, les frais ne sont généralement pas remboursables.

## Avant production
Remboursement intégral possible si annulation dans les 48 heures et avant le début du travail créatif.

## Révisions
Utilisez d'abord les révisions incluses — voir [Politique de révision](/legal/revision-policy).

## Contact
${email} | ${phone}`,
  },

  cookie: {
    titleEn: "Cookie Policy",
    titleFr: "Politique des cookies",
    descriptionEn: "How Celeventic uses cookies, local storage, and session technologies.",
    descriptionFr: "Comment Celeventic utilise les cookies et technologies similaires.",
    contentEn: `## What Are Cookies
Cookies are small text files stored on your device. Celeventic also uses local storage and secure session tokens for authentication and preferences.

## How We Use Them

| Type | Purpose |
|------|---------|
| Necessary | Login sessions (NextAuth), security, load balancing, consent status |
| Functional | Language (EN/FR), currency display (GHS/USD/GBP), dashboard preferences |
| Analytics | Feature usage and performance (with your consent only) |
| Marketing | Campaign measurement (with your consent only) |

## Necessary Cookies

| Name | Purpose | Duration |
|------|---------|----------|
| session / auth token | Keeps you signed in securely | Session |
| celeventic_cookie_consent | Records your cookie banner choice | 12 months |
| locale / currency prefs | Language and display currency | 12 months |

These cannot be disabled while using authenticated features.

## Third-Party Cookies
Paystack may set cookies during checkout under their own policy. Embedded maps, media, or social widgets may set third-party cookies.

## Consent Management
On first visit, a cookie banner lets you choose **Essential Only** or **Accept All**. Signed-in users can update preferences anytime in [Privacy Center](/dashboard/privacy-center).

## Managing Cookies
- Use Privacy Center to update consent
- Use browser settings to block cookies (may break login or checkout)
- Contact ${email} for assistance

## Related Policies
[Privacy Policy](/legal/privacy) · [Data Rights](/legal/data-rights)

## Contact
${email} | ${phone}`,
    contentFr: `## Cookies nécessaires
Authentification, sécurité, langue et consentement — indispensables au service.

## Consentement
Bannière au premier visit. Gérez vos choix dans le [Centre de confidentialité](/dashboard/privacy-center).

## Contact
${email}`,
  },

  "revision-policy": {
    titleEn: "Revision Policy",
    titleFr: "Politique de révision",
    descriptionEn: "How invitation revisions work across Celeventic packages and production workflow.",
    descriptionFr: "Fonctionnement des révisions selon les forfaits Celeventic.",
    contentEn: `## Overview
Every Celeventic invitation package includes a defined number of design revision rounds. Revisions are managed through your dashboard production workflow and tracked in the admin revision system.

## Included Revisions by Package

| Package | Included Revisions | Delivery |
|---------|-------------------|----------|
| Starter | 1 | 1 day |
| Celebration | 2 | 2 days |
| Signature | 3 | 3 days |
| Prestige | 5 | 5 days |
| Bespoke | 10 | Custom |

A revision round covers consolidated feedback on layout, colours, typography, and content placement within your selected template style.

## Minor vs Major Changes
Celeventic classifies revision requests to keep production fair and efficient:

### Minor (often no revision credit used)
- Date, time, or venue changes
- Phone number updates
- Spelling corrections
- Factual text updates without layout changes

### Major (counts as a revision round)
- Theme or colour overhaul
- Layout structure changes
- New animation or motion sections
- New design sections beyond the original scope

## Extra Revisions
Beyond your package allowance, extra revisions may be purchased (default GHS 79 per round). Extra revisions are billed before work continues.

## Production Workflow Stages
Your order progresses through stages including: Payment Successful → Information Pending → Production Started → Design Ready → Customer Reviewing → Revision Requested → Revision In Progress → Approved → Delivered → Published.

Delays in providing consolidated feedback may extend delivery timelines.

## How to Submit Revisions
1. Open your invitation order in the dashboard
2. Submit clear, consolidated feedback in one request where possible
3. Or email ${email} with your order reference

Multiple small messages may be grouped into one revision round.

## Approval
After revisions, we may request your explicit approval before publishing your guest link.

## Related Policies
[Terms and Conditions](/legal/terms) · [Refund Policy](/legal/refund)

## Contact
${email} | ${phone}`,
    contentFr: `## Révisions incluses
De 1 (Starter) à 10 (Bespoke) selon le forfait.

## Changements mineurs vs majeurs
Date, heure, lieu — souvent sans utiliser une révision. Changements de thème ou mise en page — comptent comme révision.

## Révisions supplémentaires
GHS 79 par tour au-delà du forfait inclus.

## Contact
${email} | ${phone}`,
  },

  "intellectual-property": {
    titleEn: "Intellectual Property Policy",
    titleFr: "Politique de propriété intellectuelle",
    descriptionEn: "Ownership of Celeventic platform assets, templates, AGI Engine outputs, and your content.",
    descriptionFr: "Propriété des actifs de la plateforme, modèles et de vos contenus.",
    contentEn: `## Celeventic Ownership
${company} owns and retains all rights in:

- Platform source code, APIs, and software architecture
- Base invitation templates, layout systems, and design components
- Celeventic brand assets, UI systems, and documentation
- Stock graphic elements created by Celeventic
- AGI Engine / Celeventic Intelligence tooling and generated design frameworks (excluding your personal content inputs)

## Your Ownership
You retain ownership of:

- Personal photographs and videos you upload
- Personal names, event details, and messages you write
- Your original creative content lawfully supplied

## Licence to Celeventic
By uploading content, you grant Celeventic a limited licence to host, display, process, and reproduce your content solely to deliver your invitation, guest portal, QR admission, and related services.

## Portfolio Consent at Checkout
At checkout you choose whether Celeventic may showcase your completed invitation in our portfolio, website, or marketing:

- **Allow portfolio showcase** — Celeventic may display your invitation as a sample
- **Keep private** — we will not use your invitation for promotional purposes without separate written consent

This choice is recorded with your order and consent history.

## Template & Catalogue
Templates in the invitation catalogue and admin template library are licensed for use through Celeventic only. You may not extract, resell, or redistribute template files or design systems.

## VendorOS Content
Vendors retain rights in their uploaded portfolio media. By publishing a vendor profile, vendors grant Celeventic a licence to display their content in the marketplace directory.

## Bespoke Engagements
Custom bespoke design ownership may be negotiated separately in writing for premium engagements. Default terms apply unless otherwise agreed.

## Restrictions
You may not copy, resell, scrape, or redistribute Celeventic templates, code, or design systems. You may share your published invitation link (\`/invite/[link]\`) with intended guests.

## Infringement Reports
Report IP concerns to ${email}. We respond to valid notices and may remove infringing content.

## Related Policies
[Terms and Conditions](/legal/terms) · [Privacy Policy](/legal/privacy)

## Contact
${email} | ${phone}`,
    contentFr: `## Propriété Celeventic
Code, modèles, systèmes de design et outils Celeventic Intelligence.

## Votre propriété
Photos, noms, détails d'événement et médias personnels.

## Consentement portfolio
Choix explicite à la caisse : autoriser ou garder privé.

## Contact
${email} | ${phone}`,
  },

  "data-rights": {
    titleEn: "Data Rights",
    titleFr: "Droits sur les données",
    descriptionEn: "Exercise your data protection rights on Celeventic under Act 843.",
    descriptionFr: "Exercez vos droits de protection des données sur Celeventic.",
    contentEn: `## Your Rights
Under the Ghana Data Protection Act, 2012 (Act 843) and applicable international standards, you have rights over your personal data processed by Celeventic.

## Right of Access
Request a copy of personal data we hold about you. Signed-in users can export a JSON bundle from Privacy Center including:

- Profile (name, email, phone, role)
- Invitation orders and portfolio consent choices
- Payment references and amounts
- Events you organise
- Full consent history (terms, privacy, cookies, data export/deletion requests)

## Right to Rectification
Update inaccurate account or event information via your dashboard or by contacting ${email}.

## Right to Erasure
Request deletion of your account and associated data, subject to legal retention requirements (e.g. payment records for accounting).

## Right to Restrict Processing
Ask us to limit how we use your data in certain circumstances.

## Right to Object
Object to processing based on legitimate interests, including direct marketing.

## Cookie & Consent Management
View and update cookie preferences in [Privacy Center](/dashboard/privacy-center). Consent history shows terms version, privacy version, and cookie choices with timestamps.

## How to Exercise Rights

1. **Sign in** to your Celeventic account
2. Go to **Dashboard → Privacy Center**
3. Use **Export Data (JSON)** or **Request Data Deletion**
4. Or email ${email} with subject "Data Rights Request"

We respond within 30 days unless an extension is required by law.

## Guest Data
If you are a guest (not an account holder) whose data was uploaded by an organiser, contact the organiser first. You may also email ${email} and we will assist within our legal obligations.

## Identity Verification
We may verify your identity before fulfilling requests to protect your data.

## Complaints
You may contact the Ghana Data Protection Commission if you believe your rights have been violated.

## Related Policies
[Privacy Policy](/legal/privacy) · [Cookie Policy](/legal/cookie) · [Terms and Conditions](/legal/terms)

## Contact
${email} | ${phone}`,
    contentFr: "",
  },
};

for (const slug of LEGAL_POLICY_SLUGS) {
  DEFAULT_LEGAL_DOCUMENTS[slug].contentFr = FRENCH_LEGAL_CONTENT[slug];
}
