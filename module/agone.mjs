/**
 * Agone – système pour FoundryVTT v13
 * Point d'entrée principal du module.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────
import { AGONE }                from "./helpers/config.mjs";
import { ARMES_DATA, ARMURES_DATA, BOUCLIERS_DATA, SORTS_DATA, PEUPLES_DATA } from "./helpers/compendium-data.mjs";
import { registerHandlebarsHelpers as registerHandlebars } from "./helpers/handlebars.mjs";

// ── DataModels ────────────────────────────────────────────────────────────────
import {
  PersonnageData, CompagnonData, DemonData, PnjData
} from "./data/actor-data.mjs";
import {
  CompetenceData, ArmeData, ArmureData, DonData,
  SortData, EquipementData, PouvoirData, ManoeuvreData, PeupleData,
  DanseurData, DemonItemData, PeineData
} from "./data/item-data.mjs";

// ── Documents ─────────────────────────────────────────────────────────────────
import { AgoneActor }       from "./documents/actor.mjs";
import { AgoneItem }        from "./documents/item.mjs";

// ── Sheets ────────────────────────────────────────────────────────────────────
import { PersonnageSheet }   from "./sheets/personnage-sheet.mjs";

// ── Apps ─────────────────────────────────────────────────────────────────────
import { SortsBrowser }     from "./apps/sorts-browser.mjs";
import { AvantagesBrowser } from "./apps/avantages-browser.mjs";
import { PeinesBrowser }   from "./apps/peines-browser.mjs";
import { SaisonConfig }        from "./apps/saison-config.mjs";
import { CalendrierAgone }     from "./apps/calendrier.mjs";
import { CalendrierWidget }    from "./apps/calendrier-widget.mjs";
import { DomainesArtsConfig }  from "./apps/domaines-arts-config.mjs";
import { AgoreCombatTracker }  from "./apps/combat-tracker.mjs";
import {
  CompagnonSheet, DemonSheet, PnjSheet
} from "./sheets/actor-sheets.mjs";
import { AgoneItemSheet }    from "./sheets/item-sheet.mjs";

/* ============================================================================
 * INIT HOOK
 * ========================================================================= */
