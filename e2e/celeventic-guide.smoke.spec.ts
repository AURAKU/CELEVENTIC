import { test, expect } from "@playwright/test";

test.describe("Celeventic Guide smoke", () => {
  test("/guide home loads Start Here and search", async ({ page }) => {
    await page.goto("/guide");
    await expect(page.getByRole("heading", { name: /CELEVENTIC GUIDE/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Start Here/i })).toBeVisible();
    await expect(page.getByLabel(/Search Celeventic Guide/i)).toBeVisible();
  });

  test("flagship slug page loads without claiming video file", async ({ page }) => {
    await page.goto("/guide/how-celeventic-works");
    await expect(page.getByRole("heading", { name: /How Celeventic Works/i })).toBeVisible();
    await expect(page.getByText(/Interactive walkthrough|Steps/i).first()).toBeVisible();
  });
});
