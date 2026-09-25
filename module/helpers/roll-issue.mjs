/**
 * Calcul pur de l'issue d'un jet, pour la carte de résultat (`roll-result.hbs`) :
 * classe d'issue (liseré/teinte) et écart au seuil (badge « +12 » / « −3 »).
 * Aucune dépendance à Foundry : testable en unitaire.
 */

/**
 * @param {object} p
 * @param {number} p.total                Total final du jet (déjà ajusté d'une éventuelle pénalité de fumble)
 * @param {number|string|null|undefined} p.seuil  Seuil à atteindre (coercé en nombre ; ignoré si non numérique)
 * @param {boolean} [p.fumble=false]       Jet raté (bévue)
 * @param {boolean} [p.critique=false]     Jet critique
 * @returns {{
 *   issueClass: ("fumble"|"critique"|"succes"|"echec"|null),
 *   resultatSucces: (boolean|null),
 *   ecartSeuil: (string|null),
 *   ecartSigne: ("positif"|"negatif"|null)
 * }}
 */
export function issueJet({ total, seuil, fumble = false, critique = false } = {}) {
  const seuilNum = Number(seuil);
  const seuilValide = seuil !== null && seuil !== undefined && seuil !== "" && Number.isFinite(seuilNum);
  const resultatSucces = seuilValide ? total >= seuilNum : null;

  // Priorité d'affichage : fumble > critique > succès/échec ; neutre sans seuil numérique.
  let issueClass = null;
  if (fumble) issueClass = "fumble";
  else if (critique) issueClass = "critique";
  else if (resultatSucces !== null) issueClass = resultatSucces ? "succes" : "echec";

  let ecartSeuil = null;
  let ecartSigne = null;
  if (seuilValide) {
    const ecart = total - seuilNum;
    ecartSigne = ecart >= 0 ? "positif" : "negatif";
    ecartSeuil = (ecart >= 0 ? "+" : "−") + Math.abs(ecart);
  }

  return { issueClass, resultatSucces, ecartSeuil, ecartSigne };
}
