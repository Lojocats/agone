import { bac, DELAI, PERSO, PNJ, horsDes } from "./outils.mjs";

const FF = { fastForward: true };

/**
 * Jets de dés : chaque jet est lancé sans dialogue et sa formule est vérifiée
 * (total − dés = valeur attendue), avec son message de chat.
 */
export function jetsBatch({ describe, it, assert, before, after }) {
  const tests = bac();
  after(async function () { this.timeout(DELAI); await tests.nettoyer(); });

  describe("Personnage", function () {
    this.timeout(DELAI);
    let actor, s, saisonin;
    before(async () => {
      actor = await tests.acteur("personnage", PERSO);
      s = actor.system;
      saisonin = actor._getBonusSaisonin();
    });

    const ASPECT = { agilite: "bonusCorps", force: "bonusCorps", perception: "bonusCorps", resistance: "bonusCorps",
                     intelligence: "bonusEsprit", volonte: "bonusEsprit", charisma: "bonusAme", creativite: "bonusAme" };
    for (const [carac, aspect] of Object.entries(ASPECT)) {
      it(`caractéristique ${carac} = score × 2 + bonus d'aspect`, async () => {
        const roll = await actor.rollAttribut(carac, FF);
        assert.equal(horsDes(roll), s[carac].score * 2 + s[aspect] + saisonin);
      });
    }

    it("chaque jet crée un message de chat de l'acteur", async () => {
      const avant = game.messages.filter(m => m.speaker?.actor === actor.id).length;
      await actor.rollAttribut("force", FF);
      const apres = game.messages.filter(m => m.speaker?.actor === actor.id).length;
      assert.equal(apres, avant + 1);
    });

    it("compétence = score + caractéristique + bonus d'aspect", async () => {
      const [comp] = await actor.createEmbeddedDocuments("Item", [
        { name: "Escalade", type: "competence", system: { attributLie: "agilite", score: 5 } },
      ]);
      const roll = await actor.rollCompetence(comp.id, FF);
      assert.equal(horsDes(roll), 5 + 4 + 2 + saisonin);
    });

    it("compétence à 0 : malus de −3", async () => {
      const [comp] = await actor.createEmbeddedDocuments("Item", [
        { name: "Nage", type: "competence", system: { attributLie: "force", score: 0 } },
      ]);
      const roll = await actor.rollCompetence(comp.id, FF);
      assert.equal(horsDes(roll), 0 + 3 + 2 - 3 + saisonin);
    });

    it("compétence non apprise : caractéristique + bonus d'aspect − 3", async () => {
      const roll = await actor.rollCompetenceSansItem("Équitation", "agilite", "", FF);
      assert.equal(horsDes(roll), 4 + 2 - 3 + saisonin);
    });

    it("initiative sans arme (d10 fermé) et avec bonus d'arme", async () => {
      let roll = await actor.rollInitiative(null, FF);
      assert.equal(horsDes(roll), s.initiative + saisonin);
      assert.equal(roll.dice[0].modifiers.length, 0, "dé non explosif");
      const [arme] = await actor.createEmbeddedDocuments("Item", [{ name: "Dague", type: "arme", system: { initBonus: 2 } }]);
      roll = await actor.rollInitiative(arme.id, FF);
      assert.equal(horsDes(roll), s.initiative + 2 + saisonin);
    });

    it("initiative magique", async () => {
      const roll = await actor.rollInitiativeMagique(FF);
      assert.equal(horsDes(roll), s.initMagique + saisonin);
    });

    it("attaque = Mêlée + compétence + bonus d'arme + bonus Corps", async () => {
      const [arme] = await actor.createEmbeddedDocuments("Item", [
        { name: "Épée", type: "arme", system: { style: "melee", attackBonus: 1, defenseBonus: 2 } },
      ]);
      const roll = await actor.rollAttaque(arme.id, FF);
      assert.equal(horsDes(roll), s.melee + 0 + 1 + s.bonusCorps + saisonin);
    });

    it("attaque avec compétence liée (domaine de la compétence)", async () => {
      await actor.createEmbeddedDocuments("Item", [
        { name: "Armes blanches", type: "competence", system: { attributLie: "melee", domaine: "Épée longue", score: 3 } },
      ]);
      const [arme] = await actor.createEmbeddedDocuments("Item", [
        { name: "Épée longue", type: "arme", system: { style: "melee", competence: "Épée longue", attackBonus: 0 } },
      ]);
      const roll = await actor.rollAttaque(arme.id, FF);
      assert.equal(horsDes(roll), s.melee + 3 + s.bonusCorps + saisonin);
    });

    it("parade = Mêlée + compétence + bonus de défense + bonus Corps", async () => {
      const [arme] = await actor.createEmbeddedDocuments("Item", [
        { name: "Bouclier", type: "arme", system: { style: "melee", defenseBonus: 2 } },
      ]);
      const roll = await actor.rollParade(arme.id, FF);
      assert.equal(horsDes(roll), s.melee + 0 + 2 + s.bonusCorps + saisonin);
    });

    it("esquive et défense naturelle", async () => {
      assert.equal(horsDes(await actor.rollEsquive(FF)), s.esquiveTotal + saisonin);
      assert.equal(horsDes(await actor.rollDefenseNaturelle(FF)), s.defenseNaturelle + saisonin);
    });

    it("sort = Art + Arts Magiques du domaine + bonus Âme", async () => {
      // L'ordre des documents renvoyés n'est pas garanti : on retrouve le sort par son type.
      const crees = await actor.createEmbeddedDocuments("Item", [
        { name: "Arts Magiques", type: "competence", system: { domaine: "Geste", score: 4, attributLie: "creativite" } },
        { name: "Sort de test", type: "sort", system: { typeMagie: "geste", seuil: 10 } },
      ]);
      const sort = crees.find(i => i.type === "sort");
      assert.ok(actor.items.get(sort?.id), "sort présent dans l'inventaire");
      const roll = await actor.rollSort(sort.id, FF);
      assert.ok(roll, "jet de sort lancé");
      assert.equal(horsDes(roll), actor.system.art + 4 + actor.system.bonusAme + saisonin);
    });

    it("sort sans Arts Magiques du domaine : refusé", async () => {
      const [sort] = await actor.createEmbeddedDocuments("Item", [{ name: "Sort Cyse", type: "sort", system: { typeMagie: "cyse", seuil: 5 } }]);
      assert.equal(await actor.rollSort(sort.id, FF), null);
    });

    it("sort improvisé : affiche description et badges (portée, durée, danse)", async () => {
      // Régression : le sort lancé en improvisé depuis le navigateur doit avoir description, portee, duree, danse
      await actor.createEmbeddedDocuments("Item", [
        { name: "Arts Magiques", type: "competence", system: { domaine: "Geste", score: 2, attributLie: "creativite" } },
      ]);
      const roll = await actor.rollSort({
        name: "Sort brut",
        typeMagie: "geste",
        seuil: 10,
        description: "<p>Desc brute</p>",
        portee: "10 m",
        duree: "1 tour",
        danse: "2 tours"
      }, { impro: true, fastForward: true });
      assert.ok(roll, "jet de sort improvisé lancé");

      // Récupérer le dernier message de chat de l'acteur
      const msg = game.messages.filter(m => m.speaker?.actor === actor.id).at(-1);
      assert.ok(msg, "message de chat créé");
      assert.include(msg.content, "Desc brute", "description affichée");
      assert.include(msg.content, "10 m", "portée affichée");
      assert.include(msg.content, "1 tour", "durée affichée");
      assert.include(msg.content, "2 tours", "danse affichée");
    });

    it("aptitude magique et conjuration", async () => {
      assert.equal(horsDes(await actor.rollAptitudeMagie(FF)), actor.system.aptitudeArtsMagiques);
      assert.equal(horsDes(await actor.rollAptitudeConjuration(FF)), actor.system.aptitudeConjuration);
      assert.equal(horsDes(await actor.rollConjurationDemonologie(FF)), actor.system.noirceur + 0);
    });

    it("Art par domaine : potentiel transmis", async () => {
      const roll = await actor.rollArtDomaine({ domaine: "Geste", apt: 7, art: 3, scoreArts: 4, scoreEff: 4, bonusAme: 3 }, FF);
      assert.equal(horsDes(roll), 7);
    });

    it("Emprise brute = Emprise + Résonance", async () => {
      assert.equal(horsDes(await actor.rollEmpriseAttr(FF)), actor.system.emprise);
    });

    it("3e blessure grave : VOL × 2 + bonus Âme", async () => {
      const roll = await actor.rollVolBlessure3();
      assert.equal(horsDes(roll), s.volonte.score * 2 + s.bonusAme);
    });

    it("jet fermé : dé sans explosion", async () => {
      const roll = await actor._sendRollToChat(await new Roll("1d10x10 + 2").evaluate(), "Test", {}, { rollType: "ferme" });
      assert.notInclude(roll.formula, "x", "formule sans explosion");
      assert.equal(horsDes(roll), 2);
    });

    it("carte de jet : classe d'issue succès et badge d'écart au seuil", async () => {
      const seuilNumeric = 1; // seuil très bas : succès garanti (1d10 fermé + 2 ≥ 3)
      const roll = await actor._sendRollToChat(await new Roll("1d10x10 + 2").evaluate(), "Test seuil", {
        seuil:    { label: game.i18n.localize("AGONE.Des.Seuil"), value: seuilNumeric },
        resultat: game.i18n.localize("AGONE.Des.Succes")
      }, { rollType: "ferme", seuilNumeric });
      const msg = game.messages.filter(m => m.speaker?.actor === actor.id).at(-1);
      assert.include(msg.content, "roll-issue-succes", "classe d'issue succès sur la carte");
      const ecartAttendu = `+${roll.total - seuilNumeric}`;
      assert.include(msg.content, "roll-ecart-positif", "badge d'écart teinté positif");
      assert.include(msg.content, `>${ecartAttendu}<`, "badge d'écart = total − seuil");
    });

    it("carte de jet : classe d'issue échec et badge d'écart négatif", async () => {
      const seuilNumeric = 999; // seuil très haut : échec garanti
      const roll = await actor._sendRollToChat(await new Roll("1d10x10 + 2").evaluate(), "Test seuil", {
        seuil:    { label: game.i18n.localize("AGONE.Des.Seuil"), value: seuilNumeric },
        resultat: game.i18n.localize("AGONE.Des.Echec")
      }, { rollType: "ferme", seuilNumeric });
      const msg = game.messages.filter(m => m.speaker?.actor === actor.id).at(-1);
      assert.include(msg.content, "roll-issue-echec", "classe d'issue échec sur la carte");
      const ecartAttendu = `−${seuilNumeric - roll.total}`;
      assert.include(msg.content, "roll-ecart-negatif", "badge d'écart teinté négatif");
      assert.include(msg.content, `>${ecartAttendu}<`, "badge d'écart = total − seuil");
    });
  });

  describe("Personnage — danseurs (Emprise)", function () {
    this.timeout(DELAI);
    let actor, danseur;
    before(async () => {
      actor = await tests.acteur("personnage", PERSO);
      [danseur] = await actor.createEmbeddedDocuments("Item", [
        { name: "Danseur de test", type: "danseur", system: { modeCreation: false, enduranceActuelle: 2 } },
      ]);
    });
    const aptitude = () => actor.system.emprise + 0 + actor.system.bonusEsprit;

    it("potentiel d'Emprise = Emprise + Conn. Danseurs + bonus Esprit + bonus du danseur", async () => {
      const roll = await actor.rollEmprise(danseur.id, FF);
      assert.equal(horsDes(roll), aptitude() + (danseur.system.bonusEmprise ?? 0));
    });

    it("improvisation = CRÉ + Empathie du danseur + bonus Esprit", async () => {
      const roll = await actor.rollImprovisationDanseur(danseur.id, FF);
      assert.equal(horsDes(roll), 5 + (danseur.system.empathie ?? 0) + actor.system.bonusEsprit);
    });

    it("sort via danseur : consomme 1 point d'endurance", async () => {
      const roll = await actor.rollSortDanseur(danseur.id, { name: "Sort d'Emprise", seuil: 5 }, FF);
      assert.equal(horsDes(roll), aptitude() + (danseur.system.bonusEmprise ?? 0));
      assert.equal(actor.items.get(danseur.id).system.enduranceActuelle, 1);
    });

    it("danseur sans endurance : pas de jet", async () => {
      await danseur.update({ "system.enduranceActuelle": 0 });
      assert.isUndefined(await actor.rollSortDanseur(danseur.id, { name: "Sort", seuil: 5 }, FF));
    });
  });

  describe("PNJ, compagnon, démon", function () {
    this.timeout(DELAI);
    it("PNJ : caractéristique × 2 + bonus d'aspect", async () => {
      const actor = await tests.acteur("pnj", PNJ);
      const saisonin = actor._getBonusSaisonin();
      assert.equal(horsDes(await actor.rollAttribut("volonte", FF)), 2 * 2 + 1 + saisonin);
      assert.equal(horsDes(await actor.rollAttribut("creativite", FF)), 5 * 2 + 3 + saisonin);
    });

    it("PNJ : l'armure portée pénalise l'Agilité", async () => {
      const actor = await tests.acteur("pnj", { ...PNJ, armure: { protection: 3, malusAgi: 2 } });
      const saisonin = actor._getBonusSaisonin();
      assert.equal(horsDes(await actor.rollAttribut("agilite", FF)), 4 * 2 + 2 - 2 + saisonin);
    });

    it("PNJ : compétence avec caractéristique numérique", async () => {
      const actor = await tests.acteur("pnj", PNJ);
      const [comp] = await actor.createEmbeddedDocuments("Item", [
        { name: "Vigilance", type: "competence", system: { attributLie: "perception", score: 4 } },
      ]);
      const roll = await actor.rollCompetence(comp.id, FF);
      assert.equal(horsDes(roll), 4 + 2 + 2 + actor._getBonusSaisonin());
    });

    it("compagnon et démon : caractéristique × 2, sans aspect", async () => {
      for (const [type, system] of [["compagnon", { force: 4 }], ["demon", { force: 4 }]]) {
        const actor = await tests.acteur(type, system);
        assert.equal(horsDes(await actor.rollAttribut("force", FF)), 8 + actor._getBonusSaisonin(), type);
      }
    });

    it("attaque d'un PNJ avec une arme", async () => {
      const actor = await tests.acteur("pnj", PNJ);
      const [arme] = await actor.createEmbeddedDocuments("Item", [{ name: "Hache", type: "arme", system: { attackBonus: 1 } }]);
      const roll = await actor.rollAttaque(arme.id, FF);
      assert.equal(horsDes(roll), actor.system.melee + 1 + actor.system.bonusCorps + actor._getBonusSaisonin());
    });
  });
}
