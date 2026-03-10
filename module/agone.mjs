/**
 * Agone – système pour FoundryVTT v13
 * Point d'entrée principal du module.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────
import { AGONE }                from "./helpers/config.mjs";
import { ARMES_DATA, ARMURES_DATA, BOUCLIERS_DATA, SORTS_DATA } from "./helpers/compendium-data.mjs";
import { registerHandlebarsHelpers as registerHandlebars } from "./helpers/handlebars.mjs";

// ── DataModels ────────────────────────────────────────────────────────────────
import {
  PersonnageData, CompagnonData, DemonData, PnjData
} from "./data/actor-data.mjs";
import {
  CompetenceData, ArmeData, ArmureData, DonData,
  SortData, EquipementData, PouvoirData, ManoeuvreData, PeupleData,
  DanseurData, DemonItemData
} from "./data/item-data.mjs";

// ── Documents ─────────────────────────────────────────────────────────────────
import { AgoneActor }       from "./documents/actor.mjs";
import { AgoneItem }        from "./documents/item.mjs";

// ── Sheets ────────────────────────────────────────────────────────────────────
import { PersonnageSheet }   from "./sheets/personnage-sheet.mjs";

// ── Apps ─────────────────────────────────────────────────────────────────────
import { SortsBrowser }     from "./apps/sorts-browser.mjs";
import { AvantagesBrowser } from "./apps/avantages-browser.mjs";
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
    peuple      : PeupleData,
    danseur     : DanseurData,
    demon       : DemonItemData,
  };

  // ── Feuilles ────────────────────────────────────────────────────────────
  const _Actors   = foundry.documents.collections.Actors;
  const _Items    = foundry.documents.collections.Items;
  const _ActorSheet = foundry.appv1.sheets.ActorSheet;
  const _ItemSheet  = foundry.appv1.sheets.ItemSheet;

  _Actors.unregisterSheet("core", _ActorSheet);
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

  _Items.unregisterSheet("core", _ItemSheet);
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
    "systems/agone/templates/apps/manoeuvres-browser.hbs",
    "systems/agone/templates/apps/peuples-browser.hbs",
    "systems/agone/templates/apps/pouvoirs-browser.hbs",
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
 * READY HOOK
 * ========================================================================= */