Hooks.once("init", () => {
  console.log("Agone | Initialisation du système");

  // Référence globale
  game.agone = { AgoneActor, AgoneItem, DomainesArtsConfig, AgoreCombatTracker };
  CONFIG.AGONE = AGONE;
  // ── Saison du Monde (paramètre monde) ────────────────────────────────────
  game.settings.register("agone", "saisonMonde", {
    name: "AGONE.SaisonMonde",
    hint: "AGONE.SaisonMondeHint",
    scope: "world",
    config: false,
    type: String,
    default: "",
    onChange: () => {
      for (const actor of game.actors ?? []) {
        if (actor.sheet?.rendered) actor.sheet.render(false);
      }
    },
  });

  // ── Labels de santé (textes affichés au hover d'un token non-possédé) ──
  const _santeLabels = [
    { key: "santeLabel100", def: "se porte à merveille",      hint: "AGONE.SanteLabel100Hint" },
    { key: "santeLabel75",  def: "se porte bien",             hint: "AGONE.SanteLabel75Hint"  },
    { key: "santeLabel50",  def: "a vu de meilleurs jours",   hint: "AGONE.SanteLabel50Hint"  },
    { key: "santeLabel25",  def: "est blessé",                hint: "AGONE.SanteLabel25Hint"  },
    { key: "santeLabel10",  def: "est aux portes de la mort", hint: "AGONE.SanteLabel10Hint"  },
    { key: "santeLabel0",   def: "semble mourant",            hint: "AGONE.SanteLabel0Hint"   },
  ];
  for (const { key, def, hint } of _santeLabels) {
    game.settings.register("agone", key, {
      name: `AGONE.${key.charAt(0).toUpperCase() + key.slice(1)}`,
      hint,
      scope: "world",
      config: true,
      type: String,
      default: def,
    });
  }

  // ── Calendrier d'Harmonde ────────────────────────────────────────────
  game.settings.register("agone", "calendrierDate", {
    scope: "world", config: false,
    type: Object,
    default: { jour: 1, mois: 1, an: 1, heure: 8, minute: 0 },
  });
  game.settings.register("agone", "calendrierNotes", {
    scope: "world", config: false,
    type: Object,
    default: {},
  });
  game.settings.register("agone", "calendrierMeteo", {
    scope: "world", config: false,
    type: String,
    default: "",
  });
  // ── Application automatique de la météo sur la scène ───────────────────
  game.settings.register("agone", "meteoAutoApply", {
    name: "AGONE.MeteoAutoApply",
    hint: "AGONE.MeteoAutoApplyHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  // ── Thème visuel (clair / sombre, par joueur) ─────────────────────────────
  game.settings.register("agone", "agoneTheme", {
    scope: "client", config: false,
    type: String,
    default: "light",
  });
  // ── Domaines d'Arts Magiques personnalisés ─────────────────────────────
  game.settings.register("agone", "domainesArtsCustom", {
    scope: "world", config: false,
    type:  Array,
    default: [],
  });

  // Hachages des données des compendiums pour détection de changement
  game.settings.register("agone", "compendiumHashes", {
    scope: "world", config: false,
    type: Object,
    default: {},
  });
  // ── Initiative : formule pour le tracker de combat natif ────────────────
  CONFIG.Combat.initiative = {
    formula:  "1d10 + @initiative",
    decimals: 0,
  };

  // ── Documents personnalisés ─────────────────────────────────────────────
  CONFIG.Actor.documentClass = AgoneActor;
  CONFIG.Item.documentClass  = AgoneItem;

  // ── DataModels ──────────────────────────────────────────────────────────
  CONFIG.Actor.dataModels = {
    personnage : PersonnageData,
    compagnon  : CompagnonData,
    demon      : DemonData,
    pnj        : PnjData,
  };
  CONFIG.Item.dataModels = {
    competence  : CompetenceData,
    arme        : ArmeData,
    armure      : ArmureData,
    don         : DonData,
    sort        : SortData,
    equipement  : EquipementData,
    pouvoir     : PouvoirData,
    manoeuvre   : ManoeuvreData,
    peuple      : PeupleData,
    danseur     : DanseurData,
    demon       : DemonItemData,
    peine       : PeineData,
  };

  // ── Feuilles ────────────────────────────────────────────────────────────
  const _Actors = foundry.documents.collections.Actors;
  const _Items  = foundry.documents.collections.Items;

  // Désenregistrer les feuilles par défaut (v1 et v2) avant d'enregistrer les nôtres
  try { _Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet); } catch { /* ignoré si absent */ }
  try { _Actors.unregisterSheet("core", foundry.applications.sheets.ActorSheetV2); } catch { /* ignoré si absent */ }

  _Actors.registerSheet("agone", PersonnageSheet, {
    types: ["personnage"], makeDefault: true,
    label: "AGONE.FeuillePersonnage"
  });
  _Actors.registerSheet("agone", CompagnonSheet, {
    types: ["compagnon"], makeDefault: true,
    label: "AGONE.FeuilleCompagnon"
  });
  _Actors.registerSheet("agone", DemonSheet, {
    types: ["demon"], makeDefault: true,
    label: "AGONE.FeuilleDemon"
  });
  _Actors.registerSheet("agone", PnjSheet, {
    types: ["pnj"], makeDefault: true,
    label: "AGONE.FeuillePnj"
  });

  try { _Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet); } catch { /* ignoré si absent */ }
  try { _Items.unregisterSheet("core", foundry.applications.sheets.ItemSheetV2); } catch { /* ignoré si absent */ }
  _Items.registerSheet("agone", AgoneItemSheet, {
    makeDefault: true,
    label: "AGONE.FeuilleItem"
  });

  // ── Helpers Handlebars ──────────────────────────────────────────────────
  registerHandlebars();

  // ── Préchargement des templates ─────────────────────────────────────────
  const templates = [
    // Acteurs
    "systems/agone/templates/actors/personnage-sheet.hbs",
    "systems/agone/templates/actors/compagnon-sheet.hbs",
    "systems/agone/templates/actors/demon-sheet.hbs",
    "systems/agone/templates/actors/pnj-sheet.hbs",
    // Partials acteurs
    "systems/agone/templates/actors/parts/attributs.hbs",
    "systems/agone/templates/actors/parts/competences.hbs",
    "systems/agone/templates/actors/parts/combat.hbs",
    "systems/agone/templates/actors/parts/magie.hbs",
    "systems/agone/templates/actors/parts/avantages.hbs",
    "systems/agone/templates/actors/parts/tenebres.hbs",
    "systems/agone/templates/actors/parts/equipement-tab.hbs",
    "systems/agone/templates/actors/parts/identite.hbs",
    "systems/agone/templates/actors/parts/flamme.hbs",
    // Items
    "systems/agone/templates/items/competence-sheet.hbs",
    "systems/agone/templates/items/arme-sheet.hbs",
    "systems/agone/templates/items/armure-sheet.hbs",
    "systems/agone/templates/items/don-sheet.hbs",
    "systems/agone/templates/items/sort-sheet.hbs",
    "systems/agone/templates/items/equipement-sheet.hbs",
    "systems/agone/templates/items/pouvoir-sheet.hbs",
    "systems/agone/templates/items/manoeuvre-sheet.hbs",
    "systems/agone/templates/items/peuple-sheet.hbs",
    "systems/agone/templates/items/danseur-sheet.hbs",
    // Chat
    "systems/agone/templates/chat/roll-result.hbs",
    // Apps
    "systems/agone/templates/apps/sorts-browser.hbs",
    "systems/agone/templates/apps/armes-browser.hbs",
    "systems/agone/templates/apps/armures-browser.hbs",
    "systems/agone/templates/apps/dons-browser.hbs",
    "systems/agone/templates/apps/avantages-browser.hbs",
    "systems/agone/templates/apps/peines-browser.hbs",
    // Partials Perfidie
    "systems/agone/templates/actors/parts/perfidie.hbs",
    "systems/agone/templates/actors/parts/companions.hbs",
    "systems/agone/templates/actors/parts/parametres.hbs",
    "systems/agone/templates/apps/manoeuvres-browser.hbs",
    "systems/agone/templates/apps/peuples-browser.hbs",
    "systems/agone/templates/apps/pouvoirs-browser.hbs",
    "systems/agone/templates/apps/saison-config.hbs",
    "systems/agone/templates/apps/calendrier.hbs",
    "systems/agone/templates/apps/calendrier-widget.hbs",
    "systems/agone/templates/apps/combat-tracker.hbs",
  ];
  foundry.applications.handlebars.loadTemplates(templates);

  // ── Modificateur de status d'effets ────────────────────────────────────
  CONFIG.statusEffects = [
    { id: "mort",        label: "AGONE.Mort",        icon: "icons/svg/skull.svg" },
    { id: "inconscient", label: "AGONE.Inconscient",  icon: "icons/svg/unconscious.svg" },
    { id: "blesse",      label: "AGONE.Blesse",       icon: "icons/svg/blood.svg" },
    { id: "epuise",      label: "AGONE.Epuise",       icon: "icons/svg/degen.svg" },
    { id: "immobilise",  label: "AGONE.Immobilise",   icon: "icons/svg/net.svg" },
    { id: "contraint",   label: "AGONE.Contraint",    icon: "icons/svg/padlock.svg" },
    { id: "aveugle",     label: "AGONE.Aveugle",      icon: "icons/svg/blind.svg" },
    { id: "sourd",       label: "AGONE.Sourd",        icon: "icons/svg/deaf.svg" },
    { id: "entenebrement", label: "AGONE.Entenebrement", icon: "icons/svg/eye.svg" },
  ];

  console.log("Agone | Initialisation terminée");
});

