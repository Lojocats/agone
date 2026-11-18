/**
 * Construction du HTML et des boutons des dialogues de jet (DialogV2).
 * Les libellés passés aux champs sont du HTML de confiance (textes i18n) : toute valeur saisie par
 * un utilisateur (nom d'objet, de compétence, spécialité…) doit passer par `echapper`.
 */

/** Échappe un texte destiné à être inséré dans du HTML. */
export function echapper(texte) {
  return foundry.utils.escapeHTML(String(texte ?? ""));
}

/** Champ numérique. */
export function champNombre(nom, libelleHtml, { autofocus = false, min = null } = {}) {
  return `
            <div class="form-group">
              <label>${libelleHtml}</label>
              <input type="number" id="${nom}" name="${nom}" value="0"${min === null ? "" : ` min="${min}"`}${autofocus ? " autofocus" : ""}/>
            </div>`;
}

/** Case à cocher. */
export function champCase(nom, libelleHtml, { coche = false } = {}) {
  return `
            <div class="form-group form-check">
              <input type="checkbox" id="${nom}" name="${nom}"${coche ? " checked" : ""} />
              <label for="${nom}">${libelleHtml}</label>
            </div>`;
}

/** Liste déroulante ; valeurs et libellés des options sont échappés. */
export function champSelect(nom, libelleHtml, options) {
  const html = options.map(o =>
    `<option value="${echapper(o.value)}"${o.selected ? " selected" : ""}>${echapper(o.label)}</option>`
  ).join("");
  return `
            <div class="form-group">
              <label>${libelleHtml}</label>
              <select id="${nom}" name="${nom}">${html}</select>
            </div>`;
}

/** Case « Jet ouvert » (cochée par défaut). */
export function champJetOuvert() {
  return champCase("typeJet", game.i18n.localize("AGONE.JetOuvert"), { coche: true });
}

/**
 * Contenu d'un dialogue de jet : titre (échappé) puis lignes de formulaire.
 * @param {string} titre           Texte brut (peut contenir un nom saisi par l'utilisateur)
 * @param {string[]} lignes        Lignes HTML (les valeurs vides sont ignorées)
 * @param {object} [options]
 * @param {boolean} [options.titreHtml=false]  Le titre est déjà du HTML sûr
 */
export function contenuDialogueJet(titre, lignes = [], { titreHtml = false } = {}) {
  const entete = titreHtml ? `<p>${titre}</p>` : `<p><strong>${echapper(titre)}</strong></p>`;
  return `
        <form>
          <div class="agone-roll-dialog">
            ${entete}${lignes.filter(Boolean).join("")}
          </div>
        </form>
      `;
}

/**
 * Boutons « Lancer » / « Annuler » d'un dialogue de jet.
 * @param {Function} lire  (elements) => résultat du dialogue, d'après `form.elements`
 */
export function boutonsDialogueJet(lire) {
  return [
    {
      action:   "lancer",
      icon:     "fas fa-dice-d10",
      label:    game.i18n.localize("AGONE.Lancer"),
      default:  true,
      callback: (event, button) => lire(button.form.elements),
    },
    {
      action: "annuler",
      icon:   "fas fa-times",
      label:  game.i18n.localize("AGONE.Annuler"),
    },
  ];
}
