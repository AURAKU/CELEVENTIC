import { QrAdmissionClient } from "./qr-admission-client";

export const metadata = {
  title: "QR Admission | Celeventic",
  description: "Scan Celeventic QR codes to verify and check in guests and ticket holders.",
};

export default function QrAdmissionPage() {
  return <QrAdmissionClient />;
}
