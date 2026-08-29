import { test, expect, devices } from "@playwright/test";

const runtime = "/dev/luxury-fashion-runtime?skipIntro=1&house=vale";

async function prepareContext(context: import("@playwright/test").BrowserContext) {
  await context.addInitScript(() => {
    try {
      localStorage.setItem("celeventic_cookie_consent", "essential");
    } catch {
      /* private mode */
    }
  });
}

async function dismissCookieBanner(page: import("@playwright/test").Page) {
  const essential = page.getByRole("button", { name: /essential only/i });
  try {
    if (await essential.isVisible({ timeout: 2_500 }).catch(() => false)) {
      await essential.click({ force: true, timeout: 3_000 });
    }
  } catch {
    /* banner already gone */
  }
  await page.evaluate(() => {
    document.querySelectorAll('[aria-label="Privacy & Cookies"]').forEach((node) => {
      const el = node as HTMLElement;
      el.style.display = "none";
      el.style.pointerEvents = "none";
    });
  });
}

test.describe("Luxury fashion engine is reusable beyond Femmora", () => {
  test("Maison Vale uses the same opening without Femmora DNA or store film", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const context = await browser.newContext(devices["iPhone 13"]);
    await prepareContext(context);
    const page = await context.newPage();
    await page.goto(runtime, { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);

    const unveil = page.getByRole("button", { name: /enter the atelier/i });
    await expect(unveil).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("THE NIGHT OPENS", { exact: true })).toBeVisible();
    await expect(page.getByText("In darker gold", { exact: true })).toBeVisible();
    await expect(page.getByText("Soft Opening")).toHaveCount(0);
    await expect(page.getByText(/femmora/i)).toHaveCount(0);
    await dismissCookieBanner(page);
    await unveil.click();
    const opening = page.getByTestId("luxury-fashion-opening");
    try {
      await expect(opening).toBeVisible({ timeout: 8_000 });
    } catch {
      await unveil.focus();
      await page.keyboard.press("Enter");
    }

    await expect(opening).toBeVisible({ timeout: 20_000 });
    const silk = page.getByTestId("fashion-silk-stage");
    await expect(page.getByTestId("fashion-silk-stage")).toBeVisible({ timeout: 15_000 });
    await expect(opening).toHaveAttribute("data-opening-style", "silk-only");
    await expect(opening).toHaveAttribute("data-fashion-phase", "silk", { timeout: 8_000 });
    await expect(silk).toBeEnabled({ timeout: 5_000 });
    await silk.click({ force: true });

    await expect(page.getByTestId("fashion-opening-film")).toHaveCount(0);
    await expect(opening).toBeHidden({ timeout: 15_000 });

    const hub = page.getByTestId("luxury-fashion-flagship");
    await expect(hub).toBeVisible({ timeout: 15_000 });
    await expect(hub).toHaveAttribute("data-fashion-house", "MAISON VALE");
    await expect(hub.getByText("MAISON VALE").first()).toBeVisible();
    await expect(hub.getByText(/kilimani/i).first()).toBeVisible();
    await expect(hub.getByTestId("fashion-details").getByText(/12th & 13th september/i)).toBeVisible();
    await expect(page.getByTestId("fashion-film-scene")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /store preview/i })).toHaveCount(0);
    await page.getByTestId("fashion-nav").getByRole("button", { name: /view collection/i }).click();
    await expect(page.getByTestId("fashion-lookbook")).toBeVisible();
    const valeLooks = page.locator("[data-testid='fashion-lookbook'] img");
    await expect(valeLooks).toHaveCount(2);
    const valeSrcs = await valeLooks.evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLImageElement).getAttribute("src") ?? "")
    );
    expect(valeSrcs.every((src) => !src.includes("/templates/femmora"))).toBeTruthy();
    expect(valeSrcs.some((src) => /look-crystal-knit|look-floral-mini|look-pearl-gown/.test(src))).toBeFalsy();
    await expect(page.getByTestId("fashion-social")).toHaveCount(0);
    await expect(page.getByTestId("fashion-social-finale")).toHaveCount(0);
    await expect(page.getByText(/westlands/i)).toHaveCount(0);
    await expect(page.getByText(/femmora_gh/i)).toHaveCount(0);
    await expect(page.getByText(/femmora\.woman/i)).toHaveCount(0);
    await expect(page.getByText(/femmora/i)).toHaveCount(0);
    await context.close();
  });
});
