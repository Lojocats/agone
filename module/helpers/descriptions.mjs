/**
 * Descriptions pliables des listes (fiches et navigateurs).
 *
 * Balisage :
 *  - un chevron `<button class="desc-bascule" data-desc="CLÉ" aria-expanded="false">` dans la ligne ;
 *  - la description `<… class="desc-pliable" data-desc-de="CLÉ" hidden>` (ligne de tableau, <li> ou bloc) ;
 *  - optionnel : `<button class="desc-bascule-tout">` (en-tête de tableau ou de liste) qui ouvre
 *    toutes les descriptions de son tableau / sa liste, ou les ferme si elles sont toutes ouvertes.
 * Les clés ouvertes sont conservées dans `ouvertes` (propriété de l'application), si bien qu'une
 * description ouverte le reste après un rendu (mise à jour de l'acteur, filtre, tri).
 */

/** Conteneur d'un bouton « tout ouvrir » : son tableau ou sa liste. */
const PORTEE_TOUT = "table, ul, ol, .desc-groupe";

/** Éléments d'une ligne cliquable qui gardent leur propre action. */
const INTERACTIFS = "button, a, input, select, textarea, label, [data-action]";

/**
 * Affiche ou masque une description et met à jour son chevron.
 * @param {HTMLElement} root
 * @param {string} cle
 * @param {boolean} ouvrir
 */
export function afficherDescription(root, cle, ouvrir) {
  const sel = CSS.escape(cle);
  const desc = root.querySelector(`[data-desc-de="${sel}"]`);
  if (desc) desc.hidden = !ouvrir;
  for (const bouton of root.querySelectorAll(`.desc-bascule[data-desc="${sel}"]`)) {
    bouton.setAttribute("aria-expanded", String(ouvrir));
    bouton.closest(".desc-ligne")?.classList.toggle("desc-ouverte", ouvrir);
  }
}

/**
 * Applique l'état mémorisé et branche les chevrons.
 * @param {HTMLElement} root              Élément de l'application
 * @param {Set<string>} ouvertes          Clés des descriptions ouvertes (modifié sur place)
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]  Retire l'écouteur au rendu suivant
 * @param {boolean} [options.ligneCliquable=false]  Un clic n'importe où sur la ligne (hors boutons,
 *                                         liens et champs) ouvre aussi la description
 */
export function lierDescriptions(root, ouvertes, { signal, ligneCliquable = false } = {}) {
  const libelle = game.i18n.localize("AGONE.VoirDescription");
  for (const bouton of root.querySelectorAll(".desc-bascule[data-desc]")) {
    bouton.dataset.tooltip ||= libelle;
    bouton.closest("tr, li, .item-row")?.classList.add("desc-ligne");
    afficherDescription(root, bouton.dataset.desc, ouvertes.has(bouton.dataset.desc));
  }
  for (const bouton of root.querySelectorAll(".desc-bascule-tout")) {
    bouton.dataset.tooltip ||= game.i18n.localize("AGONE.DescriptionsToutes");
    majBoutonTout(bouton);
  }
  if (ligneCliquable) root.classList.add("desc-lignes-cliquables");

  const basculer = (cle, ouvrir) => {
    if (ouvrir) ouvertes.add(cle);
    else ouvertes.delete(cle);
    afficherDescription(root, cle, ouvrir);
    // Animation d'entrée seulement sur l'ouverture par clic (pas lors de la restauration au rendu,
    // gérée plus haut par afficherDescription() directement, sans passer par basculer()).
    if (ouvrir) {
      const desc = root.querySelector(`[data-desc-de="${CSS.escape(cle)}"]`);
      if (desc) {
        desc.classList.add("agone-entree");
        desc.addEventListener("animationend", () => desc.classList.remove("agone-entree"), { once: true });
      }
    }
  };

  root.addEventListener("click", event => {
    const cible = event.target instanceof Element ? event.target : null;
    if (!cible) return;

    const tout = cible.closest(".desc-bascule-tout");
    if (tout) {
      event.preventDefault();
      const boutons = [...(tout.closest(PORTEE_TOUT) ?? root).querySelectorAll(".desc-bascule[data-desc]")];
      const ouvrir = boutons.some(b => b.getAttribute("aria-expanded") !== "true");
      for (const b of boutons) basculer(b.dataset.desc, ouvrir);
      majBoutonTout(tout);
      return;
    }

    let bouton = cible.closest(".desc-bascule");
    if (!bouton && ligneCliquable && !cible.closest(INTERACTIFS)) {
      bouton = cible.closest(".desc-ligne")?.querySelector(".desc-bascule[data-desc]");
    }
    if (!bouton) return;
    event.preventDefault();
    basculer(bouton.dataset.desc, bouton.getAttribute("aria-expanded") !== "true");
    for (const t of root.querySelectorAll(".desc-bascule-tout")) majBoutonTout(t);
  }, { signal });
}

/** Le bouton « tout ouvrir » indique si toutes les descriptions de sa portée sont ouvertes. */
function majBoutonTout(tout) {
  const boutons = [...(tout.closest(PORTEE_TOUT)?.querySelectorAll(".desc-bascule[data-desc]") ?? [])];
  const toutesOuvertes = boutons.length > 0 && boutons.every(b => b.getAttribute("aria-expanded") === "true");
  tout.setAttribute("aria-expanded", String(toutesOuvertes));
  tout.hidden = boutons.length === 0;
}
