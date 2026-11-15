export type ContextHelpTopic = {
  title: string;
  body: string;
};

/** Cardholder Studio Help. Explains the desk the owner uses, not the guest page. */
export const CELEYOU_STUDIO_HELP_INTRO =
  "This Studio is for you, the cardholder. Guests never see it. They open your live public CeleYou from a link, QR, or a programmed NFC card. No app and no account.";

export const CELEYOU_STUDIO_HELP_TOPICS: ContextHelpTopic[] = [
  {
    title: "Activity",
    body: "Live counts from people who open this CeleYou and use published actions. Use Today, 7 days, 30 days, This month, or All time. The calendar lets you pick a start date, then an end date. All time keeps the lifetime total. A dated window only counts actions from those dates.",
  },
  {
    title: "Activation",
    body: "Publish on CeleYou Free and your public identity stays reachable. Try CeleYou Pro free for 7 days for premium studio tools, extra published cards, and advanced analytics. No payment is required to start the trial, and nothing is charged when it ends. A paid Pro term unlocks the same premium tools for longer. You cannot renew or upgrade while a paid term is still running.",
  },
  {
    title: "Username",
    body: "Your unique public address is celeventic.com/u/your-username. Display name can match other people. Username cannot. Share My Card and Copy Profile Link use this live address for your primary CeleYou.",
  },
  {
    title: "Identity and Design",
    body: "Name, portrait, company, and look live here. Save to publish changes. Guests see the saved live plate, not an unsaved draft.",
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
    body: "Opens the share sheet with your live activated public link (your /u/ username when claimed) and the published plate. WhatsApp and similar apps show that live card, not a studio draft.",
  },
  {
    title: "Copy Profile Link",
    body: "Copies the live public URL of this activated CeleYou. Paste it anywhere. Recipients open the same plate guests see from QR or NFC.",
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
    body: "A programmed NFC card opens this live CeleYou. Copy the NFC link to program a card, or share the Smart QR. Tap-to-Connect is optional nearby join for phones that support it.",
  },
];

export const CELEYOU_GUEST_HELP_INTRO =
  "A live CeleYou is someone’s public identity. You do not need an app or an account to open it.";

export const CELEYOU_GUEST_HELP_TOPICS: ContextHelpTopic[] = [
  {
    title: "Open the card",
    body: "Scan the Smart QR with your camera, tap a programmed NFC card, or open the share link to their live /u/ profile.",
  },
  {
    title: "Hold the plate",
    body: "Tap the card to fill the screen. Tap again to see the full page. The QR stays ready to scan.",
  },
  {
    title: "Share",
    body: "Sends this CeleYou’s live public link. WhatsApp and similar apps show the live plate with the link.",
  },
  {
    title: "Copy link",
    body: "Copies the live public URL so you can paste it in a message. It opens the same activated card.",
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
