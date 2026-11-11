# CeleYou vCard compatibility

Status vocabulary: **Implemented** | **Verified by automated tests** | **Verified on physical devices** | **Not tested** | **Blocked**.

## Format

| Item | Choice | Why |
|---|---|---|
| Version | vCard 3.0 | Broad iOS Contacts, Android Contacts, Outlook, and macOS Contacts support |
| Encoding | UTF-8 | Unicode names |
| Line endings | CRLF | RFC 2426 |
| Folding | 75 UTF-8 octets, continuation space | Long PHOTO and NOTE lines |
| MIME | `text/vcard` on Apple and desktop; `text/x-vcard` on Android | Common import handlers |
| iPhone delivery | `Content-Disposition: inline` | Safari can open Add to Contacts |
| Other delivery | `attachment` | Download a `.vcf` |
| Caching | `private, no-store` | Guest files must not be publicly cached |

## Website field

Every eligible export includes:

```
URL;TYPE=PREF:https://www.celeventic.com/card/{slug}
item1.URL:https://www.celeventic.com/card/{slug}
item1.X-ABLabel:CeleYou
```

`/u/{slug}` inputs are rewritten onto `/card/{slug}`. Localhost, query tokens, dashboard paths, and foreign hosts are rejected.

## Fields included

Only values already present on the server-side public payload:

- FN / N
- ORG / TITLE
- TEL / EMAIL / URL from unlocked reach
- GEO / ADR when a public location exists
- PHOTO JPEG when the portrait is small enough
- NOTE for public bio and pronouns

Protected, unpublished, suspended, and expired courtesy payloads do not export private contact details.

## Reused code

- `src/lib/digital-business-card/vcard.ts`
- `src/app/card/[slug]/contact.vcf/route.ts`
- `src/lib/digital-business-card/access.ts` `toGuestPublicPayload`
- `src/lib/app-url.ts` `celeYouGuestOrigin`

## Not claimed

Silent writes into the iOS Contacts database. NameDrop transferring the website field. AirDrop completing without recipient acceptance.
