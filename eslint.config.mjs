import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/**
 * Invitation Studio 2.0 token purity: page/viewer components must style via
 * var(--inv-*) theme tokens only. Literal colors live solely in
 * src/lib/invitation-theme/ (registry + resolver).
 */
const invitationTokenPurity = {
  files: [
    "src/components/invitation-pages/**/*.{ts,tsx}",
    "src/components/invitation-paged/**/*.{ts,tsx}",
  ],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: "Literal[value=/#[0-9a-fA-F]{3,8}/]",
        message: "No hard-coded hex colors — use var(--inv-*) theme tokens.",
      },
      {
        selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}/]",
        message: "No hard-coded hex colors — use var(--inv-*) theme tokens.",
      },
      {
        selector: "Literal[value=/rgba?\\(/]",
        message: "No literal rgb()/rgba() colors — use var(--inv-*) theme tokens.",
      },
      {
        selector:
          "Literal[value=/(^|\\s)(text|bg|border|from|via|to|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d/]",
        message: "No Tailwind palette classes in invitation pages — use var(--inv-*) theme tokens.",
      },
    ],
  },
};

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  invitationTokenPurity,
];

export default eslintConfig;
