import type { APIRoute } from 'astro';
import { listedProjects, routedProjects } from '@/registry';

/**
 * Le registre exposé en JSON statique.
 *
 * Sert à deux choses : les tests e2e s'en servent pour visiter chaque route
 * sans avoir à réimplémenter la découverte, et ça fait une petite API publique
 * gratuite pour le jour où tu voudras un flux ou un widget « nouveautés ».
 */
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      {
        routed: routedProjects,
        listed: listedProjects.map((p) => p.slug),
      },
      null,
      2,
    ),
    { headers: { 'content-type': 'application/json; charset=utf-8' } },
  );
