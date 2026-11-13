# CeleYou Universal Connect device matrix

Do not mark a row passed unless that pair of physical devices was used.

Recipient never needs a CeleYou account or app. Success means the guest `/tap/{token}` page opened, Save Contact presented a vCard or Add to Contacts sheet, and Connect Back required consent.

| Host | Guest | Tap to Share | Scan to Connect | Share Link | Save Contact | Exchange | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| iPhone Safari | iPhone Safari | | | | | | AirDrop may appear in the sheet. CeleYou does not start it. |
| iPhone Safari | Android Chrome | | | | | | QR and link are the reliable paths. |
| Android Chrome | iPhone Safari | | | | | | Guest opens Safari from the HTTPS link. |
| Android Chrome | Android Chrome | | | | | | Quick Share may appear in the sheet. Do not use Android Beam. |

Also walk:

- Tablet Safari and Chrome
- Desktop Chrome, Safari, Firefox (QR + copy link)
- Expired session (410 copy, no private fields)
- Duplicate Connect Back within six hours
- Unauthorized `/dashboard/business-card/tap` without a session

Portrait and landscape on each phone.
