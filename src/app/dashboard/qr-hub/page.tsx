import { QrHubClient } from "./qr-hub-client";

export const metadata = {
  title: "Event QR & Pass Hub | Celeventic",
  description: "Create, download and manage every QR experience connected to your event.",
};

export default function QrHubPage() {
  return <QrHubClient />;
}
