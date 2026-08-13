import { describe, expect, it } from 'vitest';
import {
  type Activity,
  activitiesByGroup,
  allActivities,
  basketHours,
  byActivityId,
  groups,
  habits,
  hoursFor,
  lifetimeHours,
  mandatoryIds,
  pursuits,
  translate,
  withMandatory,
  yearsFromHours,
} from './activities';

/**
 * Le cœur arithmétique du jeu.
 *
 * Une erreur ici ne fait rien planter : elle affiche un chiffre faux, sur un
 * écran qui demande précisément qu'on lui fasse confiance. Aucun test de bout
 * en bout ne la verrait. C'est le module le plus important à couvrir du dépôt.
 */

/** 365,25 jours de 24 h. Recopié à dessein : si la constante bouge, on veut le savoir. */
const HEURES_PAR_AN = 8766;

function activite(id: string): Activity {
  const trouvee = byActivityId.get(id);
  if (!trouvee) throw new Error(`activité inconnue dans le test : ${id}`);
  return trouvee;
}

describe('lifetimeHours', () => {
  it('convertit une espérance de vie en budget d’heures', () => {
    expect(lifetimeHours(1)).toBe(HEURES_PAR_AN);
    expect(lifetimeHours(83)).toBe(83 * HEURES_PAR_AN);
    expect(lifetimeHours(0)).toBe(0);
  });

  it('tient compte des années bissextiles', () => {
    // 365 jours pleins donneraient 8760 : l'écart de 6 h par an est voulu.
    expect(lifetimeHours(1)).toBeGreaterThan(365 * 24);
  });
});

describe('yearsFromHours', () => {
  it('est bien l’inverse de lifetimeHours', () => {
    for (const annees of [0, 1, 54.6, 83, 84.6]) {
      expect(yearsFromHours(lifetimeHours(annees))).toBeCloseTo(annees, 10);
    }
  });
});

