/**
 * Mécanique des migrations du monde (module/migration.mjs) : filtrage par version, ordre,
 * arrêt à la première erreur sans avancer la version enregistrée, relance sans effet.
 *
 * MIGRATIONS n'est pas exporté : la mécanique est observée à travers les migrations déjà
 * publiées (1.8.5, 1.9.0, 1.9.1) sur un faux monde. Les migrations ajoutées ensuite tournent
 * aussi ; les vérifications ne portent donc que sur ce que font ces trois-là et sur les
 * écritures du paramètre `systemMigrationVersion`.
 */
import { fichier } from "./foundry-stubs.mjs";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Compléments des globales simulées, propres à ce fichier
foundry.utils.isNewerVersion ??= (v1, v0) => {
  const a = String(v1).split("."), b = String(v0).split(".");
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = Number(a[i] ?? 0), y = Number(b[i] ?? 0);
    if (x !== y) return x > y;
  }
  return false;
};
CONST.TOKEN_DISPLAY_MODES ??= { OWNER: 40 };

const { migrateWorld, registerMigrationSettings } = await import(fichier("module/migration.mjs"));
const { EFFET_PREFIX } = await import(fichier("module/helpers/effets.mjs"));

const RELEASEES = ["1.8.5", "1.9.0", "1.9.1"];
const VERSION_SYSTEME = "99.0.0";               // au-delà de toute migration, présente ou future
const AVANTAGE = "Charismatique";               // avantage du livre de base avec un effet mécanique

/** Collection Foundry minimale : un tableau avec `contents` et `get(id)`. */
class Collection extends Array {
  static get [Symbol.species]() { return Array; }
  get contents() { return [...this]; }
  get(id) { return this.find(d => d.id === id); }
}
const collection = (docs = []) => Collection.from(docs);

/** Journal des appels observés pendant une migration. */
let journal;
let versionEnregistree;

/** Faux item : applique réellement ses mises à jour, pour que la relance soit significative. */
function fauxItem(name, type, system = {}, { echec = false } = {}) {
  const it = {
    id: name, name, type, img: "", system: { ...system }, flags: {},
    effects: collection(),
    getFlag: (ns, cle) => it.flags[ns]?.[cle],
    async setFlag(ns, cle, valeur) { (it.flags[ns] ??= {})[cle] = valeur; return it; },
    async unsetFlag(ns, cle) { delete it.flags[ns]?.[cle]; return it; },
    async update(donnees) {
      journal.push({ quoi: "item.update", item: name, donnees });
      for (const [cle, valeur] of Object.entries(donnees)) {
        const champ = cle.match(/^system\.(\w+)$/)?.[1];
        if (champ) it.system[champ] = valeur;
      }
      return it;
    },
    async createEmbeddedDocuments(typeDoc, donnees) {
      if (echec) throw new Error("création refusée");
      journal.push({ quoi: "effets", item: name, donnees });
      it.effects.push(...donnees);
      return donnees;
    },
    async updateEmbeddedDocuments() { return []; },
    async deleteEmbeddedDocuments() { return []; },
  };
  return it;
}

/** Faux acteur avec un token prototype et des items. */
function fauxActeur(id, barre, items = []) {
  const a = {
    id, name: id, type: "personnage", system: {}, flags: {},
    prototypeToken: { bar1: { attribute: barre }, actorLink: false },
    items: collection(items), effects: collection(),
    getFlag: (ns, cle) => a.flags[ns]?.[cle],
    async setFlag(ns, cle, valeur) { (a.flags[ns] ??= {})[cle] = valeur; return a; },
    async unsetFlag(ns, cle) { delete a.flags[ns]?.[cle]; return a; },
    async update() { return a; },
    async createEmbeddedDocuments() { return []; },
    async updateEmbeddedDocuments() { return []; },
    async deleteEmbeddedDocuments() { return []; },
  };
  return a;
}

