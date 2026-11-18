/**
 * Arithmétique des dates du calendrier d'Harmonde (mois de durée fixe).
 */

/**
 * Date avancée (ou reculée) de `delta` unités, avec report des débordements
 * minutes → heures → jours → mois → années. L'an 1 est le plancher.
 * @param {{jour: number, mois: number, an: number, heure: number, minute: number}} date
 * @param {number} delta   nombre d'unités (négatif pour reculer) ; une « minute » vaut un quart d'heure
 * @param {"minute"|"heure"|"jour"|"mois"|"an"} unite
 * @param {{nbMois: number, joursParMois: number}} calendrier
 * @returns {object} nouvelle date (la date reçue n'est pas modifiée)
 */
export function avancerDate(date, delta, unite, { nbMois, joursParMois }) {
  const d = { ...date };
  if (!Number.isFinite(delta)) return d;
  const jpp = joursParMois;

  if (unite === "minute") {
    d.minute += delta * 15;
    while (d.minute >= 60) { d.minute -= 60; d.heure++; }
    while (d.minute < 0)   { d.minute += 60; d.heure--; }
  }
  if (unite === "heure") d.heure += delta;

  if (unite === "heure" || unite === "minute") {
    while (d.heure >= 24) { d.heure -= 24; d.jour++; }
    while (d.heure < 0)   { d.heure += 24; d.jour--; }
  }

  if (unite === "jour" || unite === "heure" || unite === "minute") {
    if (unite === "jour") d.jour += delta;
    while (d.jour > jpp) { d.jour -= jpp; d.mois++; }
    while (d.jour < 1)   { d.mois--;      d.jour += jpp; }
  } else if (unite === "mois") {
    d.mois += delta;
  } else if (unite === "an") {
    d.an += delta;
  }

  while (d.mois > nbMois) { d.mois -= nbMois; d.an++; }
  while (d.mois < 1)      { d.mois += nbMois; d.an--; }
  if (d.an < 1) d.an = 1;
  d.jour = Math.max(1, Math.min(jpp, d.jour));
  return d;
}
