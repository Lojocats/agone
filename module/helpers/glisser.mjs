/**
 * Géométrie du réordonnancement par glisser-déposer (listes et grilles de cartes).
 * Fonctions pures sur des rectangles `{ left, top, right, bottom, width, height }` (DOMRect).
 */

/** Distance (au carré) d'un point à un rectangle ; 0 si le point est dedans. */
function distance2(rect, x, y) {
  const dx = x < rect.left ? rect.left - x : x > rect.right  ? x - rect.right  : 0;
  const dy = y < rect.top  ? rect.top - y  : y > rect.bottom ? y - rect.bottom : 0;
  return dx * dx + dy * dy;
}

/**
 * Index du rectangle sous le point, sinon du plus proche sur les deux axes.
 * @returns {number}  -1 si la liste est vide
 */
export function indexPlusProche(rects, x, y) {
  let meilleur = -1;
  let distance = Infinity;
  rects.forEach((rect, index) => {
    const d = distance2(rect, x, y);
    if (d < distance) { distance = d; meilleur = index; }
  });
  return meilleur;
}

/** Les rectangles sont-ils disposés en plusieurs colonnes (deux éléments sur une même ligne) ? */
export function estMultiColonnes(rects) {
  return rects.some((a, i) => rects.some((b, j) => j > i && a.top < b.bottom && b.top < a.bottom && a.left !== b.left));
}

/**
 * Le dépôt se fait-il avant la cible ? Moitié haute dans une liste, moitié gauche dans une grille.
 * @param {object} rect            Rectangle de la cible
 * @param {boolean} multiColonnes  Disposition en grille
 */
export function deposerAvant(rect, x, y, multiColonnes) {
  return multiColonnes ? x < rect.left + rect.width / 2 : y < rect.top + rect.height / 2;
}

/**
 * Élément visé par un évènement de glisser-déposer parmi les `selecteur` de `conteneur` :
 * celui sous le pointeur (`event.target`), sinon le plus proche sur les deux axes.
 * @returns {{cible: HTMLElement, avant: boolean}|null}
 */
export function cibleDepot(event, conteneur, selecteur) {
  const elements = [...conteneur.querySelectorAll(selecteur)];
  if (!elements.length) return null;
  const rects = elements.map(el => el.getBoundingClientRect());
  const directe = event.target instanceof Element ? event.target.closest(selecteur) : null;
  let index = directe ? elements.indexOf(directe) : -1;
  if (index < 0) index = indexPlusProche(rects, event.clientX, event.clientY);
  if (index < 0) return null;
  return { cible: elements[index], avant: deposerAvant(rects[index], event.clientX, event.clientY, estMultiColonnes(rects)) };
}