/** Installe un faux monde et remet le journal à zéro. */
function monde({ version = "", acteurs = [], items = [], scenes = [], gm = true, echecActeurs = false } = {}) {
  journal = [];
  versionEnregistree = version;
  game.user = { isGM: gm };
  game.system = { version: VERSION_SYSTEME };
  game.actors = collection(acteurs);
  game.items = collection(items);
  game.scenes = collection(scenes);
  game.settings = {
    register() {},
    get: (ns, cle) => (ns === "agone" && cle === "systemMigrationVersion" ? versionEnregistree : undefined),
    async set(ns, cle, valeur) {
      if (ns === "agone" && cle === "systemMigrationVersion") {
        journal.push({ quoi: "version", valeur });
        versionEnregistree = valeur;
      }
      return valeur;
    },
  };
  globalThis.ui = {
    notifications: {
      info: (message, options) => journal.push({ quoi: "info", message, options }),
      warn: (message, options) => journal.push({ quoi: "warn", message, options }),
      error: (message, options) => journal.push({ quoi: "erreur", message, options }),
    },
  };
  globalThis.Actor = {
    async updateDocuments(maj) {
      if (echecActeurs) throw new Error("mise à jour refusée");
      journal.push({ quoi: "acteurs", maj });
      for (const u of maj) {
        const a = game.actors.get(u._id);
        if (a && "prototypeToken.bar1.attribute" in u) a.prototypeToken.bar1.attribute = u["prototypeToken.bar1.attribute"];
      }
      return maj;
    },
  };
  globalThis.Item = { async updateDocuments(maj) { return maj; } };
}

/** Un monde qui a besoin des trois migrations publiées. */
function mondeAncien(options = {}) {
  const don = fauxItem(AVANTAGE, "don", { description: "Ligne 1\nLigne 2" }, { echec: options.echecEffets });
  const arme = fauxItem("Épée", "arme", { description: "<p>déjà riche</p>", notes: "Note brute" });
  return {
    don, arme,
    args: {
      acteurs: [fauxActeur("a1", null, [don]), fauxActeur("a2", "attributes.hp")],
      items: [arme],
      ...options,
    },
  };
}

const versions = () => journal.filter(e => e.quoi === "version").map(e => e.valeur);
const majBarre = () => journal.filter(e => e.quoi === "acteurs")
  .flatMap(e => e.maj).filter(u => "prototypeToken.bar1.attribute" in u);
const effetsCrees = () => journal.filter(e => e.quoi === "effets");
const CHAMPS_TEXTE = ["system.description", "system.notes", "system.connivances"];
const textesConvertis = () => journal.filter(e => e.quoi === "item.update"
  && Object.keys(e.donnees).some(k => CHAMPS_TEXTE.includes(k)));
const erreurs = () => journal.filter(e => e.quoi === "erreur");
const infos = () => journal.filter(e => e.quoi === "info");
const croissant = liste => liste.every((v, i) => i === 0 || foundry.utils.isNewerVersion(v, liste[i - 1]));

/** Coupe les traces console des migrations pendant un appel. */
async function migrer() {
  const { log, error } = console;
  console.log = console.error = () => {};
  try { await migrateWorld(); } finally { Object.assign(console, { log, error }); }
}

describe("registerMigrationSettings", () => {
  test("enregistre un paramètre de monde, caché, vide par défaut", () => {
    const appels = [];
    game.settings = { register: (...args) => appels.push(args) };
    registerMigrationSettings();
    assert.equal(appels.length, 1);
    const [ns, cle, config] = appels[0];
    assert.deepEqual([ns, cle], ["agone", "systemMigrationVersion"]);
    assert.equal(config.scope, "world");
    assert.equal(config.config, false);
    assert.equal(config.default, "");
  });
});