/* ============================================================================
 * THÈME VISUEL
 * ========================================================================= */
function _applyAgoneTheme(theme) {
  document.body.classList.toggle("agone-dark", theme === "dark");
}

/* ============================================================================
 * READY HOOK
 * ========================================================================= */
Hooks.once("ready", async () => {
  console.log("Agone | Système prêt");

  // Synchroniser saisonMonde avec le mois courant du calendrier
  if (game.user.isGM) {
    try {
      const date = game.settings.get("agone", "calendrierDate") ?? { jour: 1, mois: 1, an: 1 };
      const moisData = CONFIG.AGONE.calendrier.mois[(date.mois - 1)];
      if (moisData) await game.settings.set("agone", "saisonMonde", moisData.saison);
    } catch {}
  }

  // ── Widget calendrier (HUD haut d'écran) ─────────────────────────────
  game.agone.calendrierWidget = new CalendrierWidget();
  game.agone.calendrierWidget.render(true);

  // Applique le thème au démarrage
  _applyAgoneTheme(game.settings.get("agone", "agoneTheme"));

  // ── Météo → Scène ───────────────────────────────────────────────────────
  /**
   * Applique l'effet météo et la luminosité à la scène active.
   * Utilise FXMaster si disponible (particules + filtres riches),
   * sinon fallback sur le weather natif Foundry V14.
   */

  // IDs des effets FXMaster actuellement actifs (pour les arrêter avant d'en appliquer de nouveaux)
  let _agoneWeatherFxIds = null;

  async function _applyWeatherToScene() {
    if (!game.user.isGM) return;
    if (!game.settings.get("agone", "meteoAutoApply")) return;
    const scene = canvas.scene;
    if (!scene) return;

    const meteoId = game.settings.get("agone", "calendrierMeteo") ?? "";
    const date    = game.settings.get("agone", "calendrierDate") ?? { heure: 8, minute: 0 };
    const heure   = date.heure ?? 8;

    // ── Luminosité selon heure + météo ──────────────────────────────────
    let brightness;
    if      (heure >= 22 || heure < 5)  brightness = 0.0;
    else if (heure >= 20)               brightness = 0.15;
    else if (heure >= 18)               brightness = 0.35;
    else if (heure >= 6 && heure < 8)   brightness = 0.45;
    else                                brightness = 0.75;

    const METEO_BRIGHTNESS = {
      "ensoleille":   +0.15, "nuageux":     -0.10, "pluie":       -0.15,
      "orage":        -0.25, "brouillard":  -0.20, "neige":       -0.05,
      "grele":        -0.20, "blizzard":    -0.30, "chaleur":     +0.20,
      "nuit":         -0.05, "automne":     -0.05, "cendres":     -0.30,
      "brumechaleur": +0.05, "": 0,
    };
    brightness = Math.max(0, Math.min(1, brightness + (METEO_BRIGHTNESS[meteoId] ?? 0)));

    // ── FXMaster (si le module est actif) ────────────────────────────────
    const hasFXMaster = game.modules.get("fxmaster")?.active && typeof FXMASTER !== "undefined";

    if (hasFXMaster) {
      // Arrêter les effets précédents proprement
      if (_agoneWeatherFxIds) {
        try {
          await FXMASTER.api.effects.stop({ ..._agoneWeatherFxIds, skipFading: false });
        } catch { /* ignore si déjà disparu */ }
        _agoneWeatherFxIds = null;
      }

      // Définition des effets FXMaster par météo
      // Particules disponibles : autumnleaves, bats, birds, bubbles, clouds, crows,
      //   eagles, embers, fog, hail, rain, rats, snow, snowstorm, spiders, stars
      // Filtres disponibles    : bloom, color, fog, lightning, oldfilm, predator, underwater
      const METEO_FX = {
        "ensoleille": [
          { kind: "filter", type: "color", options: { color: { value: "#fff0cc", apply: true }, saturation: 1.05, contrast: 1.02 } },
        ],
        "nuageux": [
          { kind: "particle", type: "clouds", options: { scale: 1.0, density: 0.08, speed: 0.5, alpha: 0.45 } },
          { kind: "filter",   type: "color",  options: { color: { value: "#c8d4de", apply: true }, saturation: 0.85 } },
        ],
        "pluie": [
          { kind: "particle", type: "rain",  options: { direction: 90, density: 0.15, speed: 1.2 } },
          { kind: "filter",   type: "color", options: { color: { value: "#90aec0", apply: true }, saturation: 0.75 } },
        ],
        "orage": [
          { kind: "particle", type: "rain",      options: { direction: 95, density: 0.35, speed: 1.8 } },
          { kind: "filter",   type: "lightning", options: {} },
          { kind: "filter",   type: "color",     options: { color: { value: "#6680a0", apply: true }, saturation: 0.6 } },
        ],
        "brouillard": [
          { kind: "particle", type: "fog",   options: { scale: 1.2, density: 0.12, speed: 0.4, alpha: 0.55 } },
          { kind: "filter",   type: "color", options: { color: { value: "#a8b8c0", apply: true }, saturation: 0.65 } },
        ],
        "neige": [
          { kind: "particle", type: "snow",  options: { direction: 90, density: 0.12, speed: 0.9 } },
          { kind: "filter",   type: "color", options: { color: { value: "#d8eaff", apply: true }, saturation: 0.8 } },
        ],
        "grele": [
          { kind: "particle", type: "hail",   options: { direction: 92, density: 0.20, speed: 1.6 } },
          { kind: "particle", type: "clouds", options: { scale: 0.9, density: 0.06, speed: 0.6, alpha: 0.5 } },
          { kind: "filter",   type: "color",  options: { color: { value: "#9eb8cc", apply: true }, saturation: 0.7 } },
        ],
        "blizzard": [
          { kind: "particle", type: "snowstorm", options: { direction: 95, density: 0.30, speed: 2.0 } },
          { kind: "filter",   type: "color",     options: { color: { value: "#c0d8f0", apply: true }, saturation: 0.5 } },
        ],
        "chaleur": [
          { kind: "filter", type: "color", options: { color: { value: "#ffcc88", apply: true }, saturation: 1.1, contrast: 1.05 } },
          { kind: "filter", type: "bloom", options: { blur: 3, bloomScale: 1.3, threshold: 0.35 } },
        ],
        "nuit": [
          { kind: "particle", type: "stars", options: { scale: 0.8, density: 0.12, alpha: 0.85 } },
          { kind: "filter",   type: "color", options: { color: { value: "#1a2040", apply: true }, saturation: 0.6 } },
        ],
        "automne": [
          { kind: "particle", type: "autumnleaves", options: { direction: 88, density: 0.10, speed: 0.7 } },
          { kind: "filter",   type: "color",        options: { color: { value: "#d4a870", apply: true }, saturation: 1.1 } },
        ],
        "cendres": [
          { kind: "particle", type: "embers", options: { density: 0.15, speed: 0.6, alpha: 0.7, tint: { value: "#808080", apply: true } } },
          { kind: "filter",   type: "color",  options: { color: { value: "#887060", apply: true }, saturation: 0.4 } },
        ],
        "brumechaleur": [
          { kind: "filter", type: "predator", options: {} },
          { kind: "filter", type: "color",    options: { color: { value: "#e8c890", apply: true }, saturation: 0.9 } },
        ],
      };

      const fxEffects = METEO_FX[meteoId];
      if (fxEffects?.length) {
        try {
          _agoneWeatherFxIds = await FXMASTER.api.effects.play({ effects: fxEffects });
        } catch (e) {
          console.warn("Agone | FXMaster weather play failed:", e);
        }
      }

      // FXMaster gère les particules → on vide le weather natif, on pose la luminosité
      await scene.update({
        weather: "",
        "environment.globalLight.luminosity": brightness,
      });
      return;
    }

    // ── Fallback : weather natif Foundry V14 ─────────────────────────────
    const WEATHER_EFFECTS = {
      "": "", "ensoleille": "", "nuageux": "",
      "pluie": "rain", "orage": "rainstorm",
      "brouillard": "fog", "neige": "snow",
      "grele": "rain", "blizzard": "snow",
      "chaleur": "", "nuit": "",
      "automne": "", "cendres": "",
      "brumechaleur": "",
    };
    await scene.update({
      weather: WEATHER_EFFECTS[meteoId] ?? "",
      "environment.globalLight.luminosity": brightness,
    });
  }

  // Re-rendu du widget à chaque changement de setting calendrier, météo ou thème
  Hooks.on("updateSetting", (setting) => {
    const key = setting.key ?? "";
    if (key === "agone.calendrierDate" || key === "agone.calendrierMeteo" || key === "agone.saisonMonde") {
      game.agone.calendrierWidget?.render(true);
    }
    if (key === "agone.calendrierDate" || key === "agone.calendrierMeteo") {
      _applyWeatherToScene();
    }
    if (key === "agone.agoneTheme") {
      _applyAgoneTheme(game.settings.get("agone", "agoneTheme"));
    }
  });

  if (!game.user.isGM) return;

  // ── Utilitaires de synchronisation de compendium ───────────────────────
  // Calcule un hash SHA-256 tronqué (16 hex) des données passées
  async function _dataHash(data) {
    const str = JSON.stringify(data);
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
  }

  // Reseede un compendium si vide ou si les données ont changé
  async function _syncPack(packId, newHash, seedFn) {
    const pack = game.packs.get(packId);
    if (!pack) return;
    const hashes = game.settings.get("agone", "compendiumHashes") ?? {};
    const index  = await pack.getIndex();
    const isEmpty     = index.size === 0;
    const hashChanged = hashes[packId] !== newHash;
    if (!isEmpty && !hashChanged) return;
    console.log(`Agone | Reseed ${packId} (isEmpty=${isEmpty}, hashChanged=${hashChanged})`);
    await pack.configure({ locked: false });
    if (!isEmpty) {
      await Item.deleteDocuments(index.map(e => e._id), { pack: packId });
      if (pack.folders.size > 0)
        await Folder.deleteDocuments([...pack.folders].map(f => f.id), { pack: packId });
    }
    await seedFn(pack);
    await pack.configure({ locked: true });
    await game.settings.set("agone", "compendiumHashes", { ...game.settings.get("agone", "compendiumHashes"), [packId]: newHash });
  }

  // ── Compendium compétences ─────────────────────────────────────────────
  await _syncPack("agone.competences", await _dataHash(CONFIG.AGONE.competences), async () => {
    const itemsComp = CONFIG.AGONE.competences.map(c => ({
      name: c.name, type: "competence",
      system: { domaine: c.domaine, attributLie: c.attributLie ?? "agilite", score: 0, exp: 0, specialite: "", description: "" },
    }));
    await Item.createDocuments(itemsComp, { pack: "agone.competences" });
    console.log(`Agone | Compendium compétences initialisé (${itemsComp.length} entrées)`);
  });

  // ── Compendium peuples ─────────────────────────────────────────────────
  await _syncPack("agone.peuples", await _dataHash(PEUPLES_DATA), async () => {
    const itemsPeuples = PEUPLES_DATA.map(p => ({
      name: p.name, type: "peuple", system: { ...p },
    }));
    await Item.createDocuments(itemsPeuples, { pack: "agone.peuples" });
    console.log(`Agone | Compendium peuples initialisé (${itemsPeuples.length} entrées)`);
  });

  // ── Compendium armes ───────────────────────────────────────────────────
  const _armesAll = [...ARMES_DATA, ...BOUCLIERS_DATA];
  await _syncPack("agone.armes", await _dataHash(_armesAll), async (pack) => {
    const [fMelee, fTrait, fJet, fBoucliers] = await Folder.createDocuments([
      { name: "Mêlée",     type: "Item", color: "#8B0000" },
      { name: "Trait",     type: "Item", color: "#8B4500" },
      { name: "Lancer",    type: "Item", color: "#4B5320" },
      { name: "Boucliers", type: "Item", color: "#696969" },
    ], { pack: "agone.armes" });
    const styleFolder = { melee: fMelee.id, trait: fTrait.id, jet: fJet.id, bouclier: fBoucliers.id };
    const itemsArmes  = _armesAll.map(d => ({
      name: d.name, type: "arme", system: d, folder: styleFolder[d.style] ?? null
    }));
    await Item.createDocuments(itemsArmes, { pack: "agone.armes" });
    console.log(`Agone | Compendium armes initialisé (${itemsArmes.length} entrées, 4 dossiers)`);
  });

  // ── Compendium armures ─────────────────────────────────────────────────
  await _syncPack("agone.armures", await _dataHash(ARMURES_DATA), async () => {
    const [folderArmures] = await Folder.createDocuments([
      { name: "Armures", type: "Item", color: "#8B4513" },
    ], { pack: "agone.armures" });
    await Item.createDocuments(
      ARMURES_DATA.map(d => ({ name: d.name, type: "armure", system: d, folder: folderArmures.id })),
      { pack: "agone.armures" }
    );
    console.log(`Agone | Compendium armures initialisé (${ARMURES_DATA.length} entrées)`);
  });

  // ── Compendium sorts & œuvres ──────────────────────────────────────────
  await _syncPack("agone.sorts", await _dataHash(SORTS_DATA), async () => {
    const [fJorniste, fObsc, fEcl, fAccord, fCyse, fDecorum, fGeste] = await Folder.createDocuments([
      { name: "Jorniste",      type: "Item", color: "#FFD700" },
      { name: "Obscurantiste", type: "Item", color: "#4B0082" },
      { name: "Éclipsiste",    type: "Item", color: "#1E90FF" },
      { name: "Accord",        type: "Item", color: "#228B22" },
      { name: "Cyse",          type: "Item", color: "#8B4513" },
      { name: "Décorum",       type: "Item", color: "#2E8B57" },
      { name: "Geste",         type: "Item", color: "#A0522D" },
    ], { pack: "agone.sorts" });
    const [fHarpe, fFlute, fViole, fTambour, fCistre] = await Folder.createDocuments([
      { name: "Harpe",   type: "Item", color: "#32CD32", folder: fAccord.id },
      { name: "Flûte",   type: "Item", color: "#90EE90", folder: fAccord.id },
      { name: "Viole",   type: "Item", color: "#006400", folder: fAccord.id },
      { name: "Tambour", type: "Item", color: "#3CB371", folder: fAccord.id },
      { name: "Cistre",  type: "Item", color: "#66CDAA", folder: fAccord.id },
    ], { pack: "agone.sorts" });
    const [fPrintemps, fEte, fAutomne, fHiver] = await Folder.createDocuments([
      { name: "Printemps", type: "Item", color: "#ADFF2F", folder: fDecorum.id },
      { name: "Été",       type: "Item", color: "#FFA500", folder: fDecorum.id },
      { name: "Automne",   type: "Item", color: "#D2691E", folder: fDecorum.id },
      { name: "Hiver",     type: "Item", color: "#B0C4DE", folder: fDecorum.id },
    ], { pack: "agone.sorts" });
    const folderMap = {
      jorniste:      { "": fJorniste.id },
      obscurantiste: { "": fObsc.id },
      eclipsiste:    { "": fEcl.id },
      accord:        { harpe: fHarpe.id, flute: fFlute.id, viole: fViole.id, tambour: fTambour.id, cistre: fCistre.id },
      cyse:          { "": fCyse.id },
      decorum:       { printemps: fPrintemps.id, ete: fEte.id, automne: fAutomne.id, hiver: fHiver.id },
      geste:         { "": fGeste.id },
    };
    const itemsSorts = SORTS_DATA.map(d => {
      const typeMap = folderMap[d.typeMagie] ?? {};
      return {
        name: d.name, type: "sort",
        system: { typeMagie: d.typeMagie ?? "", seuil: d.seuil ?? 0, portee: d.portee ?? "", duree: d.duree ?? "", danse: d.danse ?? "", instrument: d.instrument ?? "", special: d.special ?? "", description: d.description ?? "" },
        folder: typeMap[d.instrument] ?? typeMap[""] ?? null,
      };
    });
    await Item.createDocuments(itemsSorts, { pack: "agone.sorts" });
    console.log(`Agone | Compendium sorts initialisé (${itemsSorts.length} entrées, dossiers par type)`);
  });
});

