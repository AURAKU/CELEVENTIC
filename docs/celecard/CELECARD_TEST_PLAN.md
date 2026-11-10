# CeleCard test plan

## Unit (in repo now)

- Themes, live gate, withheld payload, social/pay catalog, bank details, QR guide mode, NFC capability without Web NFC, signup intent aliases.

## Unit (privacy batch)

- Visibility default PUBLIC
- Redaction strips destinations and keeps stubs
- Granted keys restore only assigned items
- Code normalize + reject wrong length / mixed types
- Hash is deterministic and does not equal plaintext
- Expired / revoked grants fail
- vCard omits protected phones and emails

## Integration (still missing unless noted)

- Public GET omits CODE_PROTECTED values
- Unlock sets cookie; second GET includes that item only
- Wrong code 401 + rate limit 429
- Cross-card grant cookie ignored
- Owner cannot PATCH another user’s card
- Connect 429 after burst

## Browser

- A New owner: register → create → publish (exists as product path; e2e not yet)
- B Guest: open live dummy, save vCard, open social (re-verified 2026-11-09; dummy stays fully public)
- C QR: `/c/demo-ama-serwaa` opens Ama
- D NFC URL: `/n/nfc-ama-serwaa` opens Ama (demo tokens)
- E Locked item → enter code → authorized item opens (unit redaction verified; owner/guest E2E pending login)
- F Request access → owner approves → grant URL opens item (APIs shipped; browser E2E pending login)
- G Pay: copy bank / open PayPal
- H Unauthorized: no private fields in document

Do not mark E/F complete until those journeys run in the browser.
