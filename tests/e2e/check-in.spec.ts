import { test, expect, request as playwrightRequest, type Page, type BrowserContext } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helper — spin up an organiser account with one ceremony + one registered guest,
// return the check-in token so tests can open the check-in page.
// ---------------------------------------------------------------------------

async function setupFixture(page: Page, context: BrowserContext) {
  const email = `e2e+checkin+${Date.now()}@example.com`;
  const password = "motdepasse123";

  // 1. Sign up
  await page.goto("/sign-up");
  await page.getByLabel("Nom complet").fill("Organisateur Check-in");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });

  if (page.url().includes("onboarding")) {
    await page.getByLabel(/nom du mariage/i).fill("Mariage Check-in E2E");
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible()) await dateInput.fill("2026-12-15");
    await page.getByRole("button", { name: /créer|suivant|continuer/i }).first().click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  }

  // 2. Create a ceremony
  await page.goto("/ceremonies");
  const addBtn = page.getByRole("button", { name: /ajouter|nouvelle cérémonie/i });
  if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await addBtn.click();
    const venueInput = page.getByLabel(/lieu/i).first();
    if (await venueInput.isVisible()) await venueInput.fill("Salle des fêtes");
    await page.getByRole("button", { name: /enregistrer|créer|sauvegarder/i }).first().click();
  }
  await expect(page.locator("ol li").first()).toBeVisible({ timeout: 8000 });

  // 3. Generate check-in link
  await page.getByTitle("Lien de check-in").first().click();
  await expect(page.getByText("Lien de check-in")).toBeVisible({ timeout: 5000 });
  const checkInUrl = await page.locator(".truncate").first().textContent();
  const token = checkInUrl!.split("/check-in/")[1]!.trim();
  await page.keyboard.press("Escape");

  // 4. Generate RSVP link and self-register a guest
  await page.getByTitle("Lien d'inscription").first().click();
  const rsvpUrlText = await page.locator(".truncate").first().textContent();
  const rsvpToken = rsvpUrlText!.split("/rsvp/")[1]!.trim();

  const guestPage = await context.newPage();
  await guestPage.goto(`/rsvp/${rsvpToken}`);
  await expect(guestPage.getByText("Votre invitation")).toBeVisible({ timeout: 8000 });
  await guestPage.getByLabel(/votre nom/i).fill("Marie Dupont");
  await guestPage.getByLabel(/téléphone/i).fill("+243 811111111");
  await guestPage.getByRole("button", { name: /présent/i }).click();
  await guestPage.getByRole("button", { name: /confirmer/i }).click();
  await expect(guestPage.getByText("Présence confirmée")).toBeVisible({ timeout: 8000 });
  await guestPage.close();

  return { token };
}

// ---------------------------------------------------------------------------
// Test 1 — staff checks in a guest by name search
// ---------------------------------------------------------------------------

test.describe("Check-in flow", () => {
  test("staff can check in a guest manually and counter updates", async ({ page, context }) => {
    const { token } = await setupFixture(page, context);

    const staffPage = await context.newPage();
    await staffPage.goto(`/check-in/${token}`);
    await expect(staffPage.getByText(/civil|coutumier|religieux|personnalisé/i)).toBeVisible({ timeout: 8000 });
    await expect(staffPage.getByText("0 / 1")).toBeVisible({ timeout: 5000 });

    // All three tabs are present
    await expect(staffPage.getByRole("button", { name: "Scanner" })).toBeVisible();
    await expect(staffPage.getByRole("button", { name: "Rechercher" })).toBeVisible();
    await expect(staffPage.getByRole("button", { name: "Journal" })).toBeVisible();

    // Search by name → mark arrived
    await staffPage.getByRole("button", { name: "Rechercher" }).click();
    await staffPage.getByPlaceholder("Nom de l'invité…").fill("Marie");
    await expect(staffPage.getByText("Marie Dupont")).toBeVisible({ timeout: 5000 });
    await staffPage.getByRole("button", { name: "Arrivé(e)" }).click();

    // Success toast
    await expect(staffPage.getByText(/Marie Dupont/)).toBeVisible({ timeout: 5000 });
    await expect(staffPage.getByText(/arrivé/i)).toBeVisible();

    // Counter updates to 1 / 1
    await expect(staffPage.getByText("1 / 1")).toBeVisible({ timeout: 8000 });

    // Journal tab shows the arrival with guest name
    await staffPage.getByRole("button", { name: "Journal" }).click();
    await expect(staffPage.getByText("Marie Dupont")).toBeVisible({ timeout: 5000 });

    await staffPage.close();
  });

  // ---------------------------------------------------------------------------
  // Test 2 — QR scan path
  //
  // Camera access cannot be driven by Playwright.  Instead we simulate exactly
  // what BarcodeDetector/processCheckIn does after decoding a QR code: it
  // POSTs { token, qr: "g:<guestId>|c:<ceremonyId>" } to /api/check-in.
  // We exercise that server path by calling it directly via the API context,
  // then verify the check-in page reflects the arrival.
  // ---------------------------------------------------------------------------

  test("QR scan marks guest as arrived and check-in page updates", async ({ page, context }) => {
    const { token } = await setupFixture(page, context);

    // Read the stats to get guestId + ceremonyId for QR construction
    const apiCtx = await playwrightRequest.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    });
    const statsRes = await apiCtx.get(`/api/check-in/${token}`);
    expect(statsRes.ok()).toBeTruthy();
    const stats = await statsRes.json();

    expect(stats.totalExpected).toBe(1);
    expect(stats.arrivedCount).toBe(0);

    const { ceremonyId, guests } = stats as { ceremonyId: string; guests: { id: string; name: string }[] };
    const guestId = guests[0].id;

    // Build QR payload (same format the PDF QR encodes)
    const qrPayload = `g:${guestId}|c:${ceremonyId}`;

    // Verify wrong-ceremony QR returns a clear error
    const wrongCeremonyRes = await apiCtx.post("/api/check-in", {
      data: { token, qr: `g:${guestId}|c:wrong-ceremony-id` },
    });
    expect(wrongCeremonyRes.status()).toBe(422);
    expect((await wrongCeremonyRes.json()).error).toBe("wrong_ceremony");

    // Verify invalid QR format returns a clear error
    const invalidQrRes = await apiCtx.post("/api/check-in", {
      data: { token, qr: "not-a-qr-code" },
    });
    expect(invalidQrRes.status()).toBe(422);
    expect((await invalidQrRes.json()).error).toBe("invalid_qr");

    // Simulate valid QR scan — this is what a successful camera scan triggers
    const scanRes = await apiCtx.post("/api/check-in", {
      data: { token, qr: qrPayload },
    });
    expect(scanRes.status()).toBe(201);
    const scanData = await scanRes.json();
    expect(scanData.guest.name).toBe("Marie Dupont");

    // Scanning the same QR again returns a clear already-checked-in error
    const dupRes = await apiCtx.post("/api/check-in", {
      data: { token, qr: qrPayload },
    });
    expect(dupRes.status()).toBe(409);
    expect((await dupRes.json()).error).toBe("already_checked_in");

    // Open the check-in page — guest status is arrived, counter shows 1 / 1
    const staffPage = await context.newPage();
    await staffPage.goto(`/check-in/${token}`);
    await expect(staffPage.getByText("1 / 1")).toBeVisible({ timeout: 8000 });

    // Journal tab shows the guest with a timestamp
    await staffPage.getByRole("button", { name: "Journal" }).click();
    await expect(staffPage.getByText("Marie Dupont")).toBeVisible({ timeout: 5000 });

    await staffPage.close();
    await apiCtx.dispose();
  });
});
