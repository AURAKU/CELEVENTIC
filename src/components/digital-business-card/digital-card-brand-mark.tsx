import { cn } from "@/lib/utils";
import { DIGITAL_CARD_BRAND_PATHS } from "@/lib/digital-business-card/brand-paths";

const PHONE_RECEIVER_PATH =
  "M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z";

const CONTACT_MARKS: Record<string, { color: string; ink: string; paths: string[]; stroke?: boolean; evenodd?: boolean }> = {
  email: {
    color: "#B45309",
    ink: "#FFF7ED",
    paths: [
      "M1.5 8.67v8.58A3 3 0 0 0 4.5 20.25h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z",
      "M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z",
    ],
  },
  phone: {
    color: "#34C759",
    ink: "#FFFFFF",
    evenodd: true,
    paths: [PHONE_RECEIVER_PATH],
  },
  "phone-personal": {
    color: "#34C759",
    ink: "#FFFFFF",
    evenodd: true,
    paths: [PHONE_RECEIVER_PATH],
  },
  "phone-business": {
    color: "#1E3A5F",
    ink: "#F8FAFC",
    evenodd: true,
    paths: [PHONE_RECEIVER_PATH],
  },
  bank: {
    color: "#0B2545",
    ink: "#F8FAFC",
    paths: [
      "M12 3.6 20.4 8v1.1H3.6V8L12 3.6Zm-6.4 6.7h1.9v6.2H5.6V10.3Zm4.3 0h1.9v6.2H9.9V10.3Zm4.2 0h1.9v6.2h-1.9V10.3Zm4.3 0h1.9v6.2h-1.9V10.3ZM4.4 17.3h15.2v1.25H4.4V17.3Zm-.85 2h16.9v1.15H3.55V19.3Z",
    ],
  },
  website: {
    color: "#007AFF",
    ink: "#FFFFFF",
    evenodd: true,
    paths: [
      "M12 2.2a9.8 9.8 0 1 1 0 19.6 9.8 9.8 0 0 1 0-19.6Zm0 1.85a7.95 7.95 0 1 0 0 15.9 7.95 7.95 0 0 0 0-15.9Z",
      "M16.55 7.2 13.28 14.55 7.45 16.8 10.72 9.45 16.55 7.2Zm-4.55 4.05a.95.95 0 1 0 .02 1.9.95.95 0 0 0-.02-1.9Z",
    ],
  },
  location: {
    color: "#B45309",
    ink: "#FFFBEB",
    evenodd: true,
    paths: [
      "M12 3.4c-3.7 0-6.7 2.95-6.7 6.6 0 4.55 5.35 10.15 6.32 11.16a.55.55 0 0 0 .76 0C13.35 20.15 18.7 14.55 18.7 10c0-3.65-3-6.6-6.7-6.6Zm0 9.05a2.55 2.55 0 1 1 0-5.1 2.55 2.55 0 0 1 0 5.1Z",
    ],
  },
  meeting: {
    color: "#0B8A83",
    ink: "#F4FFFD",
    evenodd: true,
    paths: [
      "M6.4 4.35h11.2A2.15 2.15 0 0 1 19.75 6.5v12.35A2.15 2.15 0 0 1 17.6 21H6.4A2.15 2.15 0 0 1 4.25 18.85V6.5A2.15 2.15 0 0 1 6.4 4.35Zm.45 5.2h10.3v8.9H6.85v-8.9Z",
      "M8.15 3.1h1.7v3.05H8.15V3.1Zm5.95 0h1.7v3.05h-1.7V3.1ZM8.6 12.05h2.35v2.35H8.6v-2.35Zm4.45 0h2.35v2.35h-2.35v-2.35Z",
    ],
  },
  other: {
    color: "#44403C",
    ink: "#FAFAF9",
    evenodd: true,
    paths: [
      "M7.15 3.6h6.2L17.4 7.7v12.7H7.15V3.6Zm6.2 0v4.1h4.05",
      "M10.2 12.15h5.1a2.35 2.35 0 0 1 0 4.7h-1.15v-1.35h1.15a1 1 0 1 0 0-2H10.2a2.35 2.35 0 0 0 0 4.7h1.2v1.35H10.2a3.7 3.7 0 0 1 0-7.4Z",
    ],
  },
  momo: {
    color: "#FFCB05",
    ink: "#111111",
    paths: [
      "M2.05 17.35V6.7h2.2L7.1 13.2 9.95 6.7h2.2v10.65H10.3V10.2L7.85 16.7H6.35L3.9 10.2v7.15H2.05Zm10.35 0V8.85h-2.35V6.7h7.15v2.15h-2.35v8.5h-2.45Zm5.55 0V6.7h2.2l4.15 6.55V6.7h1.95v10.65h-2.2l-4.15-6.55v6.55h-1.95Z",
    ],
  },
  telecelcash: {
    color: "#E32526",
    ink: "#FFFFFF",
    evenodd: true,
    paths: [
      "M12 4.35c-3.22-.03-5.81 2.62-5.8 5.77.01 3.34 2.81 5.8 5.73 5.75 3.1.03 5.75-2.45 5.78-5.67C17.76 6.82 15.08 4.38 12 4.35Zm2.3 3.93c-.05.46-.33.74-.75.88-.23.08-.47.08-.72.08-.15 0-.3-.01-.45.01-.11.02-.17.07-.18.19-.02.16.01.31 0 .46v1.9c0 .1.01.21.03.31.09.4.43.64.84.59.31-.04.63-.04.95-.07.13-.01.17.05.16.19v.63c.03.44-.18.75-.55.91-1.01.42-2.01.41-2.93-.25-.5-.36-.77-.88-.8-1.52-.04-.82-.05-1.65-.08-2.47-.03-.83-.02-1.67-.01-2.5 0-.56.26-1.01.67-1.38.23-.2.48-.37.76-.5.25-.12.51-.17.79-.16.1 0 .13.04.14.14.03.26.01.53.02.77v.6c0 .17.06.23.23.25.12.02.23 0 .35 0h1.2c.24 0 .31.07.3.31-.01.21.03.41 0 .62h-.01Z",
    ],
  },
  airteltigo: {
    color: "#ED1C24",
    ink: "#FFFFFF",
    evenodd: true,
    paths: ["M12 5.2 19.15 19h-2.85l-1.15-2.55H8.85L7.7 19H4.85L12 5.2Zm0 5.15-1.95 4.35h3.9L12 10.35Z"],
  },
  mpesa: {
    color: "#00A651",
    ink: "#FFFFFF",
    paths: ["M5.4 18.4V5.7h2.85L12 13.05 15.75 5.7H18.6v12.7h-2.55V9.85L12 16.55 7.95 9.85v8.55H5.4Z"],
  },
  paypal: {
    color: "#003087",
    ink: "#FFFFFF",
    paths: [
      "M7.016 19.198h-4.2a.562.562 0 0 1-.555-.65L5.093.584A.692.692 0 0 1 5.776 0h7.222c3.417 0 5.904 2.488 5.846 5.5-.006.25-.027.5-.066.747A6.794 6.794 0 0 1 12.071 12H8.743a.69.69 0 0 0-.682.583l-.325 2.056-.013.083-.692 4.39-.015.087z",
      "M19.79 6.142c-.01.087-.01.175-.023.261a7.76 7.76 0 0 1-7.695 6.598H9.007l-.283 1.795-.013.083-.692 4.39-.134.843-.014.088H6.86l-.497 3.15a.562.562 0 0 0 .555.65h3.612c.34 0 .63-.249.683-.585l.952-6.031a.692.692 0 0 1 .683-.584h2.126a6.793 6.793 0 0 0 6.707-5.752c.306-1.95-.466-3.744-1.89-4.906z",
    ],
  },
  cashapp: {
    color: "#00D632",
    ink: "#FFFFFF",
    paths: [
      "M11.2 4.85V3.35h1.65v1.45c2.55.22 4.2 1.72 4.2 3.85 0 2.4-1.55 3.55-3.55 3.98v4.7c1.2-.18 2-.75 2.35-1.55l1.9.72c-.55 1.72-2.2 2.78-4.25 3v1.5H11.2v-1.48c-2.65-.22-4.4-1.82-4.4-4.2 0-2.48 1.62-3.62 3.75-4.02V6.95c-1.1.15-1.82.75-2.12 1.48l-1.85-.7c.52-1.6 2.05-2.62 3.97-2.88Zm1.65 8.85c1.4.32 2.15.95 2.15 1.95 0 1.02-.82 1.65-2.15 1.82v-3.77Zm-1.65-6.7v3.35c-1.28-.3-2-.88-2-1.75 0-.85.7-1.42 2-1.6Z",
    ],
  },
  zelle: {
    color: "#6D1ED4",
    ink: "#FFFFFF",
    paths: ["M4.4 4.2h15.2v3.35H9.85L19.6 16.45v3.35H4.4v-3.35h9.75L4.4 7.55V4.2Z"],
  },
  venmo: {
    color: "#008CFF",
    ink: "#FFFFFF",
    paths: [
      "M21.55 4.35c.52 1.22.8 2.55.8 3.95 0 4.85-4.02 10.85-7.35 14.7H8.4L5.55 5.05l5.85-.55 1.48 12.05c1.42-2.28 3.18-5.85 3.18-8.28 0-1.38-.25-2.32-.6-3.08l6.09-.84Z",
    ],
  },
  alipay: {
    color: "#1677FF",
    ink: "#FFFFFF",
    evenodd: true,
    paths: [
      "M19.695 15.07c3.426 1.158 4.203 1.22 4.203 1.22V3.846c0-2.124-1.705-3.845-3.81-3.845H3.914C1.808.001.102 1.722.102 3.846v16.31c0 2.123 1.706 3.845 3.813 3.845h16.173c2.105 0 3.81-1.722 3.81-3.845v-.157s-6.19-2.602-9.315-4.119c-2.096 2.602-4.8 4.181-7.607 4.181-4.75 0-6.361-4.19-4.112-6.949.49-.602 1.324-1.175 2.617-1.497 2.025-.502 5.247.313 8.266 1.317a16.796 16.796 0 0 0 1.341-3.302H5.781v-.952h4.799V6.975H4.77v-.953h5.81V3.591s0-.409.411-.409h2.347v2.84h5.744v.951h-5.744v1.704h4.69a19.453 19.453 0 0 1-1.986 5.06c1.424.52 2.702 1.011 3.654 1.333m-13.81-2.032c-.596.06-1.71.325-2.321.869-1.83 1.608-.735 4.55 2.968 4.55 2.151 0 4.301-1.388 5.99-3.61-2.403-1.182-4.438-2.028-6.637-1.809",
    ],
  },
  wechatpay: {
    color: "#07C160",
    ink: "#FFFFFF",
    paths: [
      "M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z",
    ],
  },
  wise: {
    color: "#9FE870",
    ink: "#163300",
    paths: ["M19.2 21.6H23.6L18.55 2.4h-4.05L9.7 13.55 4.85 2.4H.8L6.05 21.6h4.05l5.15-11.7 3.95 11.7Z"],
  },
  revolut: {
    color: "#191C1F",
    ink: "#FFFFFF",
    paths: [
      "M9.85 2.4H21.6v10.35c0 4.05-2.42 6.95-6.2 6.95H9.85V21.6H2.4V2.4h7.45Zm.2 3.85v9.2h4.75c1.95 0 3.1-1.28 3.1-3.22V6.25H10.05Z",
    ],
  },
  paystack: {
    color: "#011B33",
    ink: "#00C3F7",
    paths: ["M4.4 4.4h15.2v4.05H4.4V4.4Zm0 5.55h11.35v4.05H4.4V9.95Zm0 5.55h7.9v4.05H4.4v-4.05Z"],
  },
  flutterwave: {
    color: "#FB8E20",
    ink: "#FFFFFF",
    paths: ["M3.6 4.2h8.15L8.9 12.05H3.6V4.2Zm9.05 0H20.4L13.2 20.8h-5.3L12.65 4.2Z"],
  },
  gcash: {
    color: "#007CFF",
    ink: "#FFFFFF",
    paths: [
      "M8.05 8.35c0-2.35 1.98-4.15 3.95-4.15 1.62 0 3 .92 3.62 2.22l-1.82 1.12c-.32-.62-.98-1.02-1.8-1.02-1.15 0-1.98.92-1.98 2.05v4.86c0 1.12.83 2.05 1.98 2.05.82 0 1.48-.4 1.8-1.02l1.82 1.12c-.62 1.3-2 2.22-3.62 2.22-1.97 0-3.95-1.8-3.95-4.15V8.35Zm5.7 2.55h3.55v2.2h-3.55v-2.2Z",
    ],
  },
  chipper: {
    color: "#12B76A",
    ink: "#FFFFFF",
    paths: [
      "M4.15 13.35c.55-4.85 4.55-8.95 10.05-9.55 1.95 2.05 2.85 4.7 2.35 7.35-2.55.55-5.15.35-7.55-.7 1.95 1.85 4.65 2.95 7.7 3.05-4.15 3.85-9.85 2.85-12.55-.15Z",
      "M14.7 16.85c1.55.15 3.05-.2 4.35-1.05.35 1.55.15 3.15-.7 4.55-2.05-.55-3.55-1.85-4.35-3.5h.7Z",
    ],
  },
};