describe('hoursFor', () => {
  describe('coût ponctuel', () => {
    it('ne dépend pas du pays', () => {
      const piano = activite('piano');
      expect(hoursFor(piano, 54.6)).toBe(3000);
      expect(hoursFor(piano, 84.6)).toBe(3000);
    });
  });

  describe('habitude quotidienne', () => {
    it('dormir prend exactement un tiers de la vie', () => {
      for (const annees of [54.6, 83, 84.6]) {
        expect(hoursFor(activite('dormir'), annees)).toBeCloseTo(lifetimeHours(annees) / 3, 6);
      }
    });

    it('coûte plus cher à qui vit plus longtemps', () => {
      const manger = activite('manger');
      expect(hoursFor(manger, 84.6)).toBeGreaterThan(hoursFor(manger, 54.6));
    });

    it('ne coûte rien à une vie de durée nulle', () => {
      expect(hoursFor(activite('manger'), 0)).toBe(0);
    });
  });

  describe('habitude hebdomadaire', () => {
    it('utilise le nombre de semaines propre à l’activité', () => {
      // 30 h × 36 semaines × 12 ans (de 6 à 18 ans), pour une vie assez longue.
      expect(hoursFor(activite('ecole'), 83)).toBe(30 * 36 * 12);
      // 35 h × 47 semaines × 42 ans (de 22 à 64 ans).
      expect(hoursFor(activite('travailler'), 83)).toBe(35 * 47 * 42);
    });

    it('retombe sur 52,18 semaines quand l’activité ne précise rien', () => {
      expect(hoursFor(activite('sport'), 83)).toBeCloseTo(3 * 52.18 * 83, 6);
    });
  });

  describe('troncature par l’espérance de vie — le sujet du jeu', () => {
    it('ampute la carrière de qui meurt avant la retraite', () => {
      // Mourir à 54,6 ans, c'est travailler 32,6 ans au lieu de 42.
      expect(hoursFor(activite('travailler'), 54.6)).toBeCloseTo(35 * 47 * 32.6, 6);
    });

    it('annule une habitude qui commence après la mort', () => {
      expect(hoursFor(activite('travailler'), 20)).toBe(0);
      expect(hoursFor(activite('ecole'), 5)).toBe(0);
    });

    it('coupe une habitude au milieu de sa tranche d’âge', () => {
      // Mourir à 10 ans : quatre années d'école, de 6 à 10.
      expect(hoursFor(activite('ecole'), 10)).toBe(30 * 36 * 4);
    });

    it('ne dépasse jamais la borne haute pour une vie longue', () => {
      const ecole = activite('ecole');
      expect(hoursFor(ecole, 120)).toBe(hoursFor(ecole, 83));
    });

    it('ne renvoie jamais un coût négatif', () => {
      for (const a of allActivities) {
        for (const annees of [0, 1, 5, 21, 54.6, 83, 120]) {
          expect(hoursFor(a, annees)).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });
});

describe('withMandatory', () => {
  it('rétablit le sommeil dans un panier qui l’a perdu', () => {
    expect(withMandatory({})).toEqual({ dormir: 1 });
  });

  it('rétablit le sommeil à la relecture d’une vieille sauvegarde', () => {
    // Écrite quand dormir se refusait encore : sans ça, on rouvrirait sans sommeil.
    expect(withMandatory({ piano: 2, dormir: 0 })).toEqual({ piano: 2, dormir: 1 });
  });

  it('n’écrase pas une quantité déjà valide', () => {
    expect(withMandatory({ dormir: 1, roman: 3 })).toEqual({ dormir: 1, roman: 3 });
  });

  it('corrige une quantité négative', () => {
    expect(withMandatory({ dormir: -4 })).toEqual({ dormir: 1 });
  });

  it('n’altère pas le panier reçu', () => {
    const panier = { piano: 1 };
    withMandatory(panier);
    expect(panier).toEqual({ piano: 1 });
  });

  it('couvre bien toutes les lignes obligatoires du catalogue', () => {
    const complete = withMandatory({});
    for (const id of mandatoryIds) expect(complete[id]).toBeGreaterThan(0);
  });
});

describe('basketHours', () => {
  it('vaut zéro pour un panier vide', () => {
    expect(basketHours({}, 83)).toBe(0);
  });

  it('multiplie par la quantité', () => {
    expect(basketHours({ roman: 3 }, 83)).toBe(3 * 8);
  });

  it('additionne les lignes', () => {
    expect(basketHours({ roman: 1, permis: 1 }, 83)).toBe(8 + 50);
  });

  it('ignore une activité inconnue plutôt que de planter', () => {
    expect(basketHours({ roman: 1, activite_supprimee: 5 }, 83)).toBe(8);
  });

  it('ignore les quantités nulles ou négatives', () => {
    expect(basketHours({ roman: 0, piano: -2, permis: 1 }, 83)).toBe(50);
  });

  it('se recalcule selon l’espérance de vie pour les habitudes', () => {
    expect(basketHours({ manger: 1 }, 84.6)).toBeGreaterThan(basketHours({ manger: 1 }, 54.6));
  });

  it('reste stable pour les achats ponctuels', () => {
    expect(basketHours({ piano: 1 }, 84.6)).toBe(basketHours({ piano: 1 }, 54.6));
  });

  it('ne dépasse pas le budget d’une vie pour un panier raisonnable', () => {
    const tout = Object.fromEntries(allActivities.map((a) => [a.id, 1]));
    expect(basketHours(tout, 83)).toBeLessThan(lifetimeHours(83));
  });
});

describe('translate', () => {
  it('ne traduit rien à partir de rien', () => {
    expect(translate(0)).toEqual([]);
    expect(translate(-100)).toEqual([]);
  });

  it('rend au plus le nombre d’entrées demandé', () => {
    expect(translate(100_000).length).toBeLessThanOrEqual(4);
    expect(translate(100_000, 2)).toHaveLength(2);
  });

  it('classe du compte le plus petit au plus grand', () => {
    const comptes = translate(lifetimeHours(83), 4).map((e) => e.count);
    expect(comptes).toEqual([...comptes].sort((a, b) => a - b));
  });

  it('écarte ce dont on ne peut rien faire', () => {
    // 4 h ne suffisent même pas à un roman : rien de parlant à proposer.
    expect(translate(4)).toEqual([]);
  });

  it('écarte les comptes à sept chiffres, qui ne se ressentent plus', () => {
    for (const entree of translate(lifetimeHours(83))) {
      expect(entree.count).toBeGreaterThanOrEqual(1);
      expect(entree.count).toBeLessThanOrEqual(100_000);
    }
  });

  it('compte juste', () => {
    // 160 h : exactement deux sagas Marvel de 80 h.
    const marvel = translate(160, 10).find((e) => e.activity.id === 'marvel');
    expect(marvel?.count).toBe(2);
  });
});

describe('invariants du catalogue', () => {
  it('n’a aucun identifiant en double', () => {
    // Un doublon serait perdu silencieusement par `byActivityId`.
    expect(byActivityId.size).toBe(allActivities.length);
  });

  it('n’a que des coûts ponctuels parmi les activités à traduire', () => {
    // `translate` évalue les coûts à zéro année de vie : une habitude y vaudrait
    // 0 h, et la division donnerait l'infini.
    for (const p of pursuits) expect(p.cost.kind).toBe('once');
  });

  it('donne une source à chaque chiffre affiché', () => {
    for (const a of allActivities) expect(a.source.trim().length).toBeGreaterThan(0);
  });

  it('n’annonce que des coûts strictement positifs', () => {
    for (const a of allActivities) expect(a.cost.hours).toBeGreaterThan(0);
  });

  it('déclare des tranches d’âge cohérentes', () => {
    for (const a of allActivities) {
      if (a.cost.kind === 'once') continue;
      const { fromAge, toAge } = a.cost;
      if (fromAge !== undefined && toAge !== undefined) expect(toAge).toBeGreaterThan(fromAge);
    }
  });
});

describe('rangement par rayon', () => {
  it('range chaque activité, sans en perdre ni en dupliquer', () => {
    const rangees = activitiesByGroup.flatMap((g) => g.activities);
    expect(rangees).toHaveLength(allActivities.length);
    expect(new Set(rangees.map((a) => a.id)).size).toBe(allActivities.length);
  });

  it('ne laisse aucun rayon vide — un titre sans ligne dessous ne dit rien', () => {
    for (const rayon of activitiesByGroup) {
      expect(rayon.activities.length, `rayon « ${rayon.label} » vide`).toBeGreaterThan(0);
    }
  });

  it('n’attribue aucune activité à un rayon qui n’existe pas', () => {
    const connus = new Set(groups.map((g) => g.id));
    for (const a of allActivities) expect(connus).toContain(a.group);
  });

  it('réserve le rayon « habitudes » aux coûts qui dépendent du pays', () => {
    // C'est la distinction que le jeu veut faire sentir : la ranger de travers
    // reviendrait à annoncer un coût variable là où il est fixe, et inversement.
    for (const a of habits) expect(a.group).toBe('habitudes');
    for (const a of pursuits) expect(a.group).not.toBe('habitudes');
    for (const a of allActivities) {
      expect(a.group === 'habitudes').toBe(a.cost.kind !== 'once');
    }
  });
});

describe('densité du catalogue', () => {
  /**
   * La propriété la plus importante du catalogue, et elle est émergente : il
   * est assez dense pour qu'une vie brève ne puisse PAS tout contenir, et
   * assez mesuré pour qu'une vie longue y arrive de justesse.
   *
   * C'est la thèse du jeu, exprimée en arithmétique plutôt qu'en discours. La
   * casser en ajoutant des activités reviendrait à la casser dans le propos :
   * si tout le monde peut tout, il n'y a plus d'inégalité à sentir ; si
   * personne ne peut rien, il n'y a plus de contraste.
   */
  it('laisse une vie longue tout contenir — de justesse', () => {
    const tout = Object.fromEntries(allActivities.map((a) => [a.id, 1]));
    const budget = lifetimeHours(84.6);
    expect(basketHours(tout, 84.6)).toBeLessThan(budget);
    expect(basketHours(tout, 84.6)).toBeGreaterThan(budget * 0.9);
  });

  it('interdit à une vie brève de tout contenir', () => {
    const tout = Object.fromEntries(allActivities.map((a) => [a.id, 1]));
    expect(basketHours(tout, 54.6)).toBeGreaterThan(lifetimeHours(54.6));
  });

  it('couvre plusieurs ordres de grandeur, pour que translate ait à dire', () => {
    const couts = pursuits.map((p) => p.cost.hours).sort((a, b) => a - b);
    const plusPetit = couts[0] ?? 0;
    const plusGrand = couts[couts.length - 1] ?? 0;
    expect(plusPetit).toBeLessThan(20);
    expect(plusGrand / Math.max(plusPetit, 1)).toBeGreaterThan(500);
  });

  it('propose assez de choix pour que le sommeil ne soit pas la seule ligne', () => {
    expect(pursuits.length).toBeGreaterThanOrEqual(25);
    expect(habits.length).toBeGreaterThanOrEqual(10);
  });
});
