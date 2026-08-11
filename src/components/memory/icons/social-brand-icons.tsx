import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

export function InstagramIcon({ title = "Instagram", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden={title ? undefined : true} {...props}>
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f58529" />
          <stop offset="50%" stopColor="#dd2a7b" />
          <stop offset="100%" stopColor="#8134af" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#igGrad)" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="#fff" />
    </svg>
  );
}

export function WhatsAppIcon({ title = "WhatsApp", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden={title ? undefined : true} {...props}>
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="11" fill="#25D366" />
      <path
        fill="#fff"
        d="M16.6 13.9c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1-.2.2-.6.7-.7.9-.1.1-.3.2-.5.1-.2-.1-.9-.3-1.7-1.1-.6-.6-1.1-1.3-1.2-1.5-.1-.2 0-.4.1-.5l.4-.5c.1-.1.1-.3.1-.4 0-.1 0-.3-.1-.4l-.7-1.6c-.2-.4-.4-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 3.9 3.4.5.2 1 .4 1.3.5.6.2 1.1.1 1.5.1.5-.1 1.3-.5 1.5-1 .2-.5.2-.9.1-1-.1-.1-.2-.1-.4-.2z"
      />
    </svg>
  );
}

export function SnapchatIcon({ title = "Snapchat", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden={title ? undefined : true} {...props}>
      {title ? <title>{title}</title> : null}
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#FFFC00" />
      <path
        fill="#111"
        d="M12 5.2c-2.2 0-3.6 1.5-3.6 3.5v1.1c0 .3-.3.7-1.1.9-.2.1-.3.3-.1.5.5.5 1.3.8 1.6 1.3.2.4 0 .8-.3 1.1-.5.4-1.4.5-2 .6-.2 0-.3.2-.2.4.3.6 1.4 1 2.3 1.2.2 0 .3.2.3.4 0 .6-.1 1.5.7 1.5.5 0 .9-.3 1.4-.3.5 0 .9.3 1.4.3.8 0 .7-.9.7-1.5 0-.2.1-.4.3-.4.9-.2 2-.6 2.3-1.2.1-.2 0-.4-.2-.4-.6-.1-1.5-.2-2-.6-.3-.3-.5-.7-.3-1.1.3-.5 1.1-.8 1.6-1.3.2-.2.1-.4-.1-.5-.8-.2-1.1-.6-1.1-.9V8.7c0-2-1.4-3.5-3.6-3.5z"
      />
    </svg>
  );
}

export function TikTokIcon({ title = "TikTok", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden={title ? undefined : true} {...props}>
      {title ? <title>{title}</title> : null}
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#111" />
      <path
        fill="#25F4EE"
        d="M14.2 6.2c.4 1.3 1.4 2.3 2.8 2.6v2.1c-1.1 0-2.1-.3-3-1v4.8c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4c.2 0 .5 0 .7.1v2.2c-.2-.1-.4-.1-.7-.1-1 0-1.8.8-1.8 1.8s.8 1.8 1.8 1.8 1.8-.8 1.8-1.8V6.2h2.4z"
      />
      <path
        fill="#FE2C55"
        d="M13.6 5.6c.4 1.3 1.4 2.3 2.8 2.6v1.5c-1.1 0-2.1-.3-3-1v4.2c0 2.2-1.8 4-4 4-.7 0-1.4-.2-2-.5.6 1.1 1.8 1.9 3.2 1.9 2.2 0 4-1.8 4-4V5.6h-1z"
        opacity="0.9"
      />
      <path
        fill="#fff"
        d="M13 6.8c.4 1.3 1.4 2.3 2.8 2.6v1.2c-1.1 0-2.1-.3-3-1v4.5c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4c.2 0 .5 0 .7.1v1.3c-.2-.1-.4-.1-.7-.1-1 0-1.8.8-1.8 1.8s.8 1.8 1.8 1.8 1.8-.8 1.8-1.8V6.8H13z"
      />
    </svg>
  );
}

/** Stylized mark for Trendshub — copy-link helper (no public share scheme in-repo). */
export function TrendshubIcon({ title = "Trendshub", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden={title ? undefined : true} {...props}>
      {title ? <title>{title}</title> : null}
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#0EA5A4" />
      <path
        fill="#fff"
        d="M7 15.5V8.5h2.2l1.6 4.2L12.4 8.5H14.6v7h-1.7v-4.1l-1.5 4.1h-1.2L9 11.4v4.1H7zm9.2 0V8.5h1.8v7h-1.8z"
      />
    </svg>
  );
}
