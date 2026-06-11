import { LEGAL_CONTACT } from "./constants";
import type { LegalPolicySlug } from "./constants";

const { phone, email, company, jurisdiction } = LEGAL_CONTACT;

/** Full French legal document bodies — mirrored structure to English policies */
export const FRENCH_LEGAL_CONTENT: Record<LegalPolicySlug, string> = {
  terms: `## 1. Accord
Les présentes Conditions générales (« Conditions ») constituent un accord contraignant entre vous et ${company}, exerçant ses activités en ${jurisdiction}. Contact : ${email} | ${phone}.

En créant un compte, en passant une commande d'invitation, en utilisant VendorOS ou en accédant aux liens d'invitation invités, vous acceptez ces Conditions et notre [Politique de confidentialité](/legal/privacy).

## 2. Aperçu de la plateforme
Celeventic est un système d'exploitation événementiel comprenant :

- **InvitationOS** — studio d'invitations numériques, portail invité, RSVP, admission QR et flux de production
- **VendorOS** — marketplace prestataires, profils, demandes de devis et forfaits vérifiés
- **Outils événementiels** — CRM invités, billetterie, communications et découverte d'événements
- **Celeventic Intelligence** — assistance design et outils de contenu (présentés publiquement sous AGI Engine / Celeventic Intelligence)

Les fonctionnalités varient selon le forfait, le rôle et l'abonnement.

## 3. Comptes et rôles
Vous devez fournir des informations exactes et protéger vos identifiants. Celeventic prend en charge les rôles organisateur, prestataire, lieu, agence et administrateur. Vous êtes responsable de toute activité sous votre compte.

## 4. Commandes d'invitation
Le parcours d'invitation fonctionne ainsi :

1. Choisir un modèle et un forfait (Starter, Celebration, Signature, Prestige ou Bespoke)
2. Ajouter les détails de l'événement, les blocs et les options
3. Vérifier le prix au paiement en GHS (avec références USD/GBP)
4. Payer via Paystack le cas échéant
5. Progresser dans les étapes de production : informations → design → révision → approbation → publication

Vous confirmez les détails et acceptez ces Conditions, la [Politique de remboursement](/legal/refund) et la [Politique de confidentialité](/legal/privacy) à la caisse.

## 5. Production et livraison
Les invitations numériques sont livrées électroniquement via votre lien invité unique, les codes QR et le partage WhatsApp optionnel. Les délais dépendent du forfait.

## 6. Révisions
Le nombre de révisions incluses dépend du forfait. Voir notre [Politique de révision](/legal/revision-policy).

## 7. Paiements
Les prix sont affichés en cedis ghanéens (GHS). Paystack traite les paiements en GHS. Voir la [Politique de remboursement](/legal/refund).

## 8. Marketplace VendorOS
Les prestataires peuvent créer des profils, recevoir des leads et souscrire aux forfaits Free, Verified, Premium ou Enterprise.

## 9. Données invités
En tant qu'organisateur, vous êtes responsable de la collecte licite des données invités.

## 10. Propriété intellectuelle
Voir notre [Politique de propriété intellectuelle](/legal/intellectual-property).

## 11. Utilisation acceptable
Interdiction de spam, fraude, scraping, contenu illicite ou accès non autorisé.

## 12. Limitation de responsabilité
Dans les limites permises par la loi ghanéenne, la responsabilité agrégée pour une commande payée est limitée aux frais payés pour cette commande au cours des douze mois précédents.

## 13. Modifications
Nous pouvons mettre à jour ces Conditions via le Centre juridique.

## 14. Droit applicable
Lois de la ${jurisdiction}. Contact : ${email}.

## 15. Contact
${email} | ${phone}`,

  privacy: `## Date d'effet
Cette politique s'applique à tous les utilisateurs de Celeventic — organisateurs, prestataires, invités et administrateurs.

## Responsable du traitement
${company} est le responsable du traitement. Siège principal : ${jurisdiction}.
Contact : ${email} | Tél. : ${phone}

## Champ d'application
Cette politique couvre les données traitées via :

- Inscription et authentification (sessions NextAuth et 2FA optionnelle)
- Commandes InvitationOS, portails invités, RSVP et admission QR
- Profils VendorOS, leads, médias et interactions marketplace
- Paiements Paystack (références et métadonnées, pas les numéros de carte complets)
- Communications (e-mail, SMS, WhatsApp si activé)
- Consentements et préférences cookies du Centre de confidentialité

Cette politique est conçue conformément à la loi ghanéenne sur la protection des données (Act 843).

## Données collectées

| Catégorie | Exemples |
|-----------|----------|
| Compte | Nom, e-mail, téléphone, rôle |
| Événement | Titre, date, lieu, photos, messages |
| Invités | Noms, statut RSVP, jetons QR |
| Prestataire | Nom commercial, catégorie, portfolio |
| Paiement | Référence Paystack, montant, statut |
| Technique | Adresse IP, appareil, navigateur |
| Consentement | Versions conditions/confidentialité, cookies |

## Finalités
Fourniture du service, traitement des commandes, paiements, sécurité, conformité et amélioration de la plateforme.

## Vos droits
Accès, rectification, suppression, limitation et opposition conformément à l'Act 843. Exercez vos droits via [Droits sur les données](/legal/data-rights) ou le [Centre de confidentialité](/dashboard/privacy-center).

## Cookies
Voir [Politique des cookies](/legal/cookie).

## Contact
${company} — ${email} | ${phone}`,

  refund: `## Nature du service
Celeventic fournit des invitations numériques personnalisées via InvitationOS. Une fois la production créative commencée, les ressources sont allouées spécifiquement à votre projet.

## Forfaits

| Forfait | Prix (GHS) | Révisions incluses |
|---------|------------|-------------------|
| Starter | Gratuit | 1 |
| Celebration | 199 | 2 |
| Signature | 499 | 3 |
| Prestige | 999 | 5 |
| Bespoke | 2 499 | 10 |

## Remboursement intégral — avant production
Remboursement possible si annulation avant le début de la production et dans les 48 heures suivant le paiement.

## Pas de remboursement après production
Une fois le statut **Production commencée** ou au-delà, les frais ne sont généralement pas remboursables.

## Frais de processeur
Les frais Paystack peuvent être déduits des remboursements approuvés.

## Révisions avant remboursement
Utilisez d'abord vos révisions incluses — voir [Politique de révision](/legal/revision-policy).

## Demande de remboursement
Contactez ${email} ou ${phone} avec votre référence de commande. Délai de traitement : 14 jours ouvrables.

## Contact
${email} | ${phone}`,

  cookie: `## Qu'est-ce qu'un cookie
Les cookies sont de petits fichiers texte stockés sur votre appareil. Celeventic utilise également le stockage local et les jetons de session sécurisés.

## Utilisation

| Type | Finalité |
|------|----------|
| Nécessaires | Connexion (NextAuth), sécurité, consentement |
| Fonctionnels | Langue (FR/EN), devise (GHS/USD/GBP) |
| Analytiques | Usage des fonctionnalités (avec consentement) |
| Marketing | Mesure de campagnes (avec consentement) |

## Cookies nécessaires

| Nom | Finalité | Durée |
|-----|----------|-------|
| session / auth | Connexion sécurisée | Session |
| celeventic_cookie_consent | Choix de la bannière | 12 mois |
| locale / currency | Langue et devise | 12 mois |

## Tiers
Paystack peut définir des cookies lors du paiement.

## Gestion du consentement
Bannière au premier visit. Modifiez vos choix dans le [Centre de confidentialité](/dashboard/privacy-center).

## Politiques associées
[Politique de confidentialité](/legal/privacy) · [Droits sur les données](/legal/data-rights)

## Contact
${email} | ${phone}`,

  "revision-policy": `## Aperçu
Chaque forfait Celeventic inclut un nombre défini de tours de révision de design, gérés via votre tableau de bord.

## Révisions par forfait

| Forfait | Révisions | Livraison |
|---------|-----------|-----------|
| Starter | 1 | 1 jour |
| Celebration | 2 | 2 jours |
| Signature | 3 | 3 jours |
| Prestige | 5 | 5 jours |
| Bespoke | 10 | Sur mesure |

## Changements mineurs vs majeurs

### Mineurs (souvent sans crédit de révision)
- Date, heure ou lieu
- Numéro de téléphone
- Corrections orthographiques

### Majeurs (compte comme révision)
- Changement de thème ou couleurs
- Structure de mise en page
- Nouvelles sections de design

## Révisions supplémentaires
Au-delà du forfait : GHS 79 par tour par défaut.

## Soumettre une révision
Via votre commande dans le tableau de bord ou par e-mail à ${email}.

## Politiques associées
[Conditions générales](/legal/terms) · [Politique de remboursement](/legal/refund)

## Contact
${email} | ${phone}`,

  "intellectual-property": `## Propriété Celeventic
${company} conserve tous les droits sur :

- Le code source, les API et l'architecture logicielle
- Les modèles d'invitation de base et systèmes de design
- Les actifs de marque Celeventic et la documentation
- Les outils AGI Engine / Celeventic Intelligence

## Votre propriété
Vous conservez vos photos, vidéos, noms, détails d'événement et messages personnels.

## Licence à Celeventic
Vous accordez une licence limitée pour héberger et afficher votre contenu afin de fournir vos services d'invitation.

## Consentement portfolio
À la caisse, choisissez d'autoriser ou non la présentation de votre invitation dans notre portfolio.

## Restrictions
Interdiction de copier, revendre ou redistribuer les modèles ou systèmes Celeventic.

## Signalement
Signalez les problèmes de PI à ${email}.

## Politiques associées
[Conditions générales](/legal/terms) · [Politique de confidentialité](/legal/privacy)

## Contact
${email} | ${phone}`,

  "data-rights": `## Vos droits
Conformément à l'Act 843, vous disposez de droits sur vos données personnelles traitées par Celeventic.

## Droit d'accès
Les utilisateurs connectés peuvent exporter un fichier JSON depuis le Centre de confidentialité (profil, commandes, paiements, événements, historique de consentement).

## Droit de rectification
Mettez à jour vos informations via le tableau de bord ou contactez ${email}.

## Droit à l'effacement
Demandez la suppression de votre compte, sous réserve des obligations légales de conservation.

## Gestion des cookies
Consultez et modifiez vos préférences dans le [Centre de confidentialité](/dashboard/privacy-center).

## Comment exercer vos droits

1. **Connectez-vous** à votre compte Celeventic
2. Allez dans **Tableau de bord → Centre de confidentialité**
3. Utilisez **Exporter les données** ou **Demander la suppression**
4. Ou envoyez un e-mail à ${email} avec l'objet « Demande de droits sur les données »

Réponse sous 30 jours sauf prolongation légale.

## Données invité
Si vous êtes invité sans compte, contactez d'abord l'organisateur ou ${email}.

## Réclamations
Vous pouvez contacter la Commission ghanéenne de protection des données.

## Politiques associées
[Politique de confidentialité](/legal/privacy) · [Politique des cookies](/legal/cookie) · [Conditions générales](/legal/terms)

## Contact
${email} | ${phone}`,
};
