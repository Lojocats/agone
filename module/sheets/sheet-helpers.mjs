/**
 * Comportements communs aux fiches Agone (acteurs et items).
 * `on(type, selector, handler)` est l'écouteur délégué de la fiche (voir helpers/dom.mjs).
 */

/**
 * Onglets de fiche : restaure l'onglet actif (`sheet._currentTab`) et gère le changement.
 * @param {string} [defaultTab]  Onglet de la première ouverture ; à défaut, celui que le template
 *                               marque `active`, sinon le premier de la barre d'onglets.
 */
export function bindTabs(sheet, root, on, defaultTab) {
  // `animer` : n'ajoute l'animation d'entrée (classe .agone-entree, retirée à animationend) que sur un
  // clic utilisateur, jamais lors de la restauration de l'onglet actif à chaque rendu (autosave, etc.),
  // sous peine de clignoter en boucle.
  const activate = (tab, { animer = false } = {}) => {
    root.querySelectorAll(".sheet-tabs .item[data-tab]").forEach(el => el.classList.toggle("active", el.dataset.tab === tab));
    root.querySelectorAll(".tab[data-tab]").forEach(el => {
      const estActif = el.dataset.tab === tab;
      el.classList.toggle("active", estActif);
      if (animer && estActif) {
        el.classList.add("agone-entree");
        el.addEventListener("animationend", () => el.classList.remove("agone-entree"), { once: true });
      }
    });
  };
  const initial = sheet._currentTab ?? defaultTab
    ?? root.querySelector(".sheet-tabs .item.active[data-tab]")?.dataset.tab
    ?? root.querySelector(".sheet-tabs .item[data-tab]")?.dataset.tab;
  if (initial) activate(initial);
  on("click", ".sheet-tabs .item[data-tab]", (_event, target) => {
    const tab = target.dataset.tab;
    if (!tab) return;
    sheet._currentTab = tab;
    activate(tab, { animer: true });
  });
}

/**
 * Contrôles qui restent actifs sur une fiche en lecture seule : consultation sans modification
 * (sections, ouverture et envoi au chat des objets, recherche et filtres).
 */
export const CONTROLES_CONSULTATION = [
  ".item-edit", "[data-action='rollItemChat']", "[data-action='toChat']",
  ".comp-search-input", ".comp-search-clear", ".smf-search", ".smf-check", ".desc-bascule", ".desc-bascule-tout",
].join(", ");

/**
 * Fiche en lecture seule (observateur) : désactive les champs et les boutons de modification ou de jet.
 * Les templates ont leur propre `<form>`, imbriqué dans celui de la fiche : les champs appartiennent
 * au formulaire interne et la désactivation automatique de DocumentSheetV2 ne les atteint pas.
 * @param {HTMLElement} root         Élément de la fiche (conservé d'un rendu à l'autre)
 * @param {boolean} lectureSeule     La fiche n'est pas modifiable par l'utilisateur
 */
export function appliquerLectureSeule(root, lectureSeule) {
  root.classList.toggle("agone-lecture-seule", lectureSeule);
  if (!lectureSeule) return;
  const champs = root.querySelectorAll(
    ".window-content :is(input, select, textarea, button, prose-mirror)");
  for (const el of champs) {
    if (!el.matches(CONTROLES_CONSULTATION)) el.disabled = true;
  }
}

/**
 * Recherche dans la liste des compétences (.comp-search-input / .comp-search-clear).
 * @param {boolean} [nonAcquises=false]  Chercher aussi dans la section des compétences non acquises
 */
