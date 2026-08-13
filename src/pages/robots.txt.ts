import type { APIRoute } from 'astro';

/**
 * `robots.txt`, dérivé de `site` plutôt qu'écrit à la main.
 *
 * Il vivait dans `public/` avec l'adresse recopiée dedans. Conséquence : au
 * premier déploiement, l'adresse réelle ne correspondait pas à celle prévue,
 * et il a fallu corriger *deux* fichiers — celui qu'on pense à changer, et
 * celui qu'on oublie. Une seule source de vérité, désormais.
 */
export const GET: APIRoute = ({ site }) =>
  new Response(
    `User-agent: *
Allow: /

Sitemap: ${new URL('sitemap-index.xml', site)}
`,
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  );
