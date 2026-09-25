import { delegate, activerClavier } from "../helpers/dom.mjs";
import { changeEffet, lireChange } from "../helpers/effets.mjs";
import { bindTabs, appliquerLectureSeule } from "./sheet-helpers.mjs";
import { BIENFAITS_PERFIDIE_DATA, descriptionBienfait } from "../helpers/compendium-data.mjs";

/** Champs de texte riche (HTML) des items, rendus par parts/editeur.hbs. */
const CHAMPS_HTML = ["description", "notes", "connivances", "bienfaitDescription"];

/** Types d'item qui peuvent porter des effets actifs (bonus / malus transférés au porteur). */
const TYPES_AVEC_EFFETS = ["don", "arme", "armure", "equipement", "pouvoir", "peine"];

const TYPES_MAGIE = ["jorniste", "obscurantiste", "eclipsiste", "accord", "cyse", "decorum", "geste"];

/**
 * Feuille d'item — un template par type (`templates/items/<type>-sheet.hbs`).
 * Le contexte commun est complété par `_prepare<Type>Context` quand le type en a besoin,
 * et par l'éditeur d'effets actifs (`parts/effets.hbs`) pour les types de TYPES_AVEC_EFFETS.
 */
export class AgoneItemSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {

  static DEFAULT_OPTIONS = {
    classes : ["agone", "sheet", "item"],
    position: { width: 560, height: 620 },
    window  : { resizable: true },
    actions : {
      toChat         : AgoneItemSheet.#onToChat,
      effetCreer     : AgoneItemSheet.#onEffetCreer,
      bienfaitTexteLivre: AgoneItemSheet.#onBienfaitTexteLivre,
      effetEditer    : AgoneItemSheet.#onEffetEditer,
      effetSupprimer : AgoneItemSheet.#onEffetSupprimer,
      modifAjouter   : AgoneItemSheet.#onModifAjouter,
      modifSupprimer : AgoneItemSheet.#onModifSupprimer,
    },
  };

  // Le template réel dépend du type d'item (voir _renderHTML)
  static PARTS = {
    form: {
      template  : "systems/agone/templates/items/competence-sheet.hbs",
      scrollable: [".sheet-body"],
    },
  };

  /** @override — template selon le type d'item */
  async _renderHTML(context, options) {
    const template = `systems/agone/templates/items/${this.item.type}-sheet.hbs`;
    const html = await foundry.applications.handlebars.renderTemplate(template, context);
    const el = document.createElement("div");
    el.innerHTML = html;
    const partNode = el.firstElementChild ?? el;
    partNode.setAttribute("data-application-part", "form");
    return { form: partNode };
  }

