import { LEGAL_CONTACT } from "./constants";
import type { LegalPolicySlug } from "./constants";

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
  privacy: {
    titleEn: "Privacy Policy",
    titleFr: "Politique de confidentialité",
    descriptionEn: "How Celeventic collects, uses, and protects your personal data.",
    descriptionFr: "Comment Celeventic collecte, utilise et protège vos données personnelles.",
    contentEn: `## Effective Date
This Privacy Policy is effective as of the date published on this page and applies to all users of the Celeventic platform.

## Data Controller
Celeventic ("we", "us", "our") is the data controller for personal information processed through our invitation, event, and ticketing services. Our primary place of business is ${jurisdiction}.

Contact: ${email} | Phone: ${phone}

## Scope & Jurisdiction
This policy is designed with reference to the Ghana Data Protection Act, 2012 (Act 843) and applicable international data protection principles for users outside Ghana. Where payment processing is involved, our payment partners (including Paystack) act as independent processors under their own terms.

## Data We Collect
We may collect: account details (name, email, phone); event and invitation content (names, dates, venues, photos, messages); guest and RSVP data you upload; payment references and transaction metadata (we do not store full card numbers); technical data (IP address, device type, browser); communications with support; and consent records.

## Purpose of Processing
We process data to: provide and improve our services; fulfil invitation orders; process payments; send service communications; prevent fraud; comply with law; and maintain platform security.

## Legal Basis
Depending on context, we rely on: contract performance (delivering your order); legitimate interests (security, analytics, service improvement); consent (marketing, portfolio showcase, non-essential cookies); and legal obligation.

## Data Retention
Account data is retained while your account is active and for a reasonable period thereafter. Order and payment records are kept as required for accounting, dispute resolution, and legal compliance. You may request earlier deletion subject to lawful exceptions.

## Data Recipients
We share data with: payment processors (e.g. Paystack); hosting and infrastructure providers; email and messaging providers; designers assigned to your order; and authorities when required by law. We do not sell personal data.

## International Transfers
Where data is processed outside Ghana, we apply appropriate safeguards consistent with applicable law and processor agreements.

## Your Rights
Subject to Act 843 and applicable law, you may: access your data; correct inaccuracies; request deletion; restrict or object to certain processing; withdraw consent; and lodge a complaint with the Ghana Data Protection Commission. Use our Data Rights page or contact ${email}.

## Data Security
We implement administrative, technical, and organisational measures including access controls, encryption in transit, audit logging, and staff confidentiality obligations. No system is completely risk-free; report concerns promptly.

## Children's Data
Our services are not directed at children under 16 without parental or guardian involvement. Organisers are responsible for lawful collection of guest data, including minors.

## Policy Updates
We may update this policy. Material changes will be communicated via the platform or email. Continued use after notice constitutes acceptance where permitted by law.

## Contact
${company} — ${email} | ${phone}`,
    contentFr: `## Date d'effet
Cette politique s'applique à tous les utilisateurs de la plateforme Celeventic.

## Responsable du traitement
Celeventic est le responsable du traitement. Siège principal : ${jurisdiction}.
Contact : ${email} | Tél. : ${phone}

## Données collectées
Compte, contenu d'événements et d'invitations, données RSVP, références de paiement, données techniques et historique de consentement.

## Finalités
Fourniture du service, traitement des commandes, paiements, sécurité, conformité légale et amélioration de la plateforme.

## Vos droits
Accès, rectification, suppression, limitation, opposition et retrait du consentement conformément à la loi ghanéenne (Act 843) et aux principes internationaux applicables.

## Contact
${email} | ${phone}`,
  },

  cookie: {
    titleEn: "Cookie Policy",
    titleFr: "Politique des cookies",
    descriptionEn: "How Celeventic uses cookies and similar technologies.",
    descriptionFr: "Comment Celeventic utilise les cookies et technologies similaires.",
    contentEn: `## What Are Cookies
Cookies are small text files stored on your device when you visit Celeventic. They help us operate the platform, remember preferences, and understand usage.

## How We Use Cookies
We use cookies and similar technologies (local storage, session tokens) for authentication, security, language preference, currency display, and — with your consent — analytics and marketing.

## Necessary Cookies
These are essential for the platform to function. They include session authentication, security tokens, load balancing, and consent status. These cannot be disabled while using the service.

| Name | Purpose | Duration |
|------|---------|----------|
| session / auth token | Keeps you signed in securely | Session |
| celeventic_cookie_consent | Records your cookie choice | 12 months |
| locale / currency prefs | Language and display currency | 12 months |

## Analytics Cookies
With your consent, we may use analytics to understand feature usage and improve performance. These are not essential.

## Marketing Cookies
With your consent, we may use cookies for campaign measurement and remarketing. You may decline marketing cookies and still use core features.

## Third-Party Cookies
Payment providers (e.g. Paystack) may set cookies during checkout under their own policies. Embedded maps or media may also set third-party cookies.

## Consent
On first visit, we present a cookie banner. You may accept all cookies or essential only. You can change your choice anytime in Privacy Center.

## Managing Cookies
Use our Privacy Center, browser settings, or contact ${email}. Blocking necessary cookies may prevent login or checkout.

## Updates
We may update this policy. See the effective date at the top of this page.

## Contact
${email} | ${phone}`,
    contentFr: `## Qu'est-ce qu'un cookie
Fichiers texte stockés sur votre appareil pour faire fonctionner Celeventic et mémoriser vos préférences.

## Cookies nécessaires
Authentification, sécurité, langue et consentement — indispensables au service.

## Cookies analytiques et marketing
Utilisés uniquement avec votre consentement via la bannière ou le Centre de confidentialité.

## Gestion
Modifiez vos choix dans le Centre de confidentialité ou les paramètres du navigateur.
Contact : ${email}`,
  },

  terms: {
    titleEn: "Terms and Conditions",
    titleFr: "Conditions générales",
    descriptionEn: "Terms governing your use of Celeventic invitation and event services.",
    descriptionFr: "Conditions régissant l'utilisation des services Celeventic.",
    contentEn: `## 1. Identification
These Terms and Conditions ("Terms") are a binding agreement between you and Celeventic, operating from ${jurisdiction}. Contact: ${email} | ${phone}.

## 2. Service Description
Celeventic provides digital invitation design, event microsites, guest management, ticketing tools, and related premium event services. Features vary by package.

## 3. Account Registration
You must provide accurate information and keep credentials secure. You are responsible for activity under your account.

## 4. Ordering Process
You select a template, package, add-ons, and provide event details. Orders progress through preview, checkout, and production. You confirm details before payment.

## 5. Prices and Payment
Prices are displayed in GHS with optional USD/GBP reference rates. Paystack processes payments in GHS. Taxes and processor fees may apply. Prices are confirmed at checkout.

## 6. Delivery
Digital invitations are delivered electronically via share link or published invite page. Delivery timelines depend on your package. We are not liable for delays caused by incomplete information from you.

## 7. Revisions
Included revisions depend on your package. Additional revisions may be billable. See our Revision Policy. Information-only changes may be accommodated at no design cost where stated.

## 8. Your Obligations
You must: provide lawful, accurate content; obtain rights to photos and media you upload; not upload harmful, defamatory, or infringing material; comply with guest data laws; and use the platform responsibly.

## 9. Intellectual Property
Celeventic retains rights in platform code, base templates, and design systems. You retain rights in your personal content. See our Intellectual Property Policy. Portfolio showcase requires your explicit opt-in at checkout.

## 10. Acceptable Use
No spam, fraud, unauthorised access, scraping, or misuse of guest data. We may suspend accounts for violations.

## 11. Limitation of Liability
To the fullest extent permitted by Ghanaian law, Celeventic is not liable for indirect, consequential, or special damages. Our aggregate liability for a single order is limited to fees paid for that order in the preceding twelve months, except where liability cannot be limited by law.

## 12. Data Protection
We process personal data per our Privacy Policy and Act 843. You are responsible for lawful guest data collection as an event organiser.

## 13. Modifications
We may update these Terms. Material changes may require re-acceptance. Continued use after notice constitutes acceptance where permitted.

## 14. Applicable Law
These Terms are governed by the laws of ${jurisdiction}. Disputes shall first be addressed through good-faith support contact.

## 15. Contact
${email} | ${phone}`,
    contentFr: `## Identification
Contrat entre vous et Celeventic (${jurisdiction}). Contact : ${email}

## Description du service
Invitations numériques, microsites événementiels, gestion des invités et services premium associés.

## Commandes et paiement
Prix en GHS, paiement via Paystack. Détails confirmés au moment du paiement.

## Livraison et révisions
Livraison électronique selon le forfait. Révisions incluses selon package — voir Politique de révision.

## Propriété intellectuelle
Celeventic conserve les droits sur la plateforme et les modèles de base. Vous conservez vos contenus personnels.

## Droit applicable
Lois de la ${jurisdiction}. Contact : ${email} | ${phone}`,
  },

  refund: {
    titleEn: "Refund Policy",
    titleFr: "Politique de remboursement",
    descriptionEn: "Refund rules for Celeventic custom digital invitation services.",
    descriptionFr: "Règles de remboursement pour les services d'invitation numérique.",
    contentEn: `## Nature of Service
Celeventic provides custom digital invitation and design services. Once creative production begins, resources are allocated to your project and deliverables are prepared specifically for you.

## Refund Eligibility — Before Work Starts
You may request a full refund if: payment was made in error; you cancel before any design or production work has commenced; and you contact us within 48 hours of payment. Refunds are processed to the original payment method where possible.

## No Refund After Production Begins
Once a designer is assigned, drafts are created, or production status moves beyond "Not Started", fees are generally non-refundable because custom work has begun. This includes partial completion and revision rounds.

## Payment Processor Fees
Third-party payment fees charged by Paystack or other processors may be non-refundable and deducted from any approved refund.

## Revisions Instead of Refunds
Where you are dissatisfied with a design direction, we encourage use of included revisions or paid extra revisions per our Revision Policy before requesting cancellation.

## Satisfaction Workflow
Contact ${email} or ${phone} with your order reference. We will review production status, revision history, and package terms. Approved refunds are processed within 14 business days.

## Chargebacks
Unauthorised chargebacks without contacting us first may result in account suspension and recovery of costs.

## Contact
${email} | ${phone}`,
    contentFr: `## Nature du service
Service numérique personnalisé. Une fois la production commencée, les frais ne sont généralement pas remboursables.

## Avant le début du travail
Remboursement possible si annulation avant toute production et dans les 48 heures suivant le paiement.

## Après le début de la production
Pas de remboursement une fois le design commencé. Frais de processeur de paiement peuvent être déduits.

## Contact
${email} | ${phone}`,
  },

  "revision-policy": {
    titleEn: "Revision Policy",
    titleFr: "Politique de révision",
    descriptionEn: "How revisions work across Celeventic invitation packages.",
    descriptionFr: "Fonctionnement des révisions selon les forfaits Celeventic.",
    contentEn: `## Included Revisions
Each package includes a defined number of design revisions (see package details at checkout). A revision round covers feedback on layout, colours, typography, and content placement within the selected template style.

## Extra Revisions
Revisions beyond your package allowance may be purchased at published rates. Extra revisions are billed before work continues.

## Information Changes (Often Free)
Changes to factual event information — date, time, venue name, contact details, RSVP wording — that do not require redesign may be updated at no charge until your event date, provided the overall design structure remains unchanged.

## Major Design Changes
Requests that alter template style, layout structure, colour scheme, or add new design sections may count as a revision or require a paid upgrade depending on scope.

## Approval Process
After revisions, we may request your approval before publishing. Delays in feedback may affect delivery timelines.

## Revision Requests
Submit clear, consolidated feedback via your dashboard or ${email}. Multiple small messages may be grouped into one revision round.

## Contact
${email} | ${phone}`,
    contentFr: `## Révisions incluses
Chaque forfait inclut un nombre défini de révisions de design.

## Révisions supplémentaires
Facturées au-delà du forfait inclus.

## Changements d'information
Date, heure, lieu — gratuits si aucun changement de design n'est requis, jusqu'à la date de l'événement.

## Changements majeurs
Modifications structurelles ou de style pouvant compter comme révision payante.

## Contact
${email} | ${phone}`,
  },

  "intellectual-property": {
    titleEn: "Intellectual Property Policy",
    titleFr: "Politique de propriété intellectuelle",
    descriptionEn: "Ownership of platform assets, templates, and your content.",
    descriptionFr: "Propriété des actifs de la plateforme, modèles et de vos contenus.",
    contentEn: `## Celeventic Ownership
Celeventic owns and retains all rights in: platform source code and software; base invitation templates and layout systems; design systems, UI components, and brand assets; stock graphic elements created by Celeventic; and documentation unless expressly transferred.

## Your Ownership
You retain ownership of: personal photographs and videos you upload; personal names and event details you provide; messages and stories you write; and other original content you lawfully supply.

## Licence to Celeventic
By uploading content, you grant Celeventic a limited licence to host, display, process, and reproduce your content solely to deliver your invitation and related services.

## Portfolio Consent
At checkout, you may opt in to allow Celeventic to showcase your completed invitation in our portfolio, website, or marketing materials. If you select "Keep my invitation private", we will not use your invitation for promotional purposes without separate written consent.

## Bespoke Ownership
Custom bespoke design ownership may be negotiated separately in writing for premium engagements. Default terms apply unless otherwise agreed.

## Restrictions
You may not copy, resell, or redistribute Celeventic templates, code, or design systems. You may share your published invitation link with intended guests.

## Infringement
Report IP concerns to ${email}. We respond to valid notices and may remove infringing content.

## Contact
${email} | ${phone}`,
    contentFr: `## Propriété Celeventic
Code, modèles de base, systèmes de design et éléments graphiques créés par Celeventic.

## Votre propriété
Photos, noms, détails d'événement et médias personnels que vous fournissez.

## Consentement portfolio
À la caisse, choisissez de autoriser ou non la présentation de votre invitation dans notre portfolio.

## Contact
${email} | ${phone}`,
  },

  "data-rights": {
    titleEn: "Data Rights",
    titleFr: "Droits sur les données",
    descriptionEn: "Exercise your data protection rights on Celeventic.",
    descriptionFr: "Exercez vos droits de protection des données sur Celeventic.",
    contentEn: `## Your Data Rights
Under the Ghana Data Protection Act, 2012 (Act 843) and applicable international standards, you have rights over your personal data.

## Right of Access
Request a copy of personal data we hold about you. Signed-in users can export data from Privacy Center.

## Right to Rectification
Update inaccurate account or event information via your dashboard or by contacting us.

## Right to Erasure
Request deletion of your account and associated data, subject to legal retention requirements (e.g. payment records).

## Right to Restrict Processing
Ask us to limit how we use your data in certain circumstances.

## Right to Object
Object to processing based on legitimate interests, including direct marketing.

## Cookie & Consent Management
Manage cookie preferences and view consent history in Privacy Center.

## How to Exercise Rights
1. Sign in and visit Dashboard → Privacy Center
2. Use Export Data or Request Deletion
3. Or email ${email} with subject "Data Rights Request"

We respond within 30 days unless extension is required by law.

## Identity Verification
We may verify your identity before fulfilling requests to protect your data.

## Complaints
You may contact the Ghana Data Protection Commission if you believe your rights have been violated.

## Contact
${email} | ${phone}`,
    contentFr: `## Vos droits
Accès, rectification, suppression, limitation et opposition conformément à l'Act 843.

## Comment exercer vos droits
Centre de confidentialité du tableau de bord ou ${email}.

## Contact
${email} | ${phone}`,
  },
};
