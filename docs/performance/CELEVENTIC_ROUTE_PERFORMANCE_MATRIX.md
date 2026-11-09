# Celeventic route performance matrix

Date: 7 Nov 2026  
Core Web Vitals were **not measured**. This matrix records query and pagination behaviour from source, not Lighthouse.

Helpers: `src/lib/pagination.ts` (`MAX_LIMIT` 100, `PUBLIC_GRID_LIMIT` 12, seating guest batch 500 / cap 10_000).

| Route / service | Data source | Pagination | Page size | Caching | Findings | Fixes this batch | Test results |
|---|---|---|---|---|---|---|---|
| `/discover` | discovery.service | Server take | 12 | v3 cache | Public DTO, no PII | None | Not measured |
| `/api/events` list | prisma.event | skip/take | 12 default | none | Picker `all=true` capped 200 | None | |
| `/api/guests` | getEventGuests | skip/take | 20 | none | Secondary peopleRows take 10_000 | None | |
| `/api/events/[id]/rsvp-export` | guests + latest rsvp | take 5000 | 5000 cap | none | Bounded export | Permission MANAGE_GUESTS | Unit CSV |
| `/api/events/[id]/seating` | guests cursor batch | 500 / 10_000 | 500 | none | Was leaking qrToken | Permission + strip token | Not load-tested |
| `/api/tickets/orders` | ticketOrder | skip/take | ADMIN_TABLE_LIMIT | none | OK | MANAGE_TICKETS on PATCH | |
| `/api/wallet` | wallet tx | skip/take | 10 | none | | MANAGE_FINANCES | |
| Inbox messages | message.service | in-memory after 500 | 500 load | none | N+1 risk | None | |
| Admin invitation catalog | invitation-admin.service | in-memory after unbounded findMany | unbounded | none | Must not load entire catalog | None | |
| Offline QR pack | offline-qr.service | take 5000 | 5000 | none | Tokens hashed | Prior batch | |
| Vendor directory | vendor-os | skip/take | 24/48 | none | availableDate filtered after take | Public DTO | |
| Invitation analytics | invitation-os | 200 orders / 500 events | caps | none | Coarse aggregates | None | |
| `/` landing | static + limited grids | PUBLIC_GRID_LIMIT | 12 | none | | Prior landing work | Not measured |

No route in this table has a recorded LCP/INP/CLS number from this session.