  /** @override */
  async _prepareContext(options) {
    const item = this.item;
    const context = {
      item,
      system  : item.system,
      editable: this.isEditable,
    };
    // Texte riche en lecture seule : liens, jets inline et secrets enrichis
    context.enrichi = {};
    for (const champ of CHAMPS_HTML) {
      if (typeof item.system[champ] !== "string") continue;
      context.enrichi[champ] = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        item.system[champ], { secrets: item.isOwner, relativeTo: item }
      );
    }
    const type = item.type.charAt(0).toUpperCase() + item.type.slice(1);
    await this[`_prepare${type}Context`]?.(context);
    if (TYPES_AVEC_EFFETS.includes(item.type)) context.groupesEffets = this._prepareGroupesEffets();
    return context;
  }

  // ── Contexte par type ──────────────────────────────────────────────────

  _prepareDonContext(context) {
    const cles = {
      charge: "AGONE.CategorieCharges", ame: "AGONE.Ame", corps: "AGONE.Corps", esprit: "AGONE.Esprit",
      societe: "AGONE.CategorieSociete", emprise: "AGONE.Emprise", arts: "AGONE.CategorieArts",
      saisons: "AGONE.CategorieSaisons", flamme: "AGONE.Flamme",
    };
    context.typeChargeOptions = Object.entries(cles).map(([key, label]) => ({ key, label: game.i18n.localize(label) }));
  }

  _prepareSortContext(context) {
    const existants = game.items
      .filter(i => i.type === "sort")
      .map(i => (i.system?.typeMagie ?? "").trim().toLowerCase())
      .filter(Boolean);
    context.magicTypeOptions = [...new Set([...TYPES_MAGIE, ...existants])].sort((a, b) => a.localeCompare(b, "fr"));
  }

  /** Compétences connues du monde (items du monde et des acteurs). */
  static _competencesDuMonde() {
    return [
      ...game.items.filter(i => i.type === "competence"),
      ...[...game.actors].flatMap(a => [...a.items.filter(i => i.type === "competence")]),
    ];
  }

  _prepareCompetenceContext(context) {
    const artsExistants = this.constructor._competencesDuMonde()
      .filter(i => i.name === "Arts Magiques")
      .map(i => i.system?.domaine ?? "").filter(Boolean);
    const artsCustom = (game.settings.get("agone", "domainesArtsCustom") ?? []).map(d => d.nom);
    context.artsDomainOptions = [...new Set(["Accord", "Cyse", "Décorum", "Geste", ...artsCustom, ...artsExistants])]
      .sort((a, b) => a.localeCompare(b, "fr"));
    context.musicDomainOptions     = ["harpe", "flute", "viole", "tambour", "cistre"];
    context.saisonDomainOptions    = ["printemps", "ete", "automne", "hiver"];
    context.resonanceDomainOptions = ["jorniste", "eclipsiste", "obscurantiste"];
  }

  _prepareArmeContext(context) {
    const actor = this.item.actor;
    context.isEmbedded = !!actor;
    if (!actor) {
      // Item du monde : liste des domaines connus
      context.worldCompDomaines = [...new Set(
        this.constructor._competencesDuMonde().map(i => i.system?.domaine ?? "").filter(Boolean)
      )].sort((a, b) => a.localeCompare(b, "fr"));
      return;
    }
    // Compétences de combat (attribut lié mêlée ou tir, cohérent avec rollAttaque)
    const comps = actor.items
      .filter(i => i.type === "competence" && (i.system.attributLie === "melee" || i.system.attributLie === "tir"))
      .sort((a, b) => (a.system.domaine || a.name).localeCompare(b.system.domaine || b.name, "fr"));
    context.actorCompetences = comps.map(c => ({
      domaine : c.system.domaine || "",
      label   : c.system.domaine ? `${c.name} (${c.system.domaine}) · ${c.system.score}` : `${c.name} · ${c.system.score}`,
      selected: c.system.domaine === (this.item.system.competence ?? ""),
    }));
    const linked = actor.items.find(i => i.type === "competence" && i.system.domaine === this.item.system.competence);
    context.linkedComp = linked ? { name: linked.name, domaine: linked.system.domaine, score: linked.system.score } : null;
  }

  _preparePeineContext(context) {
    context.categoriesPeine = [
      { value: "creature_masque", label: "AGONE.PerfidieCatCreatures" },
      { value: "lieu_perfidie",   label: "AGONE.PerfidieCatLieu" },
      { value: "autre",           label: "AGONE.PerfidieCatAutres" },
    ];
    context.aspectsNoirs = [
      { value: "corps", label: "AGONE.Corps" },
      { value: "ame",   label: "AGONE.Ame" },
      { value: "",      label: "AGONE.Aucun" },
    ];
    // Bienfait : noms connus (suggestions), texte du livre repris si la description propre est vide
    const system = this.item.system;
    context.bienfaitsConnus = BIENFAITS_PERFIDIE_DATA.map(b => b.name);
    context.bienfaitTexteLivre = descriptionBienfait(system.bienfait);
    context.bienfaitPersonnalise = !!(system.bienfaitDescription ?? "").trim();
  }

  // ── Effets actifs ──────────────────────────────────────────────────────

  /**
   * Groupes d'effets affichés par parts/effets.hbs. Une peine en a deux : ses propres effets
   * (actifs dès qu'elle est possédée) et ceux de son bienfait (actifs une fois le bienfait acquis).
   */
  _prepareGroupesEffets() {
    const effets = this._prepareEffets();
    if (this.item.type !== "peine") return [{ titre: "AGONE.Effets.Titre", bienfait: false, effets, vide: "AGONE.Effets.Aucun" }];
    const acquis = !!this.item.system.bienfaitAcquis;
    return [
      { titre: "AGONE.Peine.EffetsPeine", aide: "AGONE.Peine.EffetsPeineAide", bienfait: false,
        effets: effets.filter(e => !e.bienfait), vide: "AGONE.Peine.AucunEffetPeine" },
      { titre: "AGONE.Peine.EffetsBienfait", aide: acquis ? "AGONE.Peine.EffetsBienfaitActifs" : "AGONE.Peine.EffetsBienfaitSuspendus",
        bienfait: true, suspendu: !acquis, effets: effets.filter(e => e.bienfait), vide: "AGONE.Peine.AucunEffetBienfait" },
    ];
  }

  /** Effets de l'item et leurs modificateurs. */
  _prepareEffets() {
    const stats = Object.entries(CONFIG.AGONE.effets).map(([value, def]) => ({ value, label: game.i18n.localize(def.label) }));
    return this.item.effects.map(effect => ({
      bienfait: !!effect.getFlag("agone", "bienfait"),
      id      : effect.id,
      name    : effect.name,
      img     : effect.img,
      disabled: effect.disabled,
      changes : effect.changes.map((change, index) => {
        const { stat, def, connu } = lireChange(change);
        return {
          index, connu, key: change.key, value: change.value,
          booleen: !!def?.booleen,
          options: stats.map(s => ({ ...s, selected: s.value === stat })),
        };
      }),
    }));
  }

  _effetDepuis(target) {
    return this.item.effects.get(target.closest("[data-effect-id]")?.dataset.effectId);
  }

  /** Nouvel effet ; `data-bienfait` sur le bouton : effet du bienfait de la peine. */
  static async #onEffetCreer(event, target) {
    const bienfait = !!target.dataset.bienfait;
    await this.item.createEmbeddedDocuments("ActiveEffect", [{
      name    : bienfait ? (this.item.system.bienfait || this.item.name) : this.item.name,
      img     : this.item.img,
      transfer: true,
      changes : [changeEffet("agilite", 1)],
      flags   : bienfait ? { agone: { bienfait: true } } : {},
    }]);
  }

  /** Peine : reprend le texte du livre comme description modifiable du bienfait. */
  static async #onBienfaitTexteLivre(event, target) {
    const texte = descriptionBienfait(this.item.system.bienfait);
    if (texte) await this.item.update({ "system.bienfaitDescription": `<p>${foundry.utils.escapeHTML(texte)}</p>` });
  }

  static #onEffetEditer(event, target) {
    this._effetDepuis(target)?.sheet.render(true);
  }

  static async #onEffetSupprimer(event, target) {
    await this._effetDepuis(target)?.delete();
  }

  static async #onModifAjouter(event, target) {
    const effect = this._effetDepuis(target);
    if (effect) await effect.update({ changes: [...effect.changes, changeEffet("agilite", 1)] });
  }

  static async #onModifSupprimer(event, target) {
    const effect = this._effetDepuis(target);
    const index  = Number(target.closest("[data-change-index]")?.dataset.changeIndex);
    if (effect) await effect.update({ changes: effect.changes.filter((c, i) => i !== index) });
  }

  /** Saisie dans l'éditeur d'effets : nom, activation, statistique ou valeur d'un modificateur. */
  async _onEffetChamp(event, input) {
    const effect = this._effetDepuis(input);
    if (!effect) return;
    const champ = input.dataset.effetChamp;
    if (champ === "name")   return effect.update({ name: input.value.trim() || this.item.name });
    if (champ === "actif")  return effect.update({ disabled: !input.checked });

    const index   = Number(input.closest("[data-change-index]")?.dataset.changeIndex);
    const changes = effect.changes.map(c => ({ ...c }));
    const current = changes[index];
    if (!current) return;
    const stat  = champ === "stat" ? input.value : lireChange(current).stat;
    const value = champ === "value" ? input.value : current.value;
    changes[index] = changeEffet(stat, value);
    await effect.update({ changes });
  }

  static #onToChat(event, target) {
    event.preventDefault();
    return this.item.toChat();
  }

  // ── Rendu ──────────────────────────────────────────────────────────────

  /** @override — conserve la position de défilement autour du remplacement DOM */
  _replaceHTML(result, content, options) {
    const savedScroll = content.querySelector(".sheet-body")?.scrollTop ?? 0;
    super._replaceHTML(result, content, options);
    if (savedScroll > 0) {
      const scrollEl = content.querySelector(".sheet-body");
      if (scrollEl) scrollEl.scrollTop = savedScroll;
    }
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // AbortController : retire les écouteurs du rendu précédent (l'élément racine persiste)
    this._renderSignal?.abort();
    this._renderSignal = new AbortController();
    const signal = this._renderSignal.signal;

    // Sauvegarde automatique des champs nommés
    this.element.querySelector("form")?.addEventListener("change", async (ev) => {
      const el = ev.target;
      if (!this.isEditable || !el.name) return;
      if (el.type === "number" && (el.value === "" || isNaN(Number(el.value)))) el.value = "0";
      if (el.name === "system.typeMagie") el.value = el.value.trim().toLowerCase();
      const value = el.type === "checkbox" ? el.checked
                  : el.type === "number"   ? Number(el.value)
                  : el.value;
      await this.item.update(foundry.utils.expandObject({ [el.name]: value }));
    }, { signal });

    // Éditeurs ProseMirror : sauvegarde quand le focus quitte l'éditeur
    for (const pm of this.element.querySelectorAll("prose-mirror[name]")) {
      pm.addEventListener("focusout", (ev) => {
        if (pm.contains(ev.relatedTarget)) return; // focus resté dans l'éditeur
        pm.dispatchEvent(new Event("change", { bubbles: true }));
      }, { signal });
    }

    const root = this.element;
    const on   = (type, selector, handler) => delegate(root, type, selector, handler, { signal });
    bindTabs(this, root, on, "description");
    activerClavier(root, signal);
    appliquerLectureSeule(root, !this.isEditable);
    if (!this.isEditable) return;
    on("change", "[data-effet-champ]", (ev, input) => this._onEffetChamp(ev, input));
  }
}
