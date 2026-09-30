/**
 * Résolution des composantes de calcul d'un domaine d'Arts Magiques personnalisé
 * (setting monde `domainesArtsCustom`, voir `module/apps/domaines-arts-config.mjs`).
 *
 * Un domaine custom peut redéfinir :
 *  - `attribut`   : caractéristique de base du potentiel. "" ou "art" = ART (comportement standard),
 *                   sinon une clé de `CONFIG.AGONE.attributs` (agilite, volonte, …).
 *  - `competence` : nom de compétence dont le score remplace celui d'Arts Magiques du domaine.
 *                   "" = comportement standard (compétence "Arts Magiques" du domaine).
 *
 * Fonction pure, sans dépendance à Foundry : testable unitairement.
 * @param {{attribut?: string, competence?: string}|null|undefined} domaine  Entrée de `domainesArtsCustom`
 * @param {string[]} [clesValides]  Clés d'attribut acceptées (ex. `Object.keys(CONFIG.AGONE.attributs)`).
 *   Si fourni, un `attribut` absent de cette liste retombe sur "art". Sans ce paramètre, `attribut`
 *   est renvoyé tel quel sans validation (voir tests/unit/domaines-arts.test.mjs).
 * @returns {{attribut: string, competence: string}}  `attribut` normalisé ("art" par défaut),
 *   `competence` normalisée ("" par défaut)
 */
export function resoudreDomaineArts(domaine, clesValides) {
  let attribut     = domaine?.attribut?.trim()   || "art";
  const competence = domaine?.competence?.trim() || "";
  if (clesValides && attribut !== "art" && !clesValides.includes(attribut)) attribut = "art";
  return { attribut, competence };
}
