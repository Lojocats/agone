import { changeEffet, effetsDepuisTable } from "../helpers/effets.mjs";

/**
 * Tests d'intégration exécutés dans Foundry avec le module Quench
 * (https://github.com/Ethaks/FVTT-Quench) : onglet « Quench » de la barre latérale.
 * Chaque batch crée ses documents dans un dossier dédié et les supprime ensuite.
 */
export function registerQuenchTests(quench) {
  quench.registerBatch("agone.fiches", fichesBatch, { displayName: "Agone : acteurs, fiches et jets" });
  quench.registerBatch("agone.effets", effetsBatch, { displayName: "Agone : effets actifs des items" });
}

const TYPES_ACTEUR = ["personnage", "compagnon", "demon", "pnj"];

/** Crée les acteurs de test dans un dossier temporaire ; `nettoyer()` supprime tout. */
function bac() {
  const docs = [];
  let folder = null;
  return {
    async acteur(type, data = {}) {
      folder ??= await Folder.create({ name: "Agone — tests Quench", type: "Actor" });
      const actor = await Actor.create({ name: `Test ${type}`, type, folder: folder.id, ...data });
      docs.push(actor);
      return actor;
    },
    async nettoyer() {
      const ids = new Set(docs.map(d => d.id));
      const messages = game.messages.filter(m => ids.has(m.speaker?.actor));
      if (messages.length) await ChatMessage.deleteDocuments(messages.map(m => m.id));
      for (const doc of docs) await doc.delete();
      await folder?.delete();
    },
  };
}

function fichesBatch({ describe, it, assert, before, after }) {
  const tests = bac();
  after(() => tests.nettoyer());

  for (const type of TYPES_ACTEUR) {
    describe(`Acteur ${type}`, () => {
      let actor;
      before(async () => { actor = await tests.acteur(type); });

      it("s'affiche et se ferme", async () => {
        await actor.sheet.render({ force: true });
        assert.ok(actor.sheet.rendered, "la fiche est rendue");
        assert.ok(actor.sheet.element.querySelector(".tab[data-tab]"), "la fiche a des onglets");
        await actor.sheet.close();
      });

      it("lance un jet de caractéristique (Agilité)", async () => {
        const roll = await actor.rollAttribut("agilite", { fastForward: true });
        assert.ok(roll, "un jet est renvoyé");
        assert.isNumber(roll.total);
      });

      it("lance un jet d'initiative", async () => {
        const roll = await actor.rollInitiative(null, { fastForward: true });
        assert.isNumber(roll.total);
      });
    });
  }

  describe("Jet de compétence", () => {
    it("inclut le score de la compétence", async () => {
      const actor = await tests.acteur("personnage");
      const [comp] = await actor.createEmbeddedDocuments("Item", [
        { name: "Esquive", type: "competence", system: { attributLie: "agilite", score: 5 } },
      ]);
      const roll = await actor.rollCompetence(comp.id, { fastForward: true });
      assert.isAtLeast(roll.total, 5 + 1, "au moins le score + 1 au dé");
    });
  });

  describe("Fiches d'item", () => {
    it("chaque type d'item a une fiche qui s'affiche", async () => {
      const actor = await tests.acteur("personnage");
      const types = Object.keys(CONFIG.Item.dataModels);
      const items = await actor.createEmbeddedDocuments("Item", types.map(type => ({ name: `Test ${type}`, type })));
      for (const item of items) {
        await item.sheet.render({ force: true });
        assert.ok(item.sheet.rendered, `fiche ${item.type} rendue`);
        await item.sheet.close();
      }
    });
  });
}

function effetsBatch({ describe, it, assert, after }) {
  const tests = bac();
  after(() => tests.nettoyer());

  describe("Personnage", () => {
    it("un avantage augmente sa caractéristique, et plus quand l'effet est désactivé", async () => {
      const actor = await tests.acteur("personnage");
      const base  = actor.system.agilite.score;
      const [don] = await actor.createEmbeddedDocuments("Item", [
        { name: "Adresse", type: "don", effects: effetsDepuisTable("Adresse") },
      ]);
      assert.equal(actor.system.agilite.score, base + 1, "Adresse : AGI +1");

      await don.effects.contents[0].update({ disabled: true });
      assert.equal(actor.system.agilite.score, base, "effet désactivé : AGI de base");
    });

    it("un bonus d'arme s'ajoute à la Mêlée", async () => {
      const actor = await tests.acteur("personnage");
      const base  = actor.system.melee;
      await actor.createEmbeddedDocuments("Item", [{
        name: "Épée bénie", type: "arme",
        effects: [{ name: "Bénédiction", transfer: true, changes: [changeEffet("melee_bonus", 2)] }],
      }]);
      assert.equal(actor.system.melee, base + 2);
    });

    it("les Charges sont calculées même sans effet mécanique", async () => {
      const actor = await tests.acteur("personnage");
      await actor.createEmbeddedDocuments("Item", [
        { name: "Allié", type: "don", system: { categorie: "avantage", typeCharge: "charge", cout: 2 } },
      ]);
      assert.equal(actor.system.chargesDepensees, 2);
      assert.isNumber(actor.system.chargesSolde);
    });
  });

  describe("PNJ", () => {
    it("un effet modifie la caractéristique jouée, pas la valeur saisie", async () => {
      const actor = await tests.acteur("pnj", { system: { force: 3 } });
      await actor.createEmbeddedDocuments("Item", [{
        name: "Gantelets", type: "equipement",
        effects: [{ name: "Force", transfer: true, changes: [changeEffet("force", 2)] }],
      }]);
      assert.equal(actor.system.force, 5, "valeur préparée : 3 + 2");
      assert.equal(actor._source.system.force, 3, "valeur stockée inchangée");
    });
  });
}
