# CeleCard product spec (MVP)

Promise: one card, one link, one QR, one NFC tap, every connection.

Visitors never register. Owners use the shared Celeventic account.

## Guest

Open `/card/{slug}` instantly. See identity, public reach, SAVE / CONNECT / SHARE / PAY when those actions exist. Empty actions stay hidden.

Locked items show the network name and a Code or Request action. Destinations stay on the server until a grant is valid.

## Owner

Studio at `/dashboard/business-card`. Draft, publish, themes, reach, pay wallets including bank details, QR copy, NFC copy. Privacy desk: visibility, codes, requests, Connect Back.

Publishing does not require payment methods. Public live does require an active paid plan (existing live gate).

## Payments

Share MoMo, bank transfer, and external pay links. Guests copy or scan. CeleCard does not hold balances.

## NFC

Tags store `/n/{deviceToken}` or `/c/{publicToken}` only. Content changes in the database. Studio must not claim every phone can beam a card to another phone.

## Out of scope for this MVP

Native apps, physical manufacturing, custodial wallet, international processor coverage claims, complex org trees, replacing the current card design system.
