import { defineConfig, devices } from '@playwright/test';

/*
 * Volontairement différent du 4321 d'`astro dev`.
 *
 * Avec le même port et `reuseExistingServer`, un serveur de développement resté
 * ouvert est adopté à la place du build de prod : les tests passent alors sur
 * du code non compilé, et échouent sur un cache Vite périmé plutôt que sur un
 * vrai défaut. Le diagnostic coûte cher pour une cause aussi bête.
 */
const PORT = 4322;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'desktop', use: devices['Desktop Chrome'] },
    { name: 'mobile', use: devices['Pixel 7'] },
  ],

  // Les tests tournent sur le build de prod, pas sur le serveur de dev :
  // c'est le seul moyen d'attraper ce qui casse uniquement une fois compilé.
  webServer: {
    command: `pnpm preview --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