/* ============================================================================
 * HOOKS UTILITAIRES
 * ========================================================================= */

// Couleur de fond des messages de jet en chat
Hooks.on("renderChatMessageHTML", (message, html) => {
  if (message.flags?.agone?.rollType) {
    html.classList.add("agone-roll");
  }
});

// Boutons Agone dans la barre d'outils
Hooks.on("getSceneControlButtons", (controls) => {
  controls["agone"] = {
    name: "agone",
    title: "Agone",
    icon: "fas fa-dice-d10",
    order: 999,
    activeTool: "select",
    tools: {
      select: {
        name: "select",
        title: "Agone",
        icon: "fas fa-dice-d10",
        order: 0,
      },
      calendrier: {
        name: "calendrier",
        title: game.i18n.localize("AGONE.CalendrierHarmonde"),
        icon: "fas fa-calendar-alt",
        order: 1,
        button: true,
        onChange: () => new CalendrierAgone().render(true),
      },
      combatTracker: {
        name: "combatTracker",
        title: game.i18n.localize("AGONE.Combat.TitreTracker"),
        icon: "fas fa-swords",
        order: 2,
        button: true,
        visible: game.user?.isGM ?? false,
        onChange: () => new AgoreCombatTracker().render(true),
      },
      darkMode: {
        name: "darkMode",
        title: game.i18n.localize("AGONE.ModeSombre"),
        icon: "fas fa-moon",
        order: 3,
        toggle: true,
        active: game.settings.get("agone", "agoneTheme") === "dark",
        onChange: (_event, active) => {
          const newTheme = active ? "dark" : "light";
          _applyAgoneTheme(newTheme);
          game.settings.set("agone", "agoneTheme", newTheme);
        },
      },
    },
  };
});

