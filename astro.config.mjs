// @ts-check
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // TODO: remplacer par le domaine réel — sert aux URLs canoniques et aux images OG.
  site: 'https://example.com',

  integrations: [react()],

  build: {
    // Inline les toutes petites feuilles de style pour éviter un aller-retour réseau.
    inlineStylesheets: 'auto',
  },

  vite: {
    build: {
      assetsInlineLimit: 2048,
    },
  },
});
