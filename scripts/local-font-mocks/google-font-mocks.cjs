const path = require("path");

const FONT = path.join(__dirname, "latin.woff2");

function cssFor(url) {
  const raw = String(url);
  const family =
    decodeURIComponent(raw)
      .match(/family=([^:&]+)/)?.[1]
      ?.replace(/\+/g, " ")
      ?.split(":")[0] || "MockFont";
  return [
    "/* latin */",
    `@font-face {`,
    `  font-family: '${family}';`,
    `  font-style: normal;`,
    `  font-weight: 100 900;`,
    `  font-display: swap;`,
    `  src: url(${FONT});`,
    `}`,
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
