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

      it("lecture seule (observateur) : champs et jets désactivés, consultation active", async () => {
        Object.defineProperty(sheet, "isEditable", { configurable: true, get: () => false });
        try {
          await sheet.render();
          const el = sheet.element;
          assert.ok(el.classList.contains("agone-lecture-seule"));
          const champs = [...el.querySelectorAll(".window-content input[name^='system.']")];
          assert.isAbove(champs.length, 0);
          assert.ok(champs.every(c => c.disabled), "tous les champs désactivés");
          const jets = [...el.querySelectorAll("button[data-action^='roll']:not([data-action='rollItemChat'])")];
          assert.ok(jets.every(b => b.disabled), "jets désactivés");
          for (const c of el.querySelectorAll(".comp-search-input, .smf-search")) assert.notOk(c.disabled, "recherche active");
        } finally {
          delete sheet.isEditable;
          await sheet.render();
        }
        assert.notOk(sheet.element.classList.contains("agone-lecture-seule"));
        assert.notOk(sheet.element.querySelector(".window-content input[name^='system.']").disabled);
      });

      it("vue limitée : identité et description seulement", async () => {
        Object.defineProperty(sheet, "vueLimitee", { configurable: true, get: () => true });
        try {
          await sheet.render();
          const el = sheet.element;
          assert.ok(el.querySelector(".agone-limitee-wrap"), "vue limitée");
          assert.notOk(el.querySelector(".sheet-tabs"), "pas d'onglets");
          assert.equal(el.querySelector(".limitee-nom").textContent.trim(), actor.name);
          assert.notOk(el.querySelector("input[name^='system.']"), "aucun champ");
        } finally {
          delete sheet.vueLimitee;
          await sheet.render();
        }
        assert.ok(sheet.element.querySelector(".sheet-tabs"), "fiche complète restaurée");
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

  describe("Fiche personnage : descriptions pliables", function () {
    this.timeout(DELAI);
    it("le chevron ouvre la description, qui le reste après une mise à jour, même en lecture seule", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      const [don] = await actor.createEmbeddedDocuments("Item", [
        { name: "Don décrit", type: "don", system: { categorie: "avantage", cout: 1, description: "<p>Texte du don</p>" } },
      ]);
      const sheet = await ouvrir(actor.sheet);
      try {
        const chevron = () => sheet.element.querySelector(`.desc-bascule[data-desc="${don.id}"]`);
        const desc = () => sheet.element.querySelector(`[data-desc-de="${don.id}"]`);
        assert.ok(chevron(), "chevron du don");
        assert.ok(desc().hidden, "masquée par défaut");
        chevron().click();
        assert.notOk(desc().hidden, "ouverte au clic");
        await don.update({ name: "Don renommé" });
        await attendre(() => sheet.element.textContent.includes("Don renommé"), "fiche rendue à nouveau");
        assert.notOk(desc().hidden, "toujours ouverte après la mise à jour");

        Object.defineProperty(sheet, "isEditable", { configurable: true, get: () => false });
        await sheet.render();
        assert.notOk(chevron().disabled, "chevron actif en lecture seule");
        chevron().click();
        assert.ok(desc().hidden, "refermée en lecture seule");
      } finally {
        delete sheet.isEditable;
        await sheet.close({ animate: false });
      }
    });

    it("le chevron d'une carte de sort reste cliquable malgré les actions affichées au survol", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      const [sort] = await actor.createEmbeddedDocuments("Item", [
        { name: "Sort décrit", type: "sort", system: { typeMagie: "Runes", seuil: 1, description: "<p>Texte du sort</p>" } },
      ]);
      const sheet = await ouvrir(actor.sheet);
      try {
        sheet.element.querySelector('.sheet-tabs .item[data-tab="magie"]').click();
        const carte = sheet.element.querySelector(`.sort-card[data-item-id="${sort.id}"]`);
        assert.ok(carte, "carte du sort");
        const actions = carte.querySelector(".sort-card-actions");
        actions.style.display = "flex"; // simule le survol, :hover n'étant pas simulable
        const chevron = carte.querySelector(`.desc-bascule[data-desc="${sort.id}"]`);
        const desc = carte.querySelector(`[data-desc-de="${sort.id}"]`);
        assert.ok(chevron, "chevron du sort");
        assert.ok(desc.hidden, "masquée par défaut");

        const rc = chevron.getBoundingClientRect();
        const ra = actions.getBoundingClientRect();
        const chevauche = rc.left < ra.right && rc.right > ra.left && rc.top < ra.bottom && rc.bottom > ra.top;
        assert.notOk(chevauche, "le chevron n'est pas recouvert par les actions au survol");

        const cx = rc.left + rc.width / 2;
        const cy = rc.top + rc.height / 2;
        const auPoint = document.elementFromPoint(cx, cy);
        assert.ok(chevron === auPoint || chevron.contains(auPoint), "le chevron est au premier plan, donc cliquable");

        chevron.click();
        assert.notOk(desc.hidden, "ouverte au clic");
      } finally {
        await sheet.close({ animate: false });
      }
    });

    it("bienfaits acquis (Perfidie) : chevron par bienfait et bouton « tout ouvrir »", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      await actor.createEmbeddedDocuments("Item", [
        { name: "Peine A", type: "peine", system: { bienfait: "Bienfait A", bienfaitAcquis: true, bienfaitDescription: "<p>Texte A</p>" } },
        { name: "Peine B", type: "peine", system: { bienfait: "Bienfait B", bienfaitAcquis: true, bienfaitDescription: "<p>Texte B</p>" } },
      ]);
      const sheet = await ouvrir(actor.sheet);
      try {
        const section = sheet.element.querySelector(".bienfaits-perfidie-section");
        assert.ok(section, "section des bienfaits acquis");
        const descs = () => [...section.querySelectorAll(".bienfait-perfidie-desc")];
        assert.equal(descs().length, 2);
        assert.ok(descs().every(d => d.hidden), "descriptions masquées par défaut");

        section.querySelector('.desc-bascule[data-desc="bienfait:Bienfait A"]').click();
        assert.notOk(section.querySelector('[data-desc-de="bienfait:Bienfait A"]').hidden, "ouverte au clic");
        assert.ok(section.querySelector('[data-desc-de="bienfait:Bienfait B"]').hidden, "l'autre reste fermée");

        const tout = section.querySelector(".desc-bascule-tout");
        tout.click();
        assert.ok(descs().every(d => !d.hidden), "toutes ouvertes");
        tout.click();
        assert.ok(descs().every(d => d.hidden), "toutes fermées");
      } finally {
        await sheet.close({ animate: false });
      }
    });

    it("peine de Perfidie : la ligne dépliable détaille description, effet et bienfait", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      const [peine] = await actor.createEmbeddedDocuments("Item", [
        { name: "Peine détaillée", type: "peine", system: {
          noirEffect: "ame", description: "<p>Texte de la peine</p>",
          bienfait: "Hargne", bienfaitDescription: "<p>Texte du bienfait propre</p>",
        } },
      ]);
      const sheet = await ouvrir(actor.sheet);
      try {
        sheet.element.querySelector('.sheet-tabs .item[data-tab="perfidie"]').click();
        const chevron = sheet.element.querySelector(`.desc-bascule[data-desc="${peine.id}"]`);
        const desc = sheet.element.querySelector(`[data-desc-de="${peine.id}"]`);
        assert.ok(chevron, "chevron de la peine");
        assert.ok(desc.hidden, "masquée par défaut");
        chevron.click();
        assert.notOk(desc.hidden, "ouverte au clic");

        const texte = desc.textContent;
        assert.include(texte, game.i18n.localize("AGONE.Description"));
        assert.include(texte, "Texte de la peine");
        assert.include(texte, game.i18n.localize("AGONE.Peine.EffetsPeine"));
        assert.include(texte, game.i18n.localize("AGONE.PerfidieAmeNoire1"));
        assert.include(texte, game.i18n.localize("AGONE.BienfaitLabel"));
        assert.include(texte, "Hargne");
        assert.include(texte, "Texte du bienfait propre");
      } finally {
        await sheet.close({ animate: false });
      }
    });

    it("peine de Perfidie sans description ni bienfait : chevron quand même présent, avec l'effet", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      const [peine] = await actor.createEmbeddedDocuments("Item", [
        { name: "Peine sans détails", type: "peine" },
      ]);
      const sheet = await ouvrir(actor.sheet);
      try {
        sheet.element.querySelector('.sheet-tabs .item[data-tab="perfidie"]').click();
        const chevron = sheet.element.querySelector(`.desc-bascule[data-desc="${peine.id}"]`);
        const desc = sheet.element.querySelector(`[data-desc-de="${peine.id}"]`);
        assert.ok(chevron, "chevron présent même sans description ni bienfait");
        chevron.click();
        assert.notOk(desc.hidden, "ouverte au clic");
        assert.include(desc.textContent, game.i18n.localize("AGONE.Peine.EffetsPeine"));
        assert.include(desc.textContent, game.i18n.localize("AGONE.Aucun"));
        assert.include(desc.textContent, game.i18n.localize("AGONE.PerfidieAucunBienfait"));
      } finally {
        await sheet.close({ animate: false });
      }
    });

    it("tableau des paliers de Ténèbres : un chevron par palier, description dépliable avec peine et bienfait", async () => {
      const actor = await tests.acteur("personnage", { ...PERSO, tenebres: 35 });
      const sheet = await ouvrir(actor.sheet);
      try {
        sheet.element.querySelector('.sheet-tabs .item[data-tab="tenebres"]').click();
        const table = sheet.element.querySelector(".paliers-table");
        assert.ok(table, "tableau des paliers");
        const chevrons = [...table.querySelectorAll('.desc-bascule[data-desc^="palier:"]')];
        assert.equal(chevrons.length, 21, "un chevron par palier");

        const chevron10 = table.querySelector('.desc-bascule[data-desc="palier:10"]');
        const desc10 = table.querySelector('[data-desc-de="palier:10"]');
        assert.ok(desc10.hidden, "masquée par défaut");
        chevron10.click();
        assert.notOk(desc10.hidden, "ouverte au clic");
        assert.include(desc10.textContent, game.i18n.localize("AGONE.Peine.diablotin"), "nom de la peine");
        assert.include(desc10.textContent, game.i18n.localize("AGONE.TenebresPalierTooltip10"), "texte de la peine");
        assert.include(desc10.textContent, game.i18n.localize("AGONE.Bienfait.cercle1"), "nom du bienfait");
        assert.include(desc10.textContent, game.i18n.localize("AGONE.TenebresBienfaitTooltip10"), "texte du bienfait");

        const desc40 = table.querySelector('[data-desc-de="palier:40"]');
        table.querySelector('.desc-bascule[data-desc="palier:40"]').click();
        assert.include(desc40.textContent, game.i18n.localize("AGONE.PerfidieAucunBienfait"), "palier 40 : aucun bienfait");

        const tout = table.querySelector(".desc-bascule-tout");
        tout.click();
        assert.ok([...table.querySelectorAll(".desc-pliable")].every(d => !d.hidden), "tout ouvrir");
        tout.click();
        assert.ok([...table.querySelectorAll(".desc-pliable")].every(d => d.hidden), "tout refermer");
      } finally {
        await sheet.close({ animate: false });
      }
    });

    it("tableau des paliers : mode manuel garde les boutons de coche et élargit le colspan de la description", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      await actor.setFlag("agone", "tenebresModeManuel", true);
      const sheet = await ouvrir(actor.sheet);
      try {
        sheet.element.querySelector('.sheet-tabs .item[data-tab="tenebres"]').click();
        const table = sheet.element.querySelector(".paliers-table");
        assert.ok(table.querySelector('[data-action="togglePalierManuel"][data-seuil="10"]'), "bouton togglePalierManuel toujours présent");
        const ligneDesc = table.querySelector('[data-desc-de="palier:10"]');
        assert.equal(ligneDesc.querySelectorAll("td").length, 3, "une cellule de plus pour la colonne de coche");
      } finally {
        await sheet.close({ animate: false });
      }
    });

    it("tableau des paliers : palier atteint selon le score de Ténèbres (non-régression du refactor)", async () => {
      const actor = await tests.acteur("personnage", { ...PERSO, tenebres: 35 });
      const sheet = await ouvrir(actor.sheet);
      try {
        sheet.element.querySelector('.sheet-tabs .item[data-tab="tenebres"]').click();
        const table = sheet.element.querySelector(".paliers-table");
        const ligne = seuil => table.querySelector(`.desc-bascule[data-desc="palier:${seuil}"]`).closest(".palier-row");
        assert.ok(ligne(10).classList.contains("palier-reached"), "palier 10 atteint");
        assert.ok(ligne(20).classList.contains("palier-reached"), "palier 20 atteint");
        assert.ok(ligne(30).classList.contains("palier-reached"), "palier 30 atteint");
        assert.notOk(ligne(40).classList.contains("palier-reached"), "palier 40 non atteint");
      } finally {
        await sheet.close({ animate: false });
      }
    });
  });

  describe("Fiche personnage : recherche de compétences", function () {
    this.timeout(DELAI);
    it("affiche un message quand la recherche ne trouve aucune compétence", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      await actor.createEmbeddedDocuments("Item", [
        { name: "Discrétion", type: "competence", system: { attributLie: "agilite", score: 1 } },
      ]);
      const sheet = await ouvrir(actor.sheet);
      try {
        sheet.element.querySelector('.sheet-tabs .item[data-tab="competences"]').click();
        const input = sheet.element.querySelector(".comp-search-input");
        const vide = () => sheet.element.querySelector(".comp-search-empty");
        assert.ok(input, "champ de recherche");
        assert.ok(vide().hidden, "message masqué par défaut");

        input.value = "xyzzy-inexistant";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        assert.notOk(vide().hidden, "message affiché quand rien ne correspond");

        input.value = "Discr";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        assert.ok(vide().hidden, "message masqué dès qu'une compétence correspond");

        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        assert.ok(vide().hidden, "message masqué une fois la recherche effacée");
      } finally {
        await sheet.close({ animate: false });
      }
    });
  });

  describe("Fiche personnage : activation clavier des [role=\"button\"]", function () {
    this.timeout(DELAI);
    it("Entrée sur .item-edit (lien sans href) ouvre la fiche de l'objet", async () => {
      const actor = await tests.acteur("personnage", PERSO);
      const [comp] = await actor.createEmbeddedDocuments("Item", [
        { name: "Discrétion", type: "competence", system: { attributLie: "agilite", score: 1 } },
      ]);
      const sheet = await ouvrir(actor.sheet);
      try {
        sheet.element.querySelector('.sheet-tabs .item[data-tab="competences"]').click();
        const lien = sheet.element.querySelector(`.item-edit[data-item-id="${comp.id}"]`);
        assert.ok(lien, "lien d'édition de la compétence");
        assert.equal(lien.getAttribute("role"), "button");
        lien.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
        await attendre(() => comp.sheet.rendered, "fiche de l'objet ouverte");
        assert.ok(comp.sheet.rendered, "la fiche de la compétence s'est ouverte au clavier");
      } finally {
        await comp.sheet?.close({ animate: false });
        await sheet.close({ animate: false });
      }
    });
  });

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

    it("lecture seule : champs désactivés, envoi au chat actif", async () => {
      const sheet = await ouvrir(items.arme.sheet);
      Object.defineProperty(sheet, "isEditable", { configurable: true, get: () => false });
      try {
        await sheet.render();
        const champs = [...sheet.element.querySelectorAll(".window-content input[name]")];
        assert.isAbove(champs.length, 0);
        assert.ok(champs.every(c => c.disabled), "champs désactivés");
        const chat = sheet.element.querySelector("[data-action='toChat']");
        if (chat) assert.notOk(chat.disabled, "envoi au chat actif");
      } finally {
        delete sheet.isEditable;
        await sheet.close({ animate: false });
      }
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
      // Le champ « value » existe déjà avant ce changement : attendre sa seule présence ne garantit
      // pas que le nouveau rendu (déclenché par le changement de statistique) a eu lieu. On attend
      // que le rendu suivant se soit produit (`_renderSignal` renouvelé par `_onRender`) avant
      // d'interagir avec ce champ, sans quoi l'événement « change » peut partir d'un nœud détaché.
      const renduAvant = sheet._renderSignal;
      changer("[data-effet-champ='stat']", "force");
      await attendre(() => item.effects.contents[0].changes[0]?.key === "flags.agone.effets.force", "statistique");
      await attendre(() => sheet._renderSignal !== renduAvant, "rendu");
      changer("[data-effet-champ='value']", "3");
      // v14 convertit la valeur saisie (JSON.parse) : "3" en v13, 3 en v14
      await attendre(() => String(item.effects.contents[0].changes[0]?.value) === "3", "valeur");
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
      // Même précaution que pour stat/value : attendre le rendu déclenché par le renommage avant
      // de toucher au champ « actif », déjà présent dans le DOM précédent.
      const renduAvant = sheet._renderSignal;
      changer("[data-effet-champ='name']", "Tranchant béni");
      await attendre(() => item.effects.contents[0].name === "Tranchant béni", "nom");
      await attendre(() => sheet._renderSignal !== renduAvant, "rendu");
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