// Hotbar drag-drop
Hooks.on("hotbarDrop", (_bar, data, _slot) => {
  if (data.type === "Item" && data.uuid) {
    return false; // laisser FVTT gérer
  }
});
// ── Tokens : défauts pour les nouveaux acteurs ──────────────────────────────
Hooks.on("preCreateActor", (actor, _data, _options) => {
  actor.updateSource({
    "prototypeToken.bar1.attribute": "system.pdv",
    "prototypeToken.displayBars": CONST.TOKEN_DISPLAY_MODES?.OWNER ?? 40,
    "prototypeToken.actorLink": true,
  });
});

// ── Tokens existants : migration bar PdV au premier chargement (GM) ─────────
Hooks.once("ready", () => {
  if (!game.user?.isGM) return;
  const toUpdate = [];
  for (const actor of game.actors ?? []) {
    const bar = actor.prototypeToken?.bar1?.attribute;
    if (!bar || bar === "pdv" || bar === "") {
      toUpdate.push(actor.update({
        "prototypeToken.bar1.attribute": "system.pdv",
        "prototypeToken.displayBars":   CONST.TOKEN_DISPLAY_MODES?.OWNER ?? 40,
        "prototypeToken.actorLink":      true,
      }));
    }
  }
  if (toUpdate.length) Promise.all(toUpdate).then(() => console.log("Agone | bar PdV configurée sur", toUpdate.length, "acteur(s)"));
});

