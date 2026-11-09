const { pathToFileURL } = require("url");
const path = require("path");
const FONT = '/Users/auratheking/Documents/Aura Group Innovative/Celeventic/CELEVENTIC-main/scripts/local-font-mocks/latin.woff2';

function cssFor(url) {
  const raw = String(url);
  const family = decodeURIComponent(raw)
    .match(/family=([^:&]+)/)?.[1]
    ?.replace(/\+/g, " ")
    ?.split(":")[0] || "MockFont";
  return [
    `@font-face{font-family:'${family}';font-style:normal;font-weight:100 900;font-display:swap;src:url('${FONT}') format('woff2');unicode-range:U+0000-00FF;}`,
    `@font-face{font-family:'${family}';font-style:italic;font-weight:100 900;font-display:swap;src:url('${FONT}') format('woff2');unicode-range:U+0000-00FF;}`,
  ].join("\n");
}

module.exports = new Proxy(
  { __esModule: true },
  {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop !== "string") return undefined;
      if (prop === "then") return undefined;
      return cssFor(prop);
    },
    has() {
      return true;
    },
  }
);
