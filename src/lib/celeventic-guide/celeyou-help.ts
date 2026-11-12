export type ContextHelpTopic = {
  title: string;
  body: string;
};

/** Cardholder Studio Help. Explains the desk the owner uses, not the guest page. */
export const CELEYOU_STUDIO_HELP_INTRO =
  "This Studio is for you, the cardholder. Guests never see it. They open your public CeleYou from a link, QR, or a programmed NFC card. No app and no account.";

export const CELEYOU_STUDIO_HELP_TOPICS: ContextHelpTopic[] = [
  {
    title: "Activity",
    body: "Live counts from people who open this CeleYou and use published actions. Use Today, 7 days, 30 days, This month, or All time. The calendar lets you pick a start date, then an end date. All time keeps the lifetime total. A dated window only counts actions from those dates.",
  },
  {
    title: "Activation",
    body: "Choose a plan so the public page stays live. While a paid term is running you cannot renew or upgrade until that term ends.",
  },
  {
    title: "Identity and Design",
    body: "Name, portrait, company, and look live here. Save to publish changes. Guests see the saved plate, not the draft.",
  },
  {
    title: "Contact and Reach",
    body: "Add mail, numbers, sites, chat, and wallets. Guests only see what you fill. Tap a network to add or edit it.",
  },
  {
    title: "Access codes",
    body: "On each detail choose Public, Code, or Ask. Public stays open on the guest page. Code stays hidden until the guest enters that access code. Ask keeps it off the public page until you approve a request. Details you do not mark stay public.",
  },
  {
    title: "Connections and follow-ups",
    body: "When a guest Connects Back, their intro arrives in Connections. Follow-ups are off until you turn them on for this card.",
  },
  {
    title: "Share My Card",
    body: "Opens the share sheet with your live public link and the current plate, so WhatsApp and other apps show the card.",
  },
  {
    title: "Copy Profile Link",
    body: "Copies the public URL of your live CeleYou. Paste it in a message and the live plate appears as the preview.",
  },
  {
    title: "Save Contact",
    body: "Saves your filled name, phones, mail, company, and public links into the right fields in Contacts on this phone or computer.",
  },
  {
    title: "Wallet card",
    body: "Opens a guest page of only the payment channels you uploaded: mobile money, send links, payment links, scan wallets, and bank details. Empty wallets stay off. Access codes still apply. This is not Apple Wallet or Google Wallet.",
  },
  {
    title: "Hold up this card",
    body: "Fills the screen with only the plate, as if you were holding a physical card. Guests can also tap the plate on the public page. Tap again to return to the full page. The QR stays ready to scan.",
  },
  {
    title: "NFC",
    body: "A programmed NFC card opens this CeleYou. Copy the NFC link to program a card, or share the QR.",
  },
];

export const CELEYOU_GUEST_HELP_INTRO =
  "A live CeleYou is someone’s public identity. You do not need an app or an account to open it.";

export const CELEYOU_GUEST_HELP_TOPICS: ContextHelpTopic[] = [
  {
    title: "Open the card",
    body: "Scan the QR with your camera, tap a programmed NFC card, or open the share link.",
  },
  {
    title: "Hold the plate",
    body: "Tap the card to fill the screen. Tap again to see the full page. The QR stays ready to scan.",
  },
  {
    title: "Share",
    body: "Sends this CeleYou’s public link. WhatsApp and similar apps show the live plate with the link.",
  },
  {
    title: "Save this contact",
    body: "Puts their filled name, phones, mail, company, and public links into the right fields in Contacts on your phone or computer.",
  },
  {
    title: "Connect Back",
    body: "Leaves your name and a way to reach you, so they can keep the intro. This is optional.",
  },
  {
    title: "Needs a code",
    body: "Some details stay hidden until the cardholder gives you an access code. Public details stay open.",
  },
  {
    title: "Payment channels",
    body: "Wallet card shows only the wallets, send links, and bank details they uploaded. Empty ones stay off. A locked row needs their access code.",
  },
];
