import { test, expect } from "@playwright/test";

test.describe("Sign-up flow", () => {
  test("a new user can sign up and is redirected to sign-in", async ({ page }) => {
    const uniqueEmail = `test+${Date.now()}@example.com`;

    await page.goto("/sign-up");

    // Page renders in French
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Créer un compte"
    );

    await page.getByLabel("Nom complet").fill("Alice Dupont");
    await page.getByLabel("Adresse e-mail").fill(uniqueEmail);
    await page.getByLabel("Mot de passe").fill("motdepasse123");

    await page.getByRole("button", { name: "Créer mon compte" }).click();

    // After sign-up, user is sent to sign-in with registered flag
    await expect(page).toHaveURL(/sign-in/);
  });

  test("shows an error when the email is already taken", async ({ page }) => {
    await page.goto("/sign-up");

    await page.getByLabel("Nom complet").fill("Alice Dupont");
    await page.getByLabel("Adresse e-mail").fill("existing@example.com");
    await page.getByLabel("Mot de passe").fill("motdepasse123");

    await page.getByRole("button", { name: "Créer mon compte" }).click();

    await expect(
      page.getByText("Cette adresse e-mail est déjà utilisée")
    ).toBeVisible();
  });
});

test.describe("Home page", () => {
  test("renders in French", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "WeddingApp"
    );
    await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
    await expect(page.getByRole("link", { name: "S'inscrire" })).toBeVisible();
  });
});
