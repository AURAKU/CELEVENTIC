# CeleYou Universal Connect

One connection experience for iPhone and Android. Recipients open HTTPS. They do not need a CeleYou account or app.

## Actions

| Action | What it does |
| --- | --- |
| Tap to Share | Opens the OS share sheet through the Web Share API. AirDrop or Quick Share can appear there. CeleYou does not start them itself. Falls back to copying the session link. |
| Scan to Connect | Shows the existing short-lived QR. The QR encodes `/tap/{pairingToken}`. |
| Share Link | Copies the same session URL. The URL is valid only while the session is open. |

All three land on `CeleYouTapGuestView`.

## Guest

The guest can view the public card, save a vCard, exchange contact details with explicit consent, and continue without registration.

Save Contact never writes the address book by itself. iPhone opens Add to Contacts. Android shares or downloads a `.vcf`.

## Security

- 256-bit pairing token in the QR and share URL
- Short typed join code stays for manual entry
- Session expiry and cancel still apply
- Share helpers reject URLs that carry email, phone, or visitor fields
- Connect Back consent, duplicate window, rate limits, and private-field filtering stay in place
- Host receipts still wait for the connection commit

## Tests

```
npm run test:celeyou
npx playwright test --config=playwright.config.ts e2e/celeyou-universal-connect.spec.ts
```

Device combinations: `docs/celeyou/universal-connect-device-matrix.md`. Do not mark hardware rows passed unless a physical pair was used.