export function bindCompetenceSearch(root, on, { nonAcquises = false } = {}) {
  on("input", ".comp-search-input", (_event, input) => filterCompetences(root, input.value, nonAcquises));
  on("click", ".comp-search-clear", () => {
    const input = root.querySelector(".comp-search-input");
    if (!input) return;
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function filterCompetences(root, value, nonAcquises) {
  const query = value.trim().toLowerCase();
  const clearBtn = root.querySelector(".comp-search-clear");
  if (clearBtn) clearBtn.style.display = query ? "" : "none";

  // Cartes acquises ; les groupes vides sont masqués
  let acquisesVisibles = false;
  root.querySelectorAll(".comp-group").forEach(group => {
    let anyVisible = false;
    group.querySelectorAll(".comp-card.item-row").forEach(card => {
      const name = (card.querySelector(".comp-card-name")?.textContent ?? "").trim().toLowerCase();
      const visible = !query || name.includes(query);
      card.style.display = visible ? "" : "none";
      if (visible) anyVisible = true;
    });
    group.style.display = (!query || anyVisible) ? "" : "none";
    if (anyVisible) acquisesVisibles = true;
  });

  // Section non acquises : visible seulement pendant une recherche qui y trouve quelque chose
  const naSection = root.querySelector(".comps-na-section");
  let naVisibles = false;
  if (naSection) {
    if (!nonAcquises || !query) {
      naSection.style.display = "none";
    } else {
      root.querySelectorAll(".comp-card--na.na-row").forEach(card => {
        const nom     = (card.dataset.nom     ?? "").toLowerCase();
        const domaine = (card.dataset.domaine ?? "").toLowerCase();
        const visible = nom.includes(query) || domaine.includes(query);
        card.style.display = visible ? "" : "none";
        if (visible) naVisibles = true;
      });
      naSection.style.display = naVisibles ? "" : "none";
    }
  }

  // Message d'état vide : recherche en cours mais aucune carte (acquise ou non) ne correspond
  const empty = root.querySelector(".comp-search-empty");
  if (empty) empty.hidden = !query || acquisesVisibles || naVisibles;
}

/**
 * Ouvre `app` comme enfant de `parent` : même fenêtre (pop-out) et fermeture avec le parent.
 * Sans parent rendu, l'application est simplement rendue.
 * @param {ApplicationV2} parent
 * @param {ApplicationV2} app
 * @param {object} [options]  Options de rendu
 * @returns {Promise<ApplicationV2>}
 */
export function ouvrirEnfant(parent, app, options = {}) {
  if (typeof parent?.renderChild === "function") return parent.renderChild(app, options);
  return app.render({ force: true, ...options });
}

/**
 * Dialogue de confirmation oui / non ouvert comme enfant de `parent`.
 * `content` est du HTML : échapper les noms saisis par l'utilisateur (foundry.utils.escapeHTML).
 * @returns {Promise<boolean>}  false si le dialogue est fermé sans réponse
 */
export function confirmerEnfant(parent, { title, content }) {
  return new Promise(resolve => {
    let settled = false;
    const settle = (v) => { if (!settled) { settled = true; resolve(v); } };
    const dialog = new foundry.applications.api.DialogV2({
      window: { title },
      content,
      buttons: [
        { action: "yes", icon: "fas fa-check", label: game.i18n.localize("Yes"), default: true,
          callback: () => settle(true) },
        { action: "no",  icon: "fas fa-times", label: game.i18n.localize("No"),
          callback: () => settle(false) },
      ],
      rejectClose: false,
    });
    dialog.addEventListener("close", () => settle(false), { once: true });
    Promise.resolve(ouvrirEnfant(parent, dialog)).catch(() => settle(false));
  });
}

/**
 * Action `editImage` des fiches : choisit l'image du document (portrait, icône) avec le sélecteur de
 * fichiers. L'image porte `data-action="editImage"` et `data-edit="img"` (champ à modifier).
 * Gestionnaire propre plutôt que celui de DocumentSheetV2, qui passe par la soumission du formulaire
 * de la fiche : nos templates ont leur propre <form> et les fiches d'item n'ont pas submitOnChange.
 * @this {DocumentSheetV2}
 */
export async function editerImage(_event, target) {
  if (!this.isEditable) return;
  const champ   = target.dataset.edit || "img";
  const courant = foundry.utils.getProperty(this.document._source, champ);
  const defaut  = this.document.constructor.getDefaultArtwork?.(this.document._source)?.[champ];
  const FilePicker = foundry.applications.apps.FilePicker.implementation;
  const selecteur = new FilePicker({
    current : courant,
    type    : "image",
    redirectToRoot: defaut ? [defaut] : [],
    callback: chemin => this.document.update({ [champ]: chemin }),
    position: { top: (this.position?.top ?? 0) + 40, left: (this.position?.left ?? 0) + 10 },
    document: this.document,
  });
  await selecteur.browse();
}

// ── Focus conservé d'un rendu à l'autre ──────────────────────────────────

const attr = (nom, valeur) => `[${nom}="${CSS.escape(valeur)}"]`;

/**
 * Sélecteur stable d'un champ de saisie, pour le retrouver après un re-rendu. Foundry restaure le
 * focus par `id` ou `name` ; nos champs à gestionnaire dédié n'en ont pas et sont identifiés par
 * leurs attributs data-* (item, champ, index de ligne, effet, modificateur).
 * @param {HTMLElement} el
 * @returns {string|null}
 */
export function cleFocus(el) {
  if (!el?.matches?.("input, select, textarea")) return null;
  if (el.name) return `${el.tagName.toLowerCase()}${attr("name", el.name)}`;
  if (el.id) return `#${CSS.escape(el.id)}`;
  const d = el.dataset;
  if (d.rawInput) return attr("data-raw-input", d.rawInput);
  if (d.effetChamp) {
    const effet = el.closest("[data-effect-id]")?.dataset.effectId;
    const index = el.closest("[data-change-index]")?.dataset.changeIndex;
    if (!effet) return null;
    return `${attr("data-effect-id", effet)} ${index !== undefined ? `${attr("data-change-index", index)} ` : ""}${attr("data-effet-champ", d.effetChamp)}`;
  }
  if (d.field) {
    const champ = attr("data-field", d.field);
    if (d.itemId) return `${attr("data-item-id", d.itemId)}${champ}`;
    const ligne = el.closest("[data-idx]")?.dataset.idx;
    if (ligne !== undefined) return `${attr("data-idx", ligne)} ${champ}`;
  }
  return null;
}

/**
 * Champ focalisé dans `root` (et position du curseur), à appeler avant le remplacement du DOM.
 * @returns {{selecteur: string, debut: number|null, fin: number|null}|null}
 */
export function memoriserFocus(root) {
  const actif = root?.ownerDocument?.activeElement;
  if (!actif || !root.contains(actif)) return null;
  const selecteur = cleFocus(actif);
  if (!selecteur) return null;
  let debut = null, fin = null;
  try { debut = actif.selectionStart; fin = actif.selectionEnd; } catch { /* champ sans sélection (number…) */ }
  return { selecteur, debut, fin };
}

/** Redonne le focus (et le curseur) au champ mémorisé par `memoriserFocus`, après le rendu. */
export function restaurerFocus(root, etat) {
  if (!etat || !root) return;
  const el = root.querySelector(etat.selecteur);
  if (!el || el.disabled) return;
  if (root.ownerDocument.activeElement !== el) el.focus({ preventScroll: true });
  if (etat.debut !== null && etat.debut !== undefined) {
    try { el.setSelectionRange(etat.debut, etat.fin ?? etat.debut); } catch { /* champ sans sélection */ }
  }
}
