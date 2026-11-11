# CeleYou universal contact sharing tests

## Automated

Suite: `npm run test:celeyou`

Covered in this increment:

- Valid vCard 3.0 with CRLF, FN/N, ORG, TITLE, TEL, EMAIL
- Permanent `https://www.celeventic.com/card/{slug}` website field
- `/u/{slug}` rewritten onto `/card/{slug}`
- Localhost, query tokens, and foreign hosts rejected
- Unicode display names
- International `+233` numbers
- Comma, semicolon, and newline escaping
- 75-octet line folding
- Filename sanitization
- Oversized PHOTO omitted
- Protected reach redacted from guest vCards
- Unpublished / suspended vCard channel blocked
- Guest-shareable trial and paid cards allowed
- NameDrop copy never claims URL transfer
- Share desk includes Save Contact, Share Contact File, Set Up NameDrop

Physical-device cases below are **Not tested** in this increment.

## Device acceptance

| Device | Check | Result |
|---|---|---|
| iPhone Safari | vCard download / Add to Contacts | Not tested |
| iPhone Safari | Website field preserved | Not tested |
| iPhone Safari | AirDrop of profile URL | Not tested |
| iPhone Safari | AirDrop of `.vcf` | Not tested |
| Samsung Internet | vCard import | Not tested |
| Android Chrome | vCard import | Not tested |
| Android Chrome | Quick Share | Not tested |

Do not treat the automated suite as proof of AirDrop, NameDrop, or Contacts import on hardware.