Hooks.once("ready", async () => {
  console.log("Agone | Système prêt");

  if (!game.user.isGM) return;

  // ── Compendium compétences ─────────────────────────────────────────────
  const packComp = game.packs.get("agone.competences");
  if (packComp && (await packComp.getIndex()).size === 0) {
    const domainAttr = {
      "Épreuve":     "agilite",
      "Maraude":     "agilite",
      "Société":     "charisma",
      "Savoir":      "intelligence",
      "Occulte":     "volonte",
    };
    const itemsComp = CONFIG.AGONE.competences.map(name => {
      const match   = name.match(/\(([^)]+)\)$/);
      const domaine = match ? match[1] : "";
      return { name, type: "competence", system: { domaine, attributLie: domainAttr[domaine] ?? "agilite", score: 0, exp: 0, specialite: "", description: "" } };
    });
    await packComp.configure({ locked: false });
    await Item.createDocuments(itemsComp, { pack: "agone.competences" });
    await packComp.configure({ locked: true });
    console.log(`Agone | Compendium compétences initialisé (${itemsComp.length} entrées)`);
  }

  // ── Compendium peuples ─────────────────────────────────────────────────
  const packPeuples = game.packs.get("agone.peuples");
  if (packPeuples && (await packPeuples.getIndex()).size === 0) {
    const peupleLabels = {
      humain: "Humain", nain: "Nain", geant: "Géant", farfadet: "Farfadet",
      lutin: "Lutin", satyre: "Satyre", minotaure: "Minotaure", ogre: "Ogre",
      drakonien: "Drakonien", morgane: "Morgane", pixie: "Pixie",
      feeNoire: "Fée Noire", meduse: "Méduse",
    };
    const itemsPeuples = Object.entries(CONFIG.AGONE.peuplesData).map(([key, data]) => ({
      name: peupleLabels[key] ?? key,
      type: "peuple",
      system: { ...data, description: "" },
    }));
    await packPeuples.configure({ locked: false });
    await Item.createDocuments(itemsPeuples, { pack: "agone.peuples" });
    await packPeuples.configure({ locked: true });
    console.log(`Agone | Compendium peuples initialisé (${itemsPeuples.length} entrées)`);
  }

  // ── Compendium armes ───────────────────────────────────────────────────
  const packArmes = game.packs.get("agone.armes");
  if (packArmes) {
    const indexArmes = await packArmes.getIndex();
    const armesHasFolders = packArmes.folders.size > 0;
    if (indexArmes.size !== ARMES_DATA.length || !armesHasFolders) {
      await packArmes.configure({ locked: false });
      // Nettoyer les entrées et dossiers existants
      if (indexArmes.size > 0)
        await Item.deleteDocuments(indexArmes.map(e => e._id), { pack: "agone.armes" });
      if (packArmes.folders.size > 0)
        await Folder.deleteDocuments([...packArmes.folders].map(f => f.id), { pack: "agone.armes" });
      // Créer les dossiers par style
      const [fMelee, fTrait, fJet] = await Folder.createDocuments([
        { name: "Mêlée",  type: "Item", color: "#8B0000" },
        { name: "Trait",  type: "Item", color: "#8B4500" },
        { name: "Lancer", type: "Item", color: "#4B5320" },
      ], { pack: "agone.armes" });
      const styleFolder = { melee: fMelee.id, trait: fTrait.id, jet: fJet.id };
      const itemsArmes = ARMES_DATA.map(d => ({
        name: d.name, type: "arme", system: d, folder: styleFolder[d.style] ?? null
      }));
      await Item.createDocuments(itemsArmes, { pack: "agone.armes" });
      await packArmes.configure({ locked: true });
      console.log(`Agone | Compendium armes initialisé (${itemsArmes.length} entrées, 3 dossiers)`);
    }
  }

  // ── Compendium armures / boucliers ─────────────────────────────────────
  const packArmures = game.packs.get("agone.armures");
  if (packArmures) {
    const itemsArmures   = ARMURES_DATA.map(d => ({ name: d.name, type: "armure", system: d }));
    const itemsBoucliers = BOUCLIERS_DATA.map(d => ({ name: d.name, type: "armure", system: d }));
    const allArmures = [...itemsArmures, ...itemsBoucliers];
    const indexArmures = await packArmures.getIndex();
    const armuresHasFolders = packArmures.folders.size > 0;
    if (indexArmures.size !== allArmures.length || !armuresHasFolders) {
      await packArmures.configure({ locked: false });
      // Nettoyer les entrées et dossiers existants
      if (indexArmures.size > 0)
        await Item.deleteDocuments(indexArmures.map(e => e._id), { pack: "agone.armures" });
      if (packArmures.folders.size > 0)
        await Folder.deleteDocuments([...packArmures.folders].map(f => f.id), { pack: "agone.armures" });
      // Créer les dossiers
      const [folderArmures, folderBoucliers] = await Folder.createDocuments([
        { name: "Armures",   type: "Item", color: "#8B4513" },
        { name: "Boucliers", type: "Item", color: "#696969" },
      ], { pack: "agone.armures" });
      // Créer les items
      await Item.createDocuments(
        itemsArmures.map(i => ({ ...i, folder: folderArmures.id })),
        { pack: "agone.armures" }
      );
      await Item.createDocuments(
        itemsBoucliers.map(i => ({ ...i, folder: folderBoucliers.id })),
        { pack: "agone.armures" }
      );
      await packArmures.configure({ locked: true });
      console.log(`Agone | Compendium armures initialisé (${allArmures.length} entrées, 2 dossiers)`);
    }
  }

  // ── Compendium sorts & œuvres ──────────────────────────────────────────
  const packSorts = game.packs.get("agone.sorts");
  if (packSorts) {
    const itemsSorts = SORTS_DATA.map(d => ({
      name: d.name,
      type: "sort",
      system: {
        typeMagie:   d.typeMagie   ?? "",
        seuil:       d.seuil       ?? 0,
        portee:      d.portee      ?? "",
        duree:       d.duree       ?? "",
        danse:       d.danse       ?? "",
        instrument:  d.instrument  ?? "",
        special:     d.special     ?? "",
        description: d.description ?? "",
      }
    }));
    const indexSorts = await packSorts.getIndex();
    const sortsHasFolders = packSorts.folders.size > 0;
    const firstSort = indexSorts.size > 0 ? await packSorts.getDocument(indexSorts.contents[0]._id) : null;
    const needsReseedSorts = indexSorts.size !== itemsSorts.length || !sortsHasFolders || !firstSort?.system?.description;
    if (needsReseedSorts) {
      await packSorts.configure({ locked: false });
      // Nettoyer les entrées et dossiers existants
      if (indexSorts.size > 0)
        await Item.deleteDocuments(indexSorts.map(e => e._id), { pack: "agone.sorts" });
      if (packSorts.folders.size > 0)
        await Folder.deleteDocuments([...packSorts.folders].map(f => f.id), { pack: "agone.sorts" });
      // Créer les dossiers top-level par type de magie
      const [fJorniste, fObsc, fEcl, fAccord, fCyse, fDecorum, fGeste] = await Folder.createDocuments([
        { name: "Jorniste",      type: "Item", color: "#FFD700" },
        { name: "Obscurantiste", type: "Item", color: "#4B0082" },
        { name: "Éclipsiste",    type: "Item", color: "#1E90FF" },
        { name: "Accord",        type: "Item", color: "#228B22" },
        { name: "Cyse",          type: "Item", color: "#8B4513" },
        { name: "Décorum",       type: "Item", color: "#2E8B57" },
        { name: "Geste",         type: "Item", color: "#A0522D" },
      ], { pack: "agone.sorts" });
      // Sous-dossiers Accord (par instrument)
      const [fHarpe, fFlute, fViole, fTambour, fCistre] = await Folder.createDocuments([
        { name: "Harpe",   type: "Item", color: "#32CD32", folder: fAccord.id },
        { name: "Flûte",   type: "Item", color: "#90EE90", folder: fAccord.id },
        { name: "Viole",   type: "Item", color: "#006400", folder: fAccord.id },
        { name: "Tambour", type: "Item", color: "#3CB371", folder: fAccord.id },
        { name: "Cistre",  type: "Item", color: "#66CDAA", folder: fAccord.id },
      ], { pack: "agone.sorts" });
      // Sous-dossiers Décorum (par saison)
      const [fPrintemps, fEte, fAutomne, fHiver] = await Folder.createDocuments([
        { name: "Printemps", type: "Item", color: "#ADFF2F", folder: fDecorum.id },
        { name: "Été",       type: "Item", color: "#FFA500", folder: fDecorum.id },
        { name: "Automne",   type: "Item", color: "#D2691E", folder: fDecorum.id },
        { name: "Hiver",     type: "Item", color: "#B0C4DE", folder: fDecorum.id },
      ], { pack: "agone.sorts" });
      // Table de correspondance type+instrument → dossier
      const folderMap = {
        jorniste:      { "": fJorniste.id },
        obscurantiste: { "": fObsc.id },
        eclipsiste:    { "": fEcl.id },
        accord:        { harpe: fHarpe.id, flute: fFlute.id, viole: fViole.id, tambour: fTambour.id, cistre: fCistre.id },
        cyse:          { "": fCyse.id },
        decorum:       { printemps: fPrintemps.id, ete: fEte.id, automne: fAutomne.id, hiver: fHiver.id },
        geste:         { "": fGeste.id },
      };
      const mappedSorts = itemsSorts.map((item, idx) => {
        const d = SORTS_DATA[idx];
        const typeMap = folderMap[d.typeMagie] ?? {};
        return { ...item, folder: typeMap[d.instrument] ?? typeMap[""] ?? null };
      });
      await Item.createDocuments(mappedSorts, { pack: "agone.sorts" });
      await packSorts.configure({ locked: true });
      console.log(`Agone | Compendium sorts initialisé (${itemsSorts.length} entrées, dossiers par type)`);
    }
  }
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

// Hotbar drag-drop
Hooks.on("hotbarDrop", (_bar, data, _slot) => {
  if (data.type === "Item" && data.uuid) {
    return false; // laisser FVTT gérer
  }
});
