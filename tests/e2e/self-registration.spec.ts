import { test, expect, request as playwrightRequest } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helper — sign-up + wedding + ceremony + registration link via API
// ---------------------------------------------------------------------------

async function setupFixture() {
  const ctx = await playwrightRequest.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
  });

  const email = `e2e+${Date.now()}@example.com`;
  const password = "motdepasse123";

  // 1. Sign up
  const signUpRes = await ctx.post("/api/auth/register", {
    data: { name: "Organisateur Test", email, password },
  });
  expect(signUpRes.ok(), `sign-up failed: ${await signUpRes.text()}`).toBeTruthy();

  // 2. Sign in to get session cookie
  const signInRes = await ctx.post("/api/auth/credentials", {
    data: { email, password },
  });
  // Auth.js credentials flow redirects — just check we're not 500
  expect(signInRes.status()).not.toBe(500);

  // 3. Create wedding via UI sign-up flow (already done by sign-up redirect)
  //    Instead, we navigate through the UI to get the wedding/ceremony created.
  //    We'll do this via the browser page in the test itself.

  await ctx.dispose();
  return { email, password };
}

// ---------------------------------------------------------------------------
// E2E: open link → fill form → submit → guest appears in organiser's dashboard
// ---------------------------------------------------------------------------

test.describe("Guest self-registration flow", () => {
  test("guest can register via public link and appears in organiser guest list", async ({ page, context }) => {
    const email = `e2e+${Date.now()}@example.com`;
    const password = "motdepasse123";

    // ── Step 1: organiser signs up ──────────────────────────────────────────
    await page.goto("/sign-up");
    await page.getByLabel("Nom complet").fill("Organisateur Test");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill(password);
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page).toHaveURL(/dashboard/);

    // ── Step 2: complete onboarding (wedding creation) ─────────────────────
    // If redirected to onboarding, fill it in
    if (page.url().includes("onboarding")) {
      await page.getByLabel(/nom du mariage/i).fill("Mariage Test E2E");
      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible()) await dateInput.fill("2026-12-01");
      await page.getByRole("button", { name: /créer|suivant|continuer/i }).first().click();
      await expect(page).toHaveURL(/dashboard/);
    }

    // ── Step 3: create a ceremony ──────────────────────────────────────────
    await page.goto("/ceremonies");
    const addBtn = page.getByRole("button", { name: /ajouter|nouvelle cérémonie/i });
    if (await addBtn.isVisible()) {
      await addBtn.click();
      // Fill ceremony form
      const venueInput = page.getByLabel(/lieu/i).first();
      if (await venueInput.isVisible()) await venueInput.fill("Salle des fêtes");
      await page.getByRole("button", { name: /enregistrer|créer|sauvegarder/i }).first().click();
    }

    // ── Step 4: generate registration link ────────────────────────────────
    const linkBtn = page.getByTitle("Lien d'inscription").first();
    await expect(linkBtn).toBeVisible({ timeout: 5000 });
    await linkBtn.click();

    // The link popover should appear with the URL
    const linkText = page.locator("text=/rsvp/");
    await expect(linkText).toBeVisible({ timeout: 5000 });

    // Extract the URL from the popover
    const urlSpan = page.locator(".truncate").first();
    const rsvpUrl = await urlSpan.textContent();
    expect(rsvpUrl).toMatch(/\/rsvp\//);

    // Copy and extract token
    const token = rsvpUrl!.split("/rsvp/")[1]?.trim();
    expect(token).toBeTruthy();

    // ── Step 5: open the RSVP link as a guest (new tab) ───────────────────
    const guestPage = await context.newPage();
    await guestPage.goto(`/fr/rsvp/${token}`);
    await expect(guestPage.getByText("Votre invitation")).toBeVisible();

    // Fill in the form
    await guestPage.getByLabel(/votre nom/i).fill("Jean Invité");
    await guestPage.getByLabel(/téléphone/i).fill("+243 810000001");
    await guestPage.getByLabel(/e-mail/i).fill("jean.invite@example.com");

    // Confirm attendance
    await guestPage.getByRole("button", { name: /présent/i }).click();

    // Submit
    await guestPage.getByRole("button", { name: /confirmer/i }).click();

    // Success screen
    await expect(guestPage.getByText("Présence confirmée")).toBeVisible({ timeout: 8000 });
    await guestPage.close();

    // ── Step 6: organiser sees guest in dashboard ──────────────────────────
    await page.goto("/guests");
    await expect(page.getByText("Jean Invité")).toBeVisible({ timeout: 8000 });
    // Self-registered badge
    await expect(page.getByText("En ligne")).toBeVisible();
  });
});
