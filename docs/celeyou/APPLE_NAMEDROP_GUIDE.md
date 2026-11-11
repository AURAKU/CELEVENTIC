# CeleYou NameDrop guide

NameDrop is an Apple feature. CeleYou cannot call it, simulate it, or guarantee that a website field is transferred.

## What CeleYou does

1. Export a vCard 3.0 file with the public `https://www.celeventic.com/card/{slug}` website.
2. On iPhone Safari, **Save Contact** opens the file inline so Add to Contacts can appear.
3. **Share My Card** uses the Web Share API with the same HTTPS profile URL. AirDrop can appear inside that sheet when both iPhones are unlocked.
4. **Share Contact File** shares the `.vcf` when `navigator.canShare({ files })` is true.
5. **Set Up NameDrop** shows Apple’s own steps and this notice:

> NameDrop is an Apple feature. Your CeleYou link can be saved in your iPhone contact card, but Apple determines which details are transferred.

## What the cardholder should do on iPhone

1. Download the CeleYou contact.
2. Open it in Contacts.
3. Confirm the CeleYou website is on the contact.
4. Set that contact as My Card.
5. Enable Bringing Devices Together in AirDrop settings.
6. Use Apple NameDrop with another compatible iPhone.

## Reliable alternatives

- AirDrop the public profile URL from Share My Card.
- Show the QR.
- Copy the profile link.
- Share or download the `.vcf`.

## Code

- `src/lib/celeyou-share/namedrop.ts`
- `src/components/digital-business-card/celeyou-namedrop-setup.tsx`
- `namedropClaimsUrlTransfer()` is always `false`.
