/**
 * Armure et bouclier effectifs d'un acteur, dérivés de ses items portés.
 *
 * Avant la 1.11.0, cocher une armure recopiait ses valeurs dans `system.armure.*` (et un bouclier dans
 * `system.bouclier.*`) : supprimer ou modifier l'item laissait une protection fantôme. Les valeurs
 * sont désormais lues sur les items à chaque préparation des données. Les valeurs stockées ne servent
 * plus que pour un acteur sans aucun item d'armure (resp. de bouclier) : saisie par macro ou import.
 */

const somme = (items, champ) => items.reduce((s, i) => s + (Number(i.system?.[champ]) || 0), 0);

/**
 * @param {object} stockee           Valeurs stockées (`system.armure`)
 * @param {Iterable<object>} items   Items de l'acteur
 * @returns {object}  `{ nom, type, portee, protection, malusAgi, malusPer }` (ou `stockee` sans item d'armure)
 */
export function armureEffective(stockee, items) {
  const armures = [...(items ?? [])].filter(i => i.type === "armure");
  if (!armures.length) return stockee ?? {};
  const portees = armures.filter(i => i.system?.portee);
  if (!portees.length) return { nom: "", type: "0", portee: false, protection: 0, malusAgi: 0, malusPer: 0 };
  return {
    nom       : portees.map(i => i.name).join(", "),
    type      : String(portees[0].system?.type ?? "0"),
    portee    : true,
    protection: somme(portees, "protection"),
    malusAgi  : somme(portees, "malusAgi"),
    // Le malus de Perception dépend de la couverture : le plus fort s'applique, sans cumul
    malusPer  : Math.max(0, ...portees.map(i => Number(i.system?.malusPer) || 0)),
  };
}

/**
 * @param {object} stocke            Valeurs stockées (`system.bouclier`)
 * @param {Iterable<object>} items   Items de l'acteur
 * @returns {object}  `{ nom, portee, defenseBonus, protection, malusAgi }` (ou `stocke` sans item bouclier)
 */
export function bouclierEffectif(stocke, items) {
  const boucliers = [...(items ?? [])].filter(i => i.type === "arme" && i.system?.style === "bouclier");
  if (!boucliers.length) return stocke ?? {};
  const equipe = boucliers.find(i => i.system?.equipe);
  if (!equipe) return { nom: "", portee: false, defenseBonus: 0, protection: 0, malusAgi: 0 };
  return {
    nom         : equipe.name,
    portee      : true,
    defenseBonus: Number(equipe.system.defenseBonus) || 0,
    protection  : Number(equipe.system.protection)   || 0,
    malusAgi    : Number(equipe.system.malusAgi)     || 0,
  };
}

const ARMURE_VIDE   = { nom: "", type: "0", portee: false, protection: 0, malusAgi: 0, malusPer: 0 };
const BOUCLIER_VIDE = { nom: "", portee: false, defenseBonus: 0, protection: 0, malusAgi: 0 };

/** Mise à jour remettant à zéro les champs de `stocke` qui diffèrent de `vide`. */
function remiseAZero(prefixe, stocke, vide) {
  const maj = {};
  for (const [champ, valeur] of Object.entries(vide)) {
    if (champ in (stocke ?? {}) && stocke[champ] !== valeur) maj[`${prefixe}.${champ}`] = valeur;
  }
  return maj;
}

/**
 * Migration 1.11.0 : efface les copies d'armure et de bouclier stockées sur l'acteur.
 *  - personnage : l'ancienne fiche copiait toujours le nom de l'item ; une copie nommée, ou la présence
 *    d'un item du même genre, désigne une copie d'item (fantôme si l'item a été supprimé). Des valeurs
 *    sans nom et sans item (saisie par macro ou import) restent en place, comme à la dérivation ;
 *  - PNJ : seulement s'il possède un item d'armure (la valeur vient alors de l'item) ; sans item,
 *    la valeur stockée peut être une saisie volontaire et reste en place.
 * @param {string} type              Type de l'acteur
 * @param {object} system            Données stockées de l'acteur (`actor._source.system`)
 * @param {Iterable<object>} items   Items de l'acteur
 * @returns {object|null}  Mise à jour à appliquer, ou `null` s'il n'y a rien à faire
 */
export function armureStockeeAReinitialiser(type, system, items) {
  if (!system) return null;
  let maj = {};
  if (type === "personnage") {
    const liste = [...(items ?? [])];
    const copieArmure   = !!system.armure?.nom || liste.some(i => i.type === "armure");
    const copieBouclier = !!system.bouclier?.nom || liste.some(i => i.type === "arme" && i.system?.style === "bouclier");
    maj = {
      ...(copieArmure ? remiseAZero("system.armure", system.armure, ARMURE_VIDE) : {}),
      ...(copieBouclier ? remiseAZero("system.bouclier", system.bouclier, BOUCLIER_VIDE) : {}),
    };
  } else if (type === "pnj" && [...(items ?? [])].some(i => i.type === "armure")) {
    maj = remiseAZero("system.armure", system.armure, { protection: 0, malusAgi: 0 });
  }
  return Object.keys(maj).length ? maj : null;
}