export const PAY_BRAND_IMAGES: Record<string, string> = {
  bank: "/digital-cards/brands/bank.svg",
  momo: "/digital-cards/brands/momo.svg",
  telecelcash: "/digital-cards/brands/telecelcash.svg",
  airteltigo: "/digital-cards/brands/airteltigo.svg",
  mpesa: "/digital-cards/brands/mpesa.svg",
  paypal: "/digital-cards/brands/paypal.svg",
  cashapp: "/digital-cards/brands/cashapp.svg",
  zelle: "/digital-cards/brands/zelle.svg",
  venmo: "/digital-cards/brands/venmo.svg",
  alipay: "/digital-cards/brands/alipay.svg",
  wechatpay: "/digital-cards/brands/wechatpay.svg",
  wise: "/digital-cards/brands/wise.svg",
  revolut: "/digital-cards/brands/revolut.svg",
  paystack: "/digital-cards/brands/paystack.svg",
  flutterwave: "/digital-cards/brands/flutterwave.svg",
  gcash: "/digital-cards/brands/gcash.svg",
  chipper: "/digital-cards/brands/chipper.svg",
};

const IMAGE_MARKS: Record<string, string> = {
  trendshub: "/digital-cards/brands/trendshub.png",
  ...PAY_BRAND_IMAGES,
};

