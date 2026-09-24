import { attendre, bac, DELAI, PERSO, PNJ, evenement } from "./outils.mjs";

const TYPES_ACTEUR = { personnage: PERSO, compagnon: {}, demon: {}, pnj: PNJ };

/** Rend une application et attend qu'elle soit affichée. */
async function ouvrir(app) {
  await app.render({ force: true });
  await attendre(() => app.rendered, "fiche rendue");
  return app;
}

/**
 * Interfaces : fiches d'acteur (onglets, caractéristiques jouables), fiches d'item,
 * éditeur d'effets manipulé comme un joueur, montée de niveau du démon.
 */
export function fichesBatch({ describe, it, assert, before, after }) {
  const tests = bac();
  after(async function () { this.timeout(DELAI); await tests.nettoyer(); });

  for (const [type, system] of Object.entries(TYPES_ACTEUR)) {
    describe(`Fiche ${type}`, function () {
      this.timeout(DELAI);
      let actor, sheet;
      before(async () => {
        actor = await tests.acteur(type, system);
        sheet = await ouvrir(actor.sheet);
      });
      after(async () => { await sheet?.close({ animate: false }); });

      it("chaque onglet s'active au clic", () => {
        const liens = [...sheet.element.querySelectorAll(".sheet-tabs .item[data-tab]")];
        assert.isAbove(liens.length, 1, "plusieurs onglets");
        for (const lien of liens) {
          lien.click();
          const tab = sheet.element.querySelector(`.tab[data-tab="${lien.dataset.tab}"]`);
          assert.ok(tab?.classList.contains("active"), `onglet ${lien.dataset.tab}`);
          assert.ok(lien.classList.contains("active"));
        }
      });

      it("l'onglet actif est conservé après un nouveau rendu", async () => {
        const liens = [...sheet.element.querySelectorAll(".sheet-tabs .item[data-tab]")];
        const dernier = liens.at(-1);
        dernier.click();
        await sheet.render();
        assert.ok(sheet.element.querySelector(`.tab[data-tab="${dernier.dataset.tab}"]`).classList.contains("active"));
      });

      if (type !== "personnage") {
        it("chaque caractéristique a un bouton de jet", () => {
          const boutons = sheet.element.querySelectorAll("[data-action='rollAttribut'][data-carac]");
          assert.isAbove(boutons.length, 0);
          for (const b of boutons) assert.ok(CONFIG.AGONE.attributs[b.dataset.carac], b.dataset.carac);
        });

        it("la saisie d'une caractéristique enregistre la valeur", async () => {
          const input = sheet.element.querySelector(".npc-caracs input[name='system.force']");
          input.value = "4";
          input.dispatchEvent(new Event("change", { bubbles: true }));
          await attendre(() => actor._source.system.force === 4, "force enregistrée");
        });
      }
    });
  }

  describe("Fiche personnage : sauvegarde automatique", function () {
    this.timeout(DELAI);
    it("un champ nommé est enregistré au changement", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      const sheet = await ouvrir(actor.sheet);
      const input = sheet.element.querySelector("input[name='system.pdv.valeur']");
      assert.ok(input, "champ PdV");
      input.value = "7";
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await attendre(() => actor.system.pdv.valeur === 7, "PdV enregistrés");
      await sheet.close({ animate: false });
    });
  });

  describe("Fiches d'item", function () {
    this.timeout(DELAI);
    const items = {};
    before(async function () {
      this.timeout(DELAI);
      const actor = await tests.acteur("personnage", PERSO);
      const crees = await actor.createEmbeddedDocuments("Item",
        Object.keys(CONFIG.Item.dataModels).map(type => ({ name: `Test ${type}`, type })));
      for (const item of crees) items[item.type] = item;
    });

    for (const type of Object.keys(CONFIG.Item.dataModels)) {
      it(`fiche ${type} : s'affiche avec son éditeur de description`, async () => {
        const sheet = await ouvrir(items[type].sheet);
        assert.ok(sheet.element.querySelector("form"), "formulaire");
        await sheet.close({ animate: false });
      });
    }

    it("la description riche est enregistrée depuis l'éditeur", async () => {
      const item = items.equipement;
      const sheet = await ouvrir(item.sheet);
      const editeur = sheet.element.querySelector("prose-mirror[name='system.description']");
      assert.ok(editeur, "éditeur ProseMirror");
      await item.update({ "system.description": "<p><strong>Gras</strong></p>" });
      assert.include(item.system.description, "<strong>");
      await sheet.close({ animate: false });
    });
  });

  describe("Éditeur d'effets (fiche d'item)", function () {
    this.timeout(DELAI);
    let item, sheet;
    const el = sel => sheet.element.querySelector(sel);
    const changer = (sel, valeur) => {
      const input = el(sel);
      if (input.type === "checkbox") input.checked = valeur; else input.value = valeur;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };
    before(async () => {
      item = await tests.item({ name: "Épée de test", type: "arme" });
      sheet = await ouvrir(item.sheet);
    });
    after(async () => { await sheet?.close({ animate: false }); });

    it("créer un effet", async () => {
      el("[data-action='effetCreer']").click();
      await attendre(() => item.effects.size === 1, "effet créé");
      await attendre(() => el("[data-effect-id]"), "effet affiché");
    });

    it("choisir la statistique et la valeur", async () => {
      changer("[data-effet-champ='stat']", "force");
      await attendre(() => item.effects.contents[0].changes[0]?.key === "flags.agone.effets.force", "statistique");
      await attendre(() => el("[data-effet-champ='value']"), "rendu");
      changer("[data-effet-champ='value']", "3");
      await attendre(() => item.effects.contents[0].changes[0]?.value === "3", "valeur");
    });

    it("ajouter puis supprimer un modificateur", async () => {
      el("[data-action='modifAjouter']").click();
      await attendre(() => item.effects.contents[0].changes.length === 2, "modificateur ajouté");
      await attendre(() => sheet.element.querySelectorAll("[data-change-index]").length === 2, "rendu");
      sheet.element.querySelectorAll("[data-action='modifSupprimer']")[1].click();
      await attendre(() => item.effects.contents[0].changes.length === 1, "modificateur supprimé");
    });

    it("renommer et désactiver l'effet", async () => {
      await attendre(() => el("[data-effet-champ='name']"), "rendu");
      changer("[data-effet-champ='name']", "Tranchant béni");
      await attendre(() => item.effects.contents[0].name === "Tranchant béni", "nom");
      await attendre(() => el("[data-effet-champ='actif']"), "rendu");
      changer("[data-effet-champ='actif']", false);
      await attendre(() => item.effects.contents[0].disabled, "désactivé");
    });

    it("l'effet suit l'item quand il est ajouté à un personnage", async () => {
      await item.effects.contents[0].update({ disabled: false });
      const actor = await tests.acteur("personnage", PERSO);
      await actor.createEmbeddedDocuments("Item", [item.toObject()]);
      assert.equal(actor.system.force.score, 3 + 3);
    });

    it("supprimer l'effet", async () => {
      await attendre(() => el("[data-action='effetSupprimer']"), "rendu");
      el("[data-action='effetSupprimer']").click();
      await attendre(() => item.effects.size === 0, "effet supprimé");
    });
  });

  describe("Démon : montée de niveau", function () {
    this.timeout(DELAI);
    let actor, sheet;
    before(async () => {
      actor = await tests.acteur("demon", { force: 2, experience: 5, modeLevelUp: true });
      sheet = actor.sheet;
      sheet._confirmChild = async () => true;   // confirmation automatique
    });

    it("+1 FOR coûte 2 XP", async () => {
      await sheet._onLevelUpCarac(evenement({ key: "force", expField: "forceExp", label: "FOR" }));
      assert.equal(actor.system.force, 3);
      assert.equal(actor.system.experience, 3);
    });

    it("−1 FOR rembourse 2 XP", async () => {
      await sheet._onLevelDownCarac(evenement({ key: "force", label: "FOR" }));
      assert.equal(actor.system.force, 2);
      assert.equal(actor.system.experience, 5);
    });

    it("XP insuffisante : versement dans la réserve de la caractéristique", async () => {
      await actor.update({ "system.experience": 1 });
      await sheet._onLevelUpCarac(evenement({ key: "force", expField: "forceExp", label: "FOR" }));
      assert.equal(actor.system.force, 2, "pas de montée");
      assert.equal(actor.system.forceExp, 1);
      assert.equal(actor.system.experience, 0);
    });

    it("compétence : +1 coûte 1 XP", async () => {
      await actor.update({ "system.experience": 2 });
      const [comp] = await actor.createEmbeddedDocuments("Item", [{ name: "Ruse", type: "competence", system: { score: 1 } }]);
      await sheet._onLevelUpComp(evenement({ itemId: comp.id }));
      assert.equal(actor.items.get(comp.id).system.score, 2);
      assert.equal(actor.system.experience, 1);
    });
  });
}