// ── Scènes : grille en mètres (1 m / case) par défaut ───────────────────────
Hooks.on("preCreateScene", (scene, data) => {
  if (!data.grid?.units) {
    scene.updateSource({
      "grid.distance": 1,
      "grid.units":    "m",
    });
  }
});

// ── Tooltip santé (hover token non-possédé) ──────────────────────────────────
{
  // Token canvas actuellement survolé (référence pour mises à jour et nettoyage)
  let _agoneSanteToken = null;

  function _buildTipLabel(token) {
    const pdv = token.actor?.system?.pdv;
    if (!pdv?.max) return null;
    const pct = pdv.valeur / pdv.max;
    const get = (k) => game.settings.get("agone", k);
    return pct >= 1.0  ? get("santeLabel100") :
           pct >= 0.75 ? get("santeLabel75")  :
           pct >= 0.5  ? get("santeLabel50")  :
           pct >= 0.25 ? get("santeLabel25")  :
           pct >  0    ? get("santeLabel10")  :
                         get("santeLabel0");
  }

  function _removeTip() {
    document.getElementById("agone-sante-tip")?.remove();
    if (_agoneSanteToken?._agoneTipMove) {
      document.removeEventListener("mousemove", _agoneSanteToken._agoneTipMove);
      delete _agoneSanteToken._agoneTipMove;
    }
    _agoneSanteToken = null;
  }

  Hooks.on("hoverToken", (token, hovered) => {
    _removeTip();
    if (!hovered || !token.actor) return;
    // Les propriétaires voient la barre HP directement ; le GM voit quand même le tooltip
    if (!game.user?.isGM && token.isOwner) return;
    const label = _buildTipLabel(token);
    if (!label) return;

    _agoneSanteToken = token;
    const tip = document.createElement("div");
    tip.id = "agone-sante-tip";
    tip.className = "agone-sante-tip";
    tip.innerHTML = `<strong>${token.name}</strong> <em>${label}</em>`;
    document.body.appendChild(tip);

    const move = (e) => {
      const el = document.getElementById("agone-sante-tip");
      if (el) {
        el.style.left = `${e.clientX + 16}px`;
        el.style.top  = `${e.clientY - 10}px`;
      }
    };
    document.addEventListener("mousemove", move);
    token._agoneTipMove = move;
  });

  // Supprime le tooltip immédiatement si le token survolé est supprimé
  Hooks.on("deleteToken", (tokenDoc) => {
    if (_agoneSanteToken && _agoneSanteToken.document?.id === tokenDoc.id) {
      _removeTip();
    }
  });

  // Met à jour le texte du tooltip si les PdV changent pendant le survol
  Hooks.on("updateActor", (actor) => {
    if (!_agoneSanteToken) return;
    const tip = document.getElementById("agone-sante-tip");
    if (!tip) return;
    if (_agoneSanteToken.actor?.id !== actor.id) return;
    const label = _buildTipLabel(_agoneSanteToken);
    if (label) tip.innerHTML = `<strong>${_agoneSanteToken.name}</strong> <em>${label}</em>`;
  });
}

