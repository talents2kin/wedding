import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the hero section in French", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Gérez tous vos invités"
    );
    await expect(page.getByText("Mariages coutumiers, civils & religieux")).toBeVisible();
    await expect(page.getByText("Gratuit pour commencer")).toBeVisible();
  });

  test("has working CTA links to sign-up", async ({ page }) => {
    const ctaLinks = page.getByRole("link", { name: "Commencer gratuitement" });
    await expect(ctaLinks.first()).toBeVisible();
    await expect(ctaLinks.first()).toHaveAttribute("href", "/sign-up");
  });

  test("nav links point to the right sections", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "Se connecter" }).first()
    ).toHaveAttribute("href", "/sign-in");
  });

  test("renders the features section", async ({ page }) => {
    await page.getByRole("link", { name: "Voir les fonctionnalités" }).click();
    await expect(
      page.getByText("Plusieurs cérémonies, une seule plateforme")
    ).toBeVisible();
    await expect(page.getByText("Plan de table interactif")).toBeVisible();
    await expect(page.getByText("Accueil le jour J")).toBeVisible();
  });

  test("renders both audience cards", async ({ page }) => {
    await expect(page.getByText("Pour les mariés")).toBeVisible();
    await expect(page.getByText("Pour les organisateurs")).toBeVisible();
  });

  test("renders the pricing section", async ({ page }) => {
    await expect(page.getByText("Couples")).toBeVisible();
    await expect(page.getByText("Organisateurs")).toBeVisible();
    await expect(page.getByText("Populaire")).toBeVisible();
  });

  test("footer renders with legal links", async ({ page }) => {
    await expect(
      page.getByText(new RegExp(`© ${new Date().getFullYear()} WeddingApp`))
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Confidentialité" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Conditions d'utilisation" })
    ).toBeVisible();
  });
});
