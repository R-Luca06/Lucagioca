import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Tests unitaires — la logique pure, sans navigateur.
 *
 * Le périmètre s'arrête aux `*.test.ts` de `src/` : les tests sont posés à côté
 * du module qu'ils couvrent, ce qui garde la règle du projet intacte — un
 * nouveau jeu apporte ses tests dans son propre dossier, sans rien enregistrer
 * ailleurs. `tests/e2e/` reste le domaine de Playwright et n'est pas ramassé ici.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
