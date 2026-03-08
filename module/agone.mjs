/**
 * Agone – système pour FoundryVTT v13
 * Point d'entrée principal du module.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────
import { AGONE }                from "./helpers/config.mjs";
import { registerHandlebarsHelpers as registerHandlebars } from "./helpers/handlebars.mjs";

// ── DataModels ────────────────────────────────────────────────────────────────
import {
  PersonnageData, CompagnonData, DemonData, PnjData
} from "./data/actor-data.mjs";
import {
  CompetenceData, ArmeData, ArmureData, DonData,
  SortData, EquipementData, PouvoirData, ManoeuvreData
} from "./data/item-data.mjs";

// ── Documents ─────────────────────────────────────────────────────────────────
import { AgoneActor }       from "./documents/actor.mjs";
import { AgoneItem }        from "./documents/item.mjs";

// ── Sheets ────────────────────────────────────────────────────────────────────
import { PersonnageSheet }   from "./sheets/personnage-sheet.mjs";
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
  game.agone = { AgoneActor, AgoneItem };
  CONFIG.AGONE = AGONE;

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
  };

  // ── Feuilles ────────────────────────────────────────────────────────────
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("agone", PersonnageSheet, {
    types: ["personnage"], makeDefault: true,
    label: "AGONE.FeuillePersonnage"
  });
  Actors.registerSheet("agone", CompagnonSheet, {
    types: ["compagnon"], makeDefault: true,
    label: "AGONE.FeuilleCompagnon"
  });
  Actors.registerSheet("agone", DemonSheet, {
    types: ["demon"], makeDefault: true,
    label: "AGONE.FeuilleDemon"
  });
  Actors.registerSheet("agone", PnjSheet, {
    types: ["pnj"], makeDefault: true,
    label: "AGONE.FeuillePnj"
  });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("agone", AgoneItemSheet, {
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
    // Chat
    "systems/agone/templates/chat/roll-result.hbs",
  ];
  loadTemplates(templates);

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
 * READY HOOK
 * ========================================================================= */
Hooks.once("ready", () => {
  console.log("Agone | Système prêt");
});

/* ============================================================================
 * HOOKS UTILITAIRES
 * ========================================================================= */

// Couleur de fond des messages de jet en chat
Hooks.on("renderChatMessage", (message, html) => {
  if (message.flags?.agone?.rollType) {
    html[0].classList.add("agone-roll");
  }
});

// Hotbar drag-drop
Hooks.on("hotbarDrop", (_bar, data, _slot) => {
  if (data.type === "Item" && data.uuid) {
    return false; // laisser FVTT gérer
  }
});
