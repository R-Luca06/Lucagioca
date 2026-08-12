import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

/**
 * Smoke test paramétré sur le registre.
 *
 * On lit `dist/projects.json` (produit par `src/pages/projects.json.ts`) au
 * chargement du fichier, ce qui permet de déclarer un test par projet de façon
 * synchrone. Conséquence : chaque nouveau jeu est couvert automatiquement,
 * sans écrire une ligne de test.
 */
interface RegistryDump {
  routed: Array<{ slug: string; title: string }>;
  listed: string[];
}

const dumpPath = fileURLToPath(new URL('../../dist/projects.json', import.meta.url));

if (!existsSync(dumpPath)) {
  throw new Error(`dist/projects.json introuvable — lance \`pnpm build\` avant \`pnpm test:e2e\`.`);
}

const registry = JSON.parse(readFileSync(dumpPath, 'utf8')) as RegistryDump;

test.describe('accueil', () => {
  test('liste tous les projets publiés', async ({ page }) => {
    await page.goto('/');
    for (const slug of registry.listed) {
      await expect(page.locator(`a[href="/p/${slug}"]`)).toBeVisible();
    }
  });
});

for (const project of registry.routed) {
  test.describe(`projet: ${project.slug}`, () => {
    test("se charge sans erreur et permet de revenir à l'accueil", async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(err.message));

      const response = await page.goto(`/p/${project.slug}`);
      expect(response?.status()).toBe(200);

      await expect(page).toHaveTitle(project.title);

      // Laisse les islands s'hydrater : c'est là que la plupart des erreurs sortent.
      await page.waitForLoadState('networkidle');
      expect(errors, `erreurs console sur /p/${project.slug}`).toEqual([]);

      await page.getByRole('link', { name: /tous les projets/i }).click();
      await expect(page).toHaveURL('/');
    });

    test('ne provoque pas de défilement horizontal', async ({ page }) => {
      await page.goto(`/p/${project.slug}`);
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflows, 'la page déborde horizontalement').toBe(false);
    });
  });
}
