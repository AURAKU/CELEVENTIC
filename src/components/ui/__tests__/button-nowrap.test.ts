import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";
import { buttonVariants } from "../button";

describe("button phrases stay on one line", () => {
  it("keeps the shared Button label on a single line at every breakpoint", () => {
    const classes = buttonVariants();
    assert.match(classes, /whitespace-nowrap/);
    assert.match(classes, /flex-nowrap/);
    assert.match(classes, /\[&_svg\]:shrink-0/);
    assert.doesNotMatch(classes, /whitespace-normal/);
  });

  it("locks CTA links and native buttons so overflow-wrap cannot split Explore", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    assert.match(css, /button,\s*[\s\S]*a\.inline-flex/);
    assert.match(css, /a\.flex/);
    assert.match(css, /a\.grid/);
    assert.match(css, /white-space:\s*nowrap/);
    assert.match(css, /text-wrap:\s*nowrap/);
    assert.match(css, /flex-wrap:\s*nowrap/);
    assert.match(css, /\.cta-phrase-grid/);
    assert.match(css, /#share \.grid/);
    assert.match(css, /\.celecard-action-label/);
    assert.match(css, /\.celecard-term-chip-label/);
    assert.match(css, /minmax\(min\(100%, 12\.5rem\), 1fr\)/);
    assert.match(css, /button p \{/);
  });
});
