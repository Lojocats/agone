/**
 * Comportements communs aux fiches Agone (acteurs et items).
 * `on(type, selector, handler)` est l'écouteur délégué de la fiche (voir helpers/dom.mjs).
 */

/**
 * Onglets de fiche : restaure l'onglet actif (`sheet._currentTab`) et gère le changement.
 */
export function bindTabs(sheet, root, on, defaultTab = "attributs") {
  const activate = tab => {
    root.querySelectorAll(".sheet-tabs .item[data-tab]").forEach(el => el.classList.toggle("active", el.dataset.tab === tab));
    root.querySelectorAll(".tab[data-tab]").forEach(el => el.classList.toggle("active", el.dataset.tab === tab));
  };
  activate(sheet._currentTab ?? defaultTab);
  on("click", ".sheet-tabs .item[data-tab]", (_event, target) => {
    const tab = target.dataset.tab;
    if (!tab) return;
    sheet._currentTab = tab;
    activate(tab);
  });
}

/**
 * Contrôles qui restent actifs sur une fiche en lecture seule : consultation sans modification
 * (sections, ouverture et envoi au chat des objets, recherche et filtres).
 */
export const CONTROLES_CONSULTATION = [
  ".section-toggle", ".item-edit", ".item-send-chat", "[data-action='rollItemChat']", "[data-action='toChat']",
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
  root.querySelectorAll(".comp-group").forEach(group => {
    let anyVisible = false;
    group.querySelectorAll(".comp-card.item-row").forEach(card => {
      const name = (card.querySelector(".comp-card-name")?.textContent ?? "").trim().toLowerCase();
      const visible = !query || name.includes(query);
      card.style.display = visible ? "" : "none";
      if (visible) anyVisible = true;
    });
    group.style.display = (!query || anyVisible) ? "" : "none";
  });

  // Section non acquises : visible seulement pendant une recherche qui y trouve quelque chose
  const naSection = root.querySelector(".comps-na-section");
  if (!naSection) return;
  if (!nonAcquises || !query) { naSection.style.display = "none"; return; }

  let anyVisible = false;
  root.querySelectorAll(".comp-card--na.na-row").forEach(card => {
    const nom     = (card.dataset.nom     ?? "").toLowerCase();
    const domaine = (card.dataset.domaine ?? "").toLowerCase();
    const visible = nom.includes(query) || domaine.includes(query);
    card.style.display = visible ? "" : "none";
    if (visible) anyVisible = true;
  });
  naSection.style.display = anyVisible ? "" : "none";
}
