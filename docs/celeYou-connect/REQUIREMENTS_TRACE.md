# CeleYou Connect requirements traceability

Date: 12 Nov 2026  
Branch: `feat/celeyou-connect`

| Req | Release | Implementation | Status |
|---|---|---|---|
| Guest Connect Back without an account | 1 | Existing `POST /api/digital-business-cards/connect` plus consent, company, title, follow-up opt-in | Complete |
| Explicit consent | 1 | Checkbox + `consent: true` required | Complete |
| Exchange Cards with confirm | 1 | `GET/POST /api/digital-business-cards/connect/exchange` | Complete |
| No silent private exchange | 1 | Public snapshot from unlocked reach only | Complete |
| Idempotent exchange | 1 | `pairKey` unique + P2002 catch | Complete |
| Self-connect blocked | 1 | Host `userId` vs session | Complete |
| Owner notifications | 1 | In-app + scheduled email | Complete |
| Auto follow-up | 1 | Per-card automation, default off, durable `runAfter` jobs | Complete |
| Delivery states | 1 | SCHEDULED / SENDING / SENT / FAILED. SENT = provider accepted | Complete |
| Inbox search / notes / statuses | 1 | `#studio-inbox` | Complete |
| Feature flags | 1 | `AdminSetting` `celeyou.connect.flags` | Complete |
| Relationship timeline UI | 2 | Events table writes in R1; UI flagged off | Partial |
| Smart reminders UI | 2 | Table exists; UI flagged off | Partial |
| Enrichment vendors | 2 | Flag off | Not Started |
| HubSpot / Salesforce / Zoho | 3 | No OAuth sandboxes | Blocked |
| Enterprise org cards | 4 | Event `Organization` is not CeleYou-scoped | Blocked |
| Bounce / unsubscribe / webhooks | 1 | No Resend webhook secret locally | Blocked |
| Live email send | 1 | Empty local Resend keys | Blocked (schedules anyway) |

Do not treat Blocked rows as shipped. Do not deploy without authorization.