const GRADIENTS: Record<string, string> = {
  instagram: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fd5949 45%, #d6249f 60%, #285AEB 90%)",
  tiktok: "linear-gradient(135deg, #25F4EE 0%, #111111 42%, #111111 58%, #FE2C55 100%)",
};

function resolveMark(id: string): { color: string; ink: string; paths: string[]; stroke?: boolean; evenodd?: boolean } {
  if (CONTACT_MARKS[id]) return CONTACT_MARKS[id];
  const brand = DIGITAL_CARD_BRAND_PATHS[id];
  if (brand) return brand;
  return CONTACT_MARKS.website;
}

export function hasOfficialBrandMark(id: string): boolean {
  return Boolean(IMAGE_MARKS[id] || CONTACT_MARKS[id] || DIGITAL_CARD_BRAND_PATHS[id]);
}

function inkOn(color: string): string {
  const match = color.trim().match(/^#([0-9a-fA-F]{6})$/);
  if (!match) return "#FFF7ED";
  const hex = match[1];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 150 ? "#FFF7ED" : "#1C1917";
}

export function DigitalCardBrandMark({
  id,
  className,
  color,
}: {
  id: string;
  className?: string;
  color?: string;
}) {
  const image = IMAGE_MARKS[id];
  if (image) {
    return (
      <span
        className={cn(
          "relative inline-flex aspect-square size-9 shrink-0 overflow-hidden rounded-[11px] bg-white shadow-[0_6px_14px_rgba(15,23,42,0.16)] ring-1 ring-black/5",
          className
        )}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={id === "paypal" ? `${image}?v=official-pp` : image}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      </span>
    );
  }
  const mark = resolveMark(id);
  const stroked = "stroke" in mark && mark.stroke;
  const fill = color || mark.color;
  const ink = color ? inkOn(fill) : mark.ink;
  return (
    <span
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-[11px] shadow-[0_6px_14px_rgba(15,23,42,0.16)] ring-1 ring-black/5",
        className
      )}
      style={{ background: GRADIENTS[id] || fill }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-[78%] w-[78%]" fill="none">
        {mark.paths.map((d, index) =>
          stroked ? (
            <path
              key={index}
              d={d}
              stroke={ink}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path key={index} d={d} fill={ink} fillRule={mark.evenodd ? "evenodd" : undefined} />
          )
        )}
      </svg>
    </span>
  );
}
