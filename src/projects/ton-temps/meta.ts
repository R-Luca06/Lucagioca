import { defineProject } from '@/shared/project';

export default defineProject({
  slug: 'ton-temps',
  title: 'Ton temps',
  blurb: 'Choisis ton pays de naissance. Il fixe ton budget : une vie, en heures. Dépense-la.',
  publishedAt: '2026-08-12',
  status: 'live',
  tags: ['données', 'inégalités', 'carte'],
  accent: '#ffb000',
  cover: '/og/ton-temps.png',
  thumb: '/og/ton-temps-thumb.webp',

  /*
   * Les trois premières lignes sont exigées par leur licence, pas offertes :
   * voir `assets/sons/CREDITS.md`, qui documente aussi les sons en CC0 — ceux-là
   * n'imposent rien. La contrainte à garder en tête reste le **NC** de matucha :
   * ce son interdit toute exploitation commerciale du site.
   */
  credits: [
    {
      label: 'Sons de palette : « Pragotron split-flap » par matucha (CC BY-NC 4.0)',
      url: 'https://freesound.org/s/174056/',
    },
    {
      label: 'Grésillements : « Computer glitching » par InspectorJ (CC BY 4.0)',
      url: 'https://freesound.org/s/573189/',
    },
    {
      label: 'Balayage : « Mechanical can opener » par TrifectaMaestro (CC BY 3.0)',
      url: 'https://freesound.org/s/618375/',
    },
    {
      label: 'Espérance de vie à la naissance : Banque mondiale, SP.DYN.LE00.IN',
      url: 'https://data.worldbank.org/indicator/SP.DYN.LE00.IN',
    },
    {
      label: 'Géométrie de la carte : Natural Earth (domaine public)',
      url: 'https://www.naturalearthdata.com/',
    },
  ],
});
