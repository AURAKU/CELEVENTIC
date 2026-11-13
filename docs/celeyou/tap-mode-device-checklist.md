# CeleYou Tap Mode physical device checklist

Do not mark these passed unless a real iPhone or Android was used.

Staging URL: `https://<staging-host>` (not production until authorized).

Use two phones plus one laptop for the host screen.

## Setup

1. Sign in as a disposable staging cardholder.
2. Open `/dashboard/business-card/tap`.
3. Tap **Show Connection QR**.
4. Confirm the QR URL path is `/tap/` plus a long token, not the six-character code.

## iPhone Camera

- [ ] Camera preview stays still and focuses on the QR.
- [ ] Scan opens Safari (or the default browser) on the guest connection page.
- [ ] No App Store prompt is required.
- [ ] No CeleYou account is required.

## iPhone Safari

- [ ] Heading reads Connect Beyond the Tap.
- [ ] Save Contact, Exchange Contact, View Full Card, and Share are tappable.
- [ ] Guest form requires name, one contact method, and explicit consent.
- [ ] Success copy reads You're Connected.
- [ ] Closing Safari without submitting creates no inbox row.

## iPhone contact import

- [ ] Save Contact opens Add to Contacts or a `.vcf` share sheet.
- [ ] The visitor must confirm the save. The website must not silently write Contacts.
- [ ] Protected emails and phones are absent from the vCard.

## Android Camera

- [ ] Google Camera / Play services scan opens Chrome (or the default browser).
- [ ] The same `/tap/{token}` page loads without an app install.

## Android Chrome

- [ ] Guest landing is readable in portrait.
- [ ] Exchange Contact submits and shows You're Connected.
- [ ] The host laptop shows Connection Received with first name only.

## Android contact import

- [ ] Save Contact shares or downloads a `.vcf`.
- [ ] Opening the file in Contacts/People requires a confirmation tap.
- [ ] Public name, authorized phone/email, company, website, and profile URL are present when published.

## Two-phone member exchange

- [ ] Second CeleYou account signs in on the guest phone.
- [ ] Exchange Cards shows a preview without private fields.
- [ ] Confirm Exchange updates both inboxes as CeleYou Exchange.
- [ ] Repeating the exchange does not create a second pair.

## Failures to record

Device, OS version, browser, QR outcome, vCard outcome, and any error text.