describe("migrateWorld : filtrage par version", () => {
  beforeEach(() => monde());

  test("un joueur non MJ ne migre rien et n'écrit pas la version", async () => {
    monde({ ...mondeAncien().args, gm: false });
    await migrer();
    assert.deepEqual(journal, []);
    assert.equal(versionEnregistree, "");
  });

  test("monde sans version : toutes les migrations passent, dans l'ordre croissant", async () => {
    monde();   // monde vide : aucune migration n'a de document à traiter
    await migrer();
    const ecrites = versions();
    assert.deepEqual(ecrites.slice(0, RELEASEES.length), RELEASEES, "les migrations publiées d'abord, dans l'ordre");
    assert.ok(croissant(ecrites), `versions écrites en ordre strictement croissant : ${ecrites}`);
    assert.deepEqual(erreurs(), []);
    assert.equal(versionEnregistree, VERSION_SYSTEME, "la version du système est enregistrée à la fin");
    assert.equal(infos().length, 1, "une notification de fin");
    assert.match(infos()[0].message, /AGONE\.Migration\.Terminee/);
    assert.match(infos()[0].message, new RegExp(VERSION_SYSTEME.replaceAll(".", "\\.")));
  });

  test("monde sans version : les trois migrations publiées modifient les documents", async () => {
    const { don, arme, args } = mondeAncien();
    monde(args);
    await migrer();
    // 1.8.5 : seul l'acteur sans barre est mis à jour
    assert.deepEqual(majBarre().map(u => u._id), ["a1"]);
    assert.equal(game.actors.get("a1").prototypeToken.bar1.attribute, "pdv", "chemin relatif à actor.system");
    assert.equal(game.actors.get("a2").prototypeToken.bar1.attribute, "attributes.hp");
    // 1.9.0 : l'avantage reçoit son effet
    assert.equal(don.effects.length, 1);
    assert.ok(don.effects[0].changes.every(c => c.key.startsWith(EFFET_PREFIX)));
    // 1.9.1 : texte brut converti, HTML laissé tel quel
    assert.equal(don.system.description, "<p>Ligne 1<br>Ligne 2</p>");
    assert.equal(arme.system.description, "<p>déjà riche</p>");
    assert.equal(arme.system.notes, "<p>Note brute</p>");
    // L'ordre des effets suit l'ordre des versions
    const ordre = journal.filter(e => ["acteurs", "effets", "item.update"].includes(e.quoi)).map(e => e.quoi);
    assert.deepEqual([...new Set(ordre)].slice(0, 3), ["acteurs", "effets", "item.update"]);
  });

  test("version enregistrée 1.9.0 : 1.8.5 et 1.9.0 sont sautées, 1.9.1 passe", async () => {
    const { don, args } = mondeAncien();
    monde({ ...args, version: "1.9.0" });
    await migrer();
    assert.deepEqual(majBarre(), [], "1.8.5 non rejouée");
    assert.deepEqual(effetsCrees(), [], "1.9.0 non rejouée");
    assert.equal(don.system.description, "<p>Ligne 1<br>Ligne 2</p>", "1.9.1 appliquée");
    assert.equal(versions()[0], "1.9.1");
    assert.ok(!versions().includes("1.8.5") && !versions().includes("1.9.0"));
  });

  test("version enregistrée 1.8.5 : seule 1.8.5 est sautée", async () => {
    const { don, args } = mondeAncien();
    monde({ ...args, version: "1.8.5" });
    await migrer();
    assert.deepEqual(majBarre(), []);
    assert.equal(don.effects.length, 1);
    assert.deepEqual(versions().slice(0, 2), ["1.9.0", "1.9.1"]);
  });

  test("version enregistrée égale à celle du système : rien ne tourne, rien n'est écrit", async () => {
    monde({ ...mondeAncien().args, version: VERSION_SYSTEME });
    await migrer();
    assert.deepEqual(journal, []);
  });

  test("aucune migration en attente mais version plus ancienne : version alignée sans notification", async () => {
    monde({ ...mondeAncien().args, version: "98.0.0" });
    await migrer();
    assert.deepEqual(journal, [{ quoi: "version", valeur: VERSION_SYSTEME }]);
  });
});

describe("migrateWorld : échec d'une migration", () => {
  test("échec de la première : version inchangée, suite non exécutée, erreur permanente", async () => {
    const { don, arme, args } = mondeAncien({ echecActeurs: true });
    monde(args);
    await migrer();
    assert.equal(versionEnregistree, "", "version enregistrée inchangée");
    assert.deepEqual(versions(), []);
    assert.equal(don.effects.length, 0, "1.9.0 non exécutée");
    assert.equal(arme.system.notes, "Note brute", "1.9.1 non exécutée");
    assert.equal(erreurs().length, 1);
    assert.match(erreurs()[0].message, /AGONE\.Migration\.Echec.*1\.8\.5/);
    assert.equal(erreurs()[0].options?.permanent, true);
    assert.deepEqual(infos(), [], "pas de notification de fin");
  });

  test("échec en cours de route : la version reste sur la dernière migration réussie", async () => {
    const { arme, args } = mondeAncien({ echecEffets: true });
    monde(args);
    await migrer();
    assert.deepEqual(versions(), ["1.8.5"]);
    assert.equal(versionEnregistree, "1.8.5");
    assert.equal(arme.system.notes, "Note brute", "1.9.1 non exécutée");
    assert.match(erreurs()[0].message, /1\.9\.0/);
    assert.deepEqual(infos(), []);
  });

  test("après correction, la relance reprend à la migration qui avait échoué", async () => {
    const { don, arme, args } = mondeAncien({ echecEffets: true });
    monde(args);
    await migrer();
    assert.equal(versionEnregistree, "1.8.5");

    // Même monde, l'erreur est levée : on garde les documents et la version enregistrée
    const repare = fauxItem(AVANTAGE, "don", don.system);
    const a1 = game.actors.get("a1");
    a1.items = collection([repare]);
    monde({ acteurs: [a1, game.actors.get("a2")], items: [arme], version: "1.8.5" });
    await migrer();
    assert.deepEqual(majBarre(), [], "1.8.5 non rejouée");
    assert.equal(repare.effects.length, 1, "1.9.0 rejouée");
    assert.equal(arme.system.notes, "<p>Note brute</p>", "1.9.1 exécutée");
    assert.deepEqual(versions().slice(0, 2), ["1.9.0", "1.9.1"]);
  });
});

describe("migrateWorld : relance", () => {
  test("seconde exécution à la suite : plus rien à faire", async () => {
    const { args } = mondeAncien();
    monde(args);
    await migrer();
    const acteurs = [...game.actors], items = [...game.items], version = versionEnregistree;
    monde({ acteurs, items, version });
    await migrer();
    if (version === VERSION_SYSTEME) assert.deepEqual(journal, []);
    assert.deepEqual([majBarre(), effetsCrees(), textesConvertis()], [[], [], []]);
  });

  test("migrations publiées rejouées depuis une version vide : aucune nouvelle modification", async () => {
    const { don, arme, args } = mondeAncien();
    monde(args);
    await migrer();
    const etat = () => JSON.stringify({
      barres: game.actors.map(a => a.prototypeToken.bar1.attribute),
      effets: don.effects, don: don.system, arme: arme.system,
    });
    const avant = etat();

    monde({ acteurs: [...game.actors], items: [...game.items], version: "" });
    await migrer();
    assert.deepEqual(majBarre(), [], "1.8.5 ne retouche pas une barre déjà réglée");
    assert.deepEqual(effetsCrees(), [], "1.9.0 ne duplique pas les effets");
    assert.deepEqual(textesConvertis(), [], "1.9.1 ne reconvertit pas du HTML");
    assert.equal(etat(), avant);
    assert.deepEqual(versions().slice(0, RELEASEES.length), RELEASEES);
  });
});

describe("migrateWorld : items parcourus", () => {
  test("items du monde, des acteurs et des tokens non liés ; pas ceux des tokens liés", async () => {
    const duMonde = fauxItem("Monde", "arme", { description: "brut" });
    const dActeur = fauxItem("Acteur", "arme", { description: "brut" });
    const nonLie = fauxItem("Non lié", "arme", { description: "brut" });
    const lie = fauxItem("Lié", "arme", { description: "brut" });
    monde({
      version: "1.9.0",
      items: [duMonde],
      acteurs: [fauxActeur("a1", "system.pdv", [dActeur])],
      scenes: [{ tokens: collection([
        { actorLink: false, actor: { items: collection([nonLie]) } },
        { actorLink: true, actor: { items: collection([lie]) } },
        { actorLink: false, actor: null },
      ]) }],
    });
    await migrer();
    for (const it of [duMonde, dActeur, nonLie]) assert.equal(it.system.description, "<p>brut</p>", it.name);
    assert.equal(lie.system.description, "brut");
  });
});
