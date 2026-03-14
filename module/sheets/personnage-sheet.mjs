import { SortsBrowser } from "../apps/sorts-browser.mjs";
import { CompetencesBrowser } from "../apps/competences-browser.mjs";
import { ArmesBrowser } from "../apps/armes-browser.mjs";
import { ArmuresBrowser } from "../apps/armures-browser.mjs";
import { DonsBrowser }      from "../apps/dons-browser.mjs";
import { AvantagesBrowser } from "../apps/avantages-browser.mjs";
import { ManoeuvresBrowser } from "../apps/manoeuvres-browser.mjs";
import { PeuplesBrowser } from "../apps/peuples-browser.mjs";
import { PouvoirsBrowser } from "../apps/pouvoirs-browser.mjs";
import { PeinesBrowser }  from "../apps/peines-browser.mjs";
import { BIENFAITS_PERFIDIE_DATA, AVANTAGES_DATA } from "../helpers/compendium-data.mjs";

/**
 * Feuille de personnage Agone (Personnage Joueur)
 * Utilise l'API ActorSheet standard (compatible v12/v13)
 */
export class PersonnageSheet extends foundry.appv1.sheets.ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["agone", "sheet", "actor", "personnage"],
      template: "systems/agone/templates/actors/personnage-sheet.hbs",
      width: 870,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributs" }],
      scrollY: [".sheet-body"],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
    });
  }

  /** @override */
  async getData(options = {}) {
    const context = await super.getData(options);
    const actor    = this.actor;
    const system   = actor.system;

    context.system    = system;
    context.actor     = actor;
    context.isOwner   = actor.isOwner;
    context.isGM      = game.user.isGM;

    // Tri des items par type
    const bySort = (a, b) => (a.sort ?? 0) - (b.sort ?? 0);
    context.competences = actor.items.filter(i => i.type === "competence")
      .sort((a, b) => bySort(a, b) || a.name.localeCompare(b.name, "fr"));
    context.armes        = actor.items.filter(i => i.type === "arme").sort(bySort);
    context.armures      = actor.items.filter(i => i.type === "armure");
    context.dons         = actor.items.filter(i => i.type === "don" && i.system.categorie === "avantage").sort(bySort);
    context.avantages    = context.dons;  // alias pour avantages.hbs
    context.defauts      = actor.items.filter(i => i.type === "don" && i.system.categorie === "defaut").sort(bySort);

    // Enrichit chaque avantage/défaut avec sa catégorie thématique (Âme, Corps, etc.)
    const AV_SECT_LABELS = {
      charge: "Charges", ame: "Âme", corps: "Corps", esprit: "Esprit",
      societe: "Société", emprise: "Emprise", arts: "Arts", saisons: "Saisons", flamme: "Flamme",
    };
    const avDataByName = new Map(AVANTAGES_DATA.map(d => [d.name, d]));
    for (const don of [...context.avantages, ...context.defauts]) {
      const sd = avDataByName.get(don.name);
      don._avSection      = sd?.categorie ?? "";
      don._avSectionLabel = AV_SECT_LABELS[don._avSection] ?? "";
    }
    context.sorts        = actor.items.filter(i => i.type === "sort").sort(bySort);
    context.equipements  = actor.items.filter(i => i.type === "equipement").sort(bySort);
    context.pouvoirs     = actor.items.filter(i => i.type === "pouvoir");
    context.manoeuvres   = actor.items.filter(i => i.type === "manoeuvre").sort(bySort);
    context.demons       = actor.items.filter(i => i.type === "demon").sort((a, b) => a.name.localeCompare(b.name, "fr"));

    // Peines de Perfidie
    context.peines = actor.items.filter(i => i.type === "peine").sort(bySort);
    // Bienfaits actifs : peines avec bienfaitAcquis=true, dedupliqué par nom de bienfait
    const bienfaitsMap = new Map();
    for (const peine of context.peines) {
      if (peine.system.bienfaitAcquis && peine.system.bienfait) {
        const key = peine.system.bienfait;
        if (!bienfaitsMap.has(key)) {
          bienfaitsMap.set(key, { name: key, sources: [] });
        }
        bienfaitsMap.get(key).sources.push(peine.name);
      }
    }
    context.bienfaitsActifsPerfidie = [...bienfaitsMap.values()].map(b => {
      const staticData = BIENFAITS_PERFIDIE_DATA.find(d => d.name === b.name);
      return {
        ...b,
        sourceNames : b.sources.join(", "),
        description : staticData?.description ?? "",
      };
    });

    const danseurItems = actor.items.filter(i => i.type === "danseur")
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    context.danseurs = danseurItems.map(d => {
      const assignedSorts = actor.items
        .filter(s => s.type === "sort" && s.system.danseurNom === d.name)
        .map(s => ({ id: s.id, name: s.name, typeMagie: s.system.typeMagie, seuil: s.system.seuil, portee: s.system.portee, duree: s.system.duree, danse: s.system.danse }));
      const sd = d.system;

      // Table officielle Agône (colonnes : niv 1–7)
      const TBL = {
        memoire:   [12, 14, 16, 18, 24, 30, 40],
        emprise:   [ 0,  1,  2,  3,  4,  5,  6],
        empathie:  [ 2,  3,  4,  5,  6,  7,  8],
        endurance: [ 1,  2,  3,  4,  5,  6,  7],
      };
      const niv = (n, mn) => Math.max(0, Math.min(6, (n ?? 1) - 1));

      // Données en mode création : +/− par stat
      const creaNiveaux = [
        { stat: "memoire",   nivField: "memoireNiveau",   label: "Mémoire",        niv: sd.memoireNiveau   ?? 1, val: sd.memoireMax,   prefix: "" },
        { stat: "emprise",   nivField: "empriseNiveau",   label: "Emprise",        niv: sd.empriseNiveau   ?? 1, val: sd.bonusEmprise, prefix: "+" },
        { stat: "empathie",  nivField: "empathieNiveau",  label: "Empathie",       niv: sd.empathieNiveau  ?? 1, val: sd.empathie,     prefix: "" },
        { stat: "endurance", nivField: "enduranceNiveau", label: "Endurance",      niv: sd.enduranceNiveau ?? 1, val: sd.enduranceMax, prefix: "" },
      ].map(x => ({
        ...x,
        canDown: x.niv > 1,
        canUp:   x.niv < 7 && (sd.ptsCreationRestants ?? 0) > 0,
        nextVal: x.niv < 7 ? TBL[x.stat][x.niv] : null,
        nextNiv: x.niv < 7 ? x.niv + 1 : null,
      }));

      return {
        id: d.id, name: d.name, img: d.img,
        system: d.system,
        assignedSorts,
        assignedCount: assignedSorts.length,
        isFull: d.system.memoireMax > 0 && assignedSorts.length >= d.system.memoireMax,
        creaNiveaux,
      };
    });

    // Types de magie présents — pour le mini-filtre de l'onglet Magie
    const TYPE_LABELS_MAGIE = {
      jorniste: "Jorniste", obscurantiste: "Obscurantiste", eclipsiste: "Éclipsiste",
      accord: "Accord", cyse: "Cyse", geste: "Geste", decorum: "Décorum",
    };
    context.sortTypes = [...new Set(context.sorts.map(s => s.system.typeMagie).filter(Boolean))]
      .sort()
      .map(t => ({ value: t, label: TYPE_LABELS_MAGIE[t] ?? t }));

    // Grouper les sorts par seuil (affichage en cartes)
    const _sortsBySeuil = {};
    for (const s of context.sorts) {
      if (s.system.danseurNom) continue;
      const seuil = s.system.seuil ?? 0;
      if (!_sortsBySeuil[seuil]) _sortsBySeuil[seuil] = [];
      _sortsBySeuil[seuil].push(s);
    }
    context.sortsBySeuil = Object.entries(_sortsBySeuil)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([seuil, sorts]) => ({ seuil: Number(seuil), sorts }));

    // Grouper les sorts — adaptatif selon le flag de tri
    const _triSorts = actor.getFlag("agone", "triSorts") ?? "type";
    context.triSortsEstType = _triSorts === "type";

    if (context.triSortsEstType) {
      const TYPE_ORDER = ["jorniste", "obscurantiste", "eclipsiste", "accord", "cyse", "decorum", "geste"];
      const _byType = {};
      for (const s of context.sorts) {
        if (s.system.danseurNom) continue;
        const type = s.system.typeMagie || "Autre";
        if (!_byType[type]) _byType[type] = [];
        _byType[type].push(s);
      }
      context.sortsGroups = [
        ...TYPE_ORDER.filter(t => _byType[t]).map(t => ({
          label: TYPE_LABELS_MAGIE[t] ?? t, sorts: _byType[t],
        })),
        ...Object.keys(_byType).filter(t => !TYPE_ORDER.includes(t)).map(t => ({
          label: t, sorts: _byType[t],
        })),
      ];
    } else {
      context.sortsGroups = context.sortsBySeuil.map(g => ({ label: `Seuil ${g.seuil}`, sorts: g.sorts }));
    }

    // Enrichissement de la description HTML
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      system.description ?? "", { async: true, secrets: actor.isOwner }
    );
    context.historiqueHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      system.historique ?? "", { async: true, secrets: actor.isOwner }
    );

    // Config pour les selects
    context.peuples   = Object.entries(CONFIG.AGONE.peuples).map(([k, v]) => ({
      value: k, label: game.i18n.localize(v)
    }));
    context.saisons = Object.entries(CONFIG.AGONE.saisons ?? {}).map(([value, label]) => ({ value, label }));
    context.attributsConfig = CONFIG.AGONE.attributs;
    context.typsArme  = CONFIG.AGONE.typesArme;
    context.competencesListe = CONFIG.AGONE.competences;

    // Compétences non encore acquises par le personnage (pour jet avec malus -3)
    const _acquisNoms = new Set(actor.items.filter(i => i.type === "competence").map(i => i.name));
    context.competencesNonAcquises = (CONFIG.AGONE.competences ?? [])
      .filter(c => !_acquisNoms.has(c.name))
      .map(c => ({ ...c, displayName: c.name.replace(/\s*\([^)]*\)$/, '').trim() }));

    // Grouper les compétences acquises — adaptatif selon le flag de tri
    const _compFamilleMap = new Map((CONFIG.AGONE.competences ?? []).map(c => [c.name, c.famille ?? ""]));
    // Index supplémentaire par nom de base (sans la famille entre parenthèses) pour matcher les items raciaux
    const _compBaseMap = new Map((CONFIG.AGONE.competences ?? []).map(c => [
      c.name.replace(/\s*\([^)]*\)$/, '').trim(), c.famille ?? "",
    ]));
    const _getFamille = (name) => _compFamilleMap.get(name)
      || _compFamilleMap.get(name.replace(/\s*\([^)]*\)$/, '').trim())
      || _compBaseMap.get(name)
      || _compBaseMap.get(name.replace(/\s*\([^)]*\)$/, '').trim())
      || "Autre";
    const _triComps = actor.getFlag("agone", "triComps") ?? "famille";
    context.triCompsEstFamille = _triComps === "famille";

    if (!context.triCompsEstFamille) {
      // Par score décroissant
      const _byScore = {};
      for (const c of context.competences) {
        const s = c.system.score ?? 0;
        if (!_byScore[s]) _byScore[s] = [];
        _byScore[s].push(c);
      }
      context.competencesGroups = Object.entries(_byScore)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([score, comps]) => ({ label: `Niveau ${score}`, className: `score-${score}`, comps }));
    } else {
      // Par famille
      const ORDRE_FAMILLES = ["Épreuve", "Maraude", "Savoir", "Société", "Occulte"];
      const _byFam = {};
      for (const c of context.competences) {
        const fam = _getFamille(c.name);
        if (!_byFam[fam]) _byFam[fam] = [];
        _byFam[fam].push(c);
      }
      context.competencesGroups = [
        ...ORDRE_FAMILLES.filter(f => _byFam[f]).map(f => ({
          label: f, className: "fam-badge",
          comps: _byFam[f].sort((a, b) => (b.system.score ?? 0) - (a.system.score ?? 0)),
        })),
        ...Object.keys(_byFam).filter(f => !ORDRE_FAMILLES.includes(f)).map(f => ({
          label: f, className: "fam-badge",
          comps: _byFam[f].sort((a, b) => (b.system.score ?? 0) - (a.system.score ?? 0)),
        })),
      ];
    }
    context.competencesByDomaine = context.competencesGroups; // alias backward compat

    // Coûts XP pour la montée de niveau (multiplicateurs, après création)
    const m   = CONFIG.AGONE.xpMultipliers ?? { aspect: 7, carac: 5, competence: 5 };
    const tbl = CONFIG.AGONE.tableAchatCreation ?? [0, 1, 2, 3, 4, 5, 7, 10, 14, 19, 25];
    // Coût incrémental selon la table d'achat création : utilise le score BRUT (hors bonus racial)
    // rawScore = score stocké − bonus positif appliqué. Indice dans la table = niveau brut actuel.
    // Au-delà de la table, on extrapole en continuant le delta croissant.
    const lastDelta = tbl.length >= 2 ? tbl[tbl.length - 1] - tbl[tbl.length - 2] : 1;
    const creaDelta = (rawScore) => {
      if (rawScore + 1 < tbl.length) return tbl[rawScore + 1] - tbl[rawScore];
      return lastDelta + (rawScore - (tbl.length - 2));
    };
    const posBonus  = (k) => system.peupleBonusApplique?.[`${k}Bonus`] ?? 0;
    const rawCarac  = (k) => Math.max(0, system[k].score - posBonus(k));

    context.xpCout = {
      corps:        (system.corps.score        + 1) * m.aspect,
      esprit:       (system.esprit.score       + 1) * m.aspect,
      ame:          (system.ame.score          + 1) * m.aspect,
      agilite:      (system.agilite.score      + 1) * m.carac,
      force:        (system.force.score        + 1) * m.carac,
      perception:   (system.perception.score   + 1) * m.carac,
      resistance:   (system.resistance.score   + 1) * m.carac,
      intelligence: (system.intelligence.score + 1) * m.carac,
      volonte:      (system.volonte.score      + 1) * m.carac,
      charisma:     (system.charisma.score     + 1) * m.carac,
      creativite:   (system.creativite.score   + 1) * m.carac,
    };
    context.creaCout = {
      corps:        creaDelta(system.corps.score),
      esprit:       creaDelta(system.esprit.score),
      ame:          creaDelta(system.ame.score),
      agilite:      creaDelta(rawCarac('agilite')),
      force:        creaDelta(rawCarac('force')),
      perception:   creaDelta(rawCarac('perception')),
      resistance:   creaDelta(rawCarac('resistance')),
      intelligence: creaDelta(rawCarac('intelligence')),
      volonte:      creaDelta(rawCarac('volonte')),
      charisma:     creaDelta(rawCarac('charisma')),
      creativite:   creaDelta(rawCarac('creativite')),
    };
    for (const c of context.competences) {
      c.xpCout  = (c.system.score + 1) * m.competence;
      c.creaCout = creaDelta(c.system.score);
    }

    // Valeur affichée sur les boutons : table d'achat en création, multiplicateurs après
    const src = system.modeCreation ? context.creaCout : context.xpCout;
    context.coutAffiche = {
      corps:        src.corps,
      esprit:       src.esprit,
      ame:          src.ame,
      agilite:      src.agilite,
      force:        src.force,
      perception:   src.perception,
      resistance:   src.resistance,
      intelligence: src.intelligence,
      volonte:      src.volonte,
      charisma:     src.charisma,
      creativite:   src.creativite,
    };
    for (const c of context.competences)
      c.coutAffiche = system.modeCreation ? c.creaCout : c.xpCout;

    // ── Coûts de rétrogradation (remboursement) ──────────────
    context.creaCoutDown = {
      corps:        system.corps.score        > 0 ? creaDelta(system.corps.score        - 1) : 0,
      esprit:       system.esprit.score       > 0 ? creaDelta(system.esprit.score       - 1) : 0,
      ame:          system.ame.score          > 0 ? creaDelta(system.ame.score          - 1) : 0,
      agilite:      rawCarac('agilite')       > 0 ? creaDelta(rawCarac('agilite')       - 1) : 0,
      force:        rawCarac('force')         > 0 ? creaDelta(rawCarac('force')         - 1) : 0,
      perception:   rawCarac('perception')    > 0 ? creaDelta(rawCarac('perception')    - 1) : 0,
      resistance:   rawCarac('resistance')    > 0 ? creaDelta(rawCarac('resistance')    - 1) : 0,
      intelligence: rawCarac('intelligence')  > 0 ? creaDelta(rawCarac('intelligence')  - 1) : 0,
      volonte:      rawCarac('volonte')       > 0 ? creaDelta(rawCarac('volonte')       - 1) : 0,
      charisma:     rawCarac('charisma')      > 0 ? creaDelta(rawCarac('charisma')      - 1) : 0,
      creativite:   rawCarac('creativite')    > 0 ? creaDelta(rawCarac('creativite')    - 1) : 0,
    };
    context.xpCoutDown = {
      corps:        system.corps.score        * m.aspect,
      esprit:       system.esprit.score       * m.aspect,
      ame:          system.ame.score          * m.aspect,
      agilite:      system.agilite.score      * m.carac,
      force:        system.force.score        * m.carac,
      perception:   system.perception.score   * m.carac,
      resistance:   system.resistance.score   * m.carac,
      intelligence: system.intelligence.score * m.carac,
      volonte:      system.volonte.score      * m.carac,
      charisma:     system.charisma.score     * m.carac,
      creativite:   system.creativite.score   * m.carac,
    };
    context.coutAfficheDown = {};
    for (const k of Object.keys(context.creaCoutDown))
      context.coutAfficheDown[k] = system.modeCreation ? context.creaCoutDown[k] : context.xpCoutDown[k];
    for (const c of context.competences) {
      c.creaCoutDown    = c.system.score > 0 ? creaDelta(c.system.score - 1) : 0;
      c.xpCoutDown      = c.system.score * m.competence;
      c.coutAfficheDown = system.modeCreation ? c.creaCoutDown : c.xpCoutDown;
    }

    // Compétences Arts Magiques par domaine (Accord, Décorum, Geste, Cyse)
    // POT = Art + min(score_artsMag, score_compLiée) + bonusÂme
    // Accord → Musique | Cyse → Sculpture | Décorum → Peinture | Geste → Poésie
    const DOMAINES_ARTS = ["Accord", "Décorum", "Geste", "Cyse"];
    const ARTS_COMP_LIEE = {
      "Accord":  "Musique",
      "Cyse":    "Sculpture",
      "Décorum": "Peinture",
      "Geste":   "Poésie",
    };
    context.artsMagiquesByDomaine = DOMAINES_ARTS.map(domaine => {
      const comp = context.competences.find(c =>
        c.name === "Arts Magiques" && c.system.domaine === domaine
      );
      const score        = comp ? (comp.system.score ?? 0) : 0;
      const specialite   = comp?.system.specialite ?? "";

      // Compétence mondaine liée
      const nomCompLiee  = ARTS_COMP_LIEE[domaine] ?? "";
      const compLiee     = context.competences.find(c => c.name === nomCompLiee);
      const scoreCompLiee = compLiee ? (compLiee.system.score ?? 0) : 0;

      // Potentiel limité par la plus faible des deux compétences
      const scoreEffectif = comp ? Math.min(score, scoreCompLiee) : 0;
      const potentiel     = comp ? (system.art ?? 0) + scoreEffectif + (system.bonusAme ?? 0) : null;
      // Arts Improvisés = CRÉ + min(Arts Magiques, art profane) + bonusAme
      const impro         = comp ? (system.creativite?.score ?? 0) + scoreEffectif + (system.bonusAme ?? 0) : null;
      return {
        domaine, comp, potentiel, impro, specialite, nomCompLiee, compLiee, scoreCompLiee,
        // Composantes de formule exposées pour les tooltips de chat
        scoreArtsMag: score, scoreEffectif,
        artVal:     system.art ?? 0,
        creVal:     system.creativite?.score ?? 0,
        bonusAmeVal: system.bonusAme ?? 0,
      };
    });

    // Points de création restants (valeur décroissante)
    context.ptsCreationCaracRestant = system.ptsCreationCarac.max - system.ptsCreationCarac.depense;
    context.ptsCreationCompRestant  = system.ptsCreationComp.max  - system.ptsCreationComp.depense;
    context.modeCreation   = system.modeCreation;
    context.modeLevelUp    = !!system.modeLevelUp;

    // ── Compagnons (acteurs liés par UUID) ──────────────────────────────────
    const companionUUIDs = this.actor.getFlag("agone", "companions") ?? [];
    context.companions = [];
    for (const uuid of companionUUIDs) {
      const cActor = await fromUuid(uuid).catch(() => null);
      if (!cActor) continue;
      const cs = cActor.system;
      const type = cActor.type; // personnage | compagnon | pnj

      // PdV commun
      const pdvVal = cs.pdv?.valeur ?? 0;
      const pdvMax = cs.pdv?.max   ?? 0;
      const pdvPct = pdvMax > 0 ? Math.round(Math.min(100, (pdvVal / pdvMax) * 100)) : 0;
      const pdvColor = pdvPct >= 75 ? '#4a9a4a' : pdvPct >= 50 ? '#8a8a00' : pdvPct >= 25 ? '#c06000' : '#9a1a1a';

      // Blessures graves
      const bg1 = !!cs.blessureGrave1;
      const bg2 = !!cs.blessureGrave2;
      const bg3 = !!cs.blessureGrave3;
      const bgMalus = cs.malusBlessureGrave ?? 0;
      const bcActive = !!cs.blessuresCritique;

      // Stats spécifiques par type
      const stats = [];
      if (type === 'personnage') {
        if ((cs.flamme ?? 0) > 0 || cs.flamme === 0)
          stats.push({ icon: 'fas fa-fire',        label: 'Flamme',  val: cs.flamme ?? 0, cls: 'csp-flamme' });
        stats.push({ icon: 'fas fa-bolt',           label: 'Init.',   val: cs.initiative ?? (cs.agilite?.score ?? 0) + (cs.perception?.score ?? 0), cls: '' });
        stats.push({ icon: 'fas fa-shoe-prints',    label: 'MV',      val: cs.mv ?? 0, cls: '' });
        if ((cs.bonusCorps  ?? null) !== null) stats.push({ icon: null, label: 'C/E/Â', val: `${cs.bonusCorps}/${cs.bonusEsprit}/${cs.bonusAme}`, cls: 'csp-aspects' });
      } else if (type === 'compagnon') {
        stats.push({ icon: 'fas fa-bolt',           label: 'Init.',   val: cs.initiative ?? 0, cls: '' });
        stats.push({ icon: 'fas fa-sword',          label: 'Mêlée',  val: cs.melee ?? 0, cls: '' });
        stats.push({ icon: 'fas fa-shoe-prints',    label: 'MV',      val: cs.mv ?? 0, cls: '' });
        if ((cs.mvVol ?? 0) > 0)
          stats.push({ icon: 'fas fa-dove',         label: 'Vol',     val: cs.mvVol, cls: '' });
      } else if (type === 'pnj') {
        stats.push({ icon: 'fas fa-bolt',           label: 'Init.',   val: cs.initiative ?? 0, cls: '' });
        stats.push({ icon: 'fas fa-sword',          label: 'Mêlée',  val: cs.melee ?? 0, cls: '' });
        stats.push({ icon: 'fas fa-bullseye',       label: 'Tir',     val: cs.tir ?? 0, cls: '' });
        if ((cs.armure?.protection ?? 0) > 0)
          stats.push({ icon: 'fas fa-shield-alt',   label: 'PRO',     val: cs.armure.protection, cls: '' });
        if ((cs.flamme ?? 0) > 0)
          stats.push({ icon: 'fas fa-fire',         label: 'Flamme',  val: cs.flamme, cls: 'csp-flamme' });
      }

      // Sous-titre (espèce / race / peuple)
      const subtitle = type === 'compagnon' ? (cs.espece ?? '') :
                       type === 'pnj'       ? (cs.race   ?? '') :
                       type === 'personnage'? (cs.peuple ?? '') : '';

      context.companions.push({
        uuid, name: cActor.name, img: cActor.img ?? 'icons/svg/mystery-man.svg',
        type, subtitle,
        pdvVal, pdvMax, pdvPct, pdvColor,
        bg1, bg2, bg3, bgMalus, bcActive,
        stats,
        // rétrocompat
        pdv: cs.pdv ?? null,
        flamme: type === 'personnage' ? (cs.flamme ?? null) : null,
      });
    }

    // ── Visibilité des onglets ──────────────────────────────────────────────
    const defaultTabsVisible = {
      competences: true, combat: true, magie: true,  avantages: true,
      tenebres: true,    perfidie: true, equipement: true, identite: true,
      notes: true,       companions: true,
    };
    context.tabsVisible = foundry.utils.mergeObject(
      defaultTabsVisible,
      this.actor.getFlag("agone", "tabsVisible") ?? {}
    );
    // Visibilité des boutons de montée de niveau :
    //   - mode carac/comp : toujours visible en création, sinon si modeLevelUp toggleé
    //   - mode aspect      : seulement en XP normal avec modeLevelUp
    context.showLevelUp       = system.modeCreation || !!system.modeLevelUp;
    context.showLevelUpAspect = !system.modeCreation && !!system.modeLevelUp;
    context.showLevelUpComp   = system.modeCreation || !!system.modeLevelUp;

    // BPdV de la race (pour affichage dans la formule PdV)
    const peupleKey = CONFIG.AGONE?.peupleNomVersKey?.[system.peuple] ?? "humain";
    const peupleData = CONFIG.AGONE?.peuplesData?.[peupleKey] ?? CONFIG.AGONE?.peuplesData?.humain;
    context.bpdv = peupleData?.bpdv ?? 25;
    context.pdvPercent = system.pdv.max > 0
      ? Math.round(Math.min(100, (system.pdv.valeur / system.pdv.max) * 100))
      : 0;

    // Min/Max raciaux par carac — seuils sur score BRUT (hors bonus racial)
    const caracsKeys = ['agilite', 'force', 'perception', 'resistance', 'intelligence', 'volonte', 'charisma', 'creativite'];
    const caracAtMax      = {};
    const caracBelowMin   = {};
    const caracEffectiveMax = {}; // max final affiché = raceMax + bonusAppliqué
    for (const k of caracsKeys) {
      const bonus    = system.peupleBonusApplique?.[`${k}Bonus`] ?? 0;
      const rawScore = system[k].score - bonus;
      const raceMax  = peupleData?.[`${k}Max`] ?? null;
      caracAtMax[k]         = raceMax !== null && rawScore >= raceMax;
      caracBelowMin[k]      = system.modeCreation && (peupleData?.[`${k}Min`] ?? null) !== null && rawScore < peupleData[`${k}Min`];
      caracEffectiveMax[k]  = raceMax !== null ? raceMax + bonus : null;
    }
    context.caracAtMax        = caracAtMax;
    context.caracBelowMin     = caracBelowMin;
    context.caracEffectiveMax = caracEffectiveMax;

    return context;
  }

  /**
   * @override
   * Conserve le focus sur le champ actif après re-render (évite que l'éditeur
   * ProseMirror de l'onglet Identité ne vole le focus lors de la sauvegarde).
   */
  async _render(force, options) {
    // Mémoriser le champ focalisé AVANT le re-render
    const focused = document.activeElement;
    const isOurInput = this.element?.[0]?.contains(focused) &&
      ["INPUT", "SELECT", "TEXTAREA"].includes(focused?.tagName ?? "");
    const focusedName = isOurInput ? (focused.name || null) : null;

    await super._render(force, options);

    // Restaurer le focus si un champ nommé de la fiche l'avait
    if (focusedName) {
      requestAnimationFrame(() => {
        const el = this.form?.querySelector(`[name="${CSS.escape(focusedName)}"]`);
        if (el) el.focus();
      });
    }
  }

  /** @override */
  async _onSubmit(event, options = {}) {
    // Convertir les inputs type="number" vides en "0" avant que FormDataExtended
    // ne les lise comme NaN (valueAsNumber d'un champ vide = NaN).
    if (this.form) {
      this.form.querySelectorAll("input[type='number']").forEach(el => {
        if (el.value === "" || isNaN(Number(el.value))) el.value = "0";
      });
    }
    return super._onSubmit(event, options);
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Sections dépliables
    html.find(".section-toggle").click(this._onToggleSection.bind(this));

    if (!this.isEditable) return;

    // Items — créer / éditer / supprimer
    html.find(".item-create").click(this._onItemCreate.bind(this));
    html.find(".item-edit").click(this._onItemEdit.bind(this));
    html.find(".item-delete").click(this._onItemDelete.bind(this));
    html.find(".item-send-chat").click(this._onItemSendChat.bind(this));

    // Jets de dés — Attributs
    html.find("[data-action='rollAttribut']").click(this._onRollAttribut.bind(this));

    // Jets de dés — Compétences
    html.find("[data-action='rollCompetence']").click(this._onRollCompetence.bind(this));
    html.find("[data-action='rollCompetenceNA']").click(this._onRollCompetenceNA.bind(this));
    html.find("[data-action='apprendreCompetenceNA']").click(this._onApprendreCompetenceNA.bind(this));

    // Barre de recherche compétences
    html.find(".comp-search-input").on("input", (ev) => this._onFilterCompetences(ev, html));
    html.find(".comp-search-clear").click((ev) => {
      html.find(".comp-search-input").val("").trigger("input");
    });

    // Jets de dés — Combat
    html.find("[data-action='rollInitiative']").click(this._onRollInitiative.bind(this));
    html.find("[data-action='rollInitiativeMagique']").click(this._onRollInitiativeMagique.bind(this));
    html.find("[data-action='rollAttaque']").click(this._onRollAttaque.bind(this));
    html.find("[data-action='rollParade']").click(this._onRollParade.bind(this));
    html.find("[data-action='rollEsquive']").click(this._onRollEsquive.bind(this));
    html.find("[data-action='rollDefenseNaturelle']").click(this._onRollDefenseNaturelle.bind(this));
    html.find("[data-action='rollFumble']").click(this._onRollFumble.bind(this));
    html.find("[data-action='rollBonusDe']").click(this._onRollBonusDe.bind(this));

    // Jets de dés — Sorts & Magie
    html.find("[data-action='rollSort']").click(this._onRollSort.bind(this));
    html.find("[data-action='rollSortImpro']").click(this._onRollSortImpro.bind(this));
    html.find("[data-action='rollEmprise']").click(this._onRollEmprise.bind(this));
    html.find("[data-action='rollImprovisation']").click(this._onRollImprovisation.bind(this));

    // Description déroulante des sorts
    html.find("[data-action='toggleSortDesc']").click(this._onToggleSortDesc.bind(this));
    html.find("[data-action='rollAptitudeMagie']").click(this._onRollAptitudeMagie.bind(this));
    html.find("[data-action='rollAptitudeConjuration']").click(this._onRollAptitudeConjuration.bind(this));
    html.find("[data-action='rollArtDomaine']").click(this._onRollArtDomaine.bind(this));
    html.find("[data-action='rollImpArtDomaine']").click(this._onRollImpArtDomaine.bind(this));

    // Mini-filtre sorts (onglet Magie)
    html.find(".smf-search").on("input", this._onFiltreSorts.bind(this));
    html.find(".smf-check").on("change", this._onFiltreTypeSorts.bind(this));

    // Drag & drop sorts → danseurs (mémorisation) + réordonnancement
    // Tracking mousedown pour détecter si le drag vient bien de la poignée
    html.find(".sort-card-drag-handle").on("mousedown", () => { this._sortDragFromHandle = true; });
    html.find(".sort-card").on("mouseup", () => { this._sortDragFromHandle = false; });
    html.find(".sort-card[draggable]").each((_, el) => {
      el.addEventListener("dragstart", this._onDragSortStart.bind(this));
      el.addEventListener("dragend",   this._onDragSortEnd.bind(this));
    });
    html.find(".danseur-slots").each((_, el) => {
      el.addEventListener("dragover",  this._onDragOverDanseur.bind(this));
      el.addEventListener("dragleave", this._onDragLeaveDanseur.bind(this));
      el.addEventListener("drop",      this._onDropSortOnDanseur.bind(this));
    });
    // Déposer sur la grille de cartes pour réordonner
    html.find(".sorts-cards-container").each((_, el) => {
      el.addEventListener("dragover",  this._onDragOverSortReorder.bind(this));
      el.addEventListener("dragleave", this._onDragLeaveSortReorder.bind(this));
      el.addEventListener("drop",      this._onDropSortReorder.bind(this));
    });
    html.find(".slot-remove").click(this._onRetireSortDanseur.bind(this));
    html.find("[data-action='rollSortDanseur']").click(this._onRollSortDanseur.bind(this));

    // Drag & drop pour réordonner les sorts dans les slots danseurs
    this._setupDanseurSlotsDrag(html);

    // Réordonnancement items par glisser-déposer
    this._setupDragReorder(html, ".comp-cards-grid:not(.comp-na-cards) .comp-card", ".comp-cards-grid:not(.comp-na-cards)");
    this._setupDragReorder(html, ".manoeuvres-table tbody .item-row", ".manoeuvres-table tbody");
    this._setupDragReorder(html, ".armes-table tbody .item-row", ".armes-table tbody");
    this._setupDragReorder(html, ".equip-table tbody .item-row", ".equip-table tbody");
    this._setupDragReorder(html, ".dons-list .item-row", ".dons-list");
    this._setupDragReorder(html, ".peines-table tbody .item-row", ".peines-table tbody");

    // Ouvrir le compendium de compétences / peuples
    html.find(".compendium-browse").click(this._onBrowseCompendium.bind(this));

    // Retirer le peuple actuel
    html.find(".peuple-clear").click(this._onClearPeuple.bind(this));

    // Envoyer un item en chat
    html.find("[data-action='rollItemChat']").click(this._onItemSendChat.bind(this));

    // Édition inline (quantité équipement, etc.)
    html.find(".inline-edit").change(this._onInlineEdit.bind(this));

    // Armure portée — clic sur checkbox d'item
    html.find(".armure-portee").change(this._onArmureItemPorteeChange.bind(this));

    // Armure portée — calcul auto
    html.find("[name='system.armure.portee']").change(this._onArmurePorteeChange.bind(this));
    html.find("[name='system.armure.malusAgi']").change(this._onArmureMalusChange.bind(this));
    html.find("[name='system.armure.type']").change(this._onArmureMalusChange.bind(this));

    // 3e blessure grave → jet de VOL Difficulté 10
    html.find("[name='system.blessureGrave3']").change(async (e) => {
      if (e.currentTarget.checked) {
        await this.actor.rollVolBlessure3();
      }
    });

    // Montée de niveau (dépense XP)
    html.find("[data-action='levelUp']").click(this._onLevelUp.bind(this));

    // Rétrogradation (remboursement XP / pts création)
    html.find("[data-action='levelDown']").click(this._onLevelDown.bind(this));

    // Montée de niveau danseur
    html.find("[data-action='levelUpDanseur']").click(this._onLevelUpDanseur.bind(this));

    // Création danseur — +/− niveau inline
    html.find("[data-action='danseurNiveauUp']").click(ev => this._onDanseurNiveau(ev, +1));
    html.find("[data-action='danseurNiveauDown']").click(ev => this._onDanseurNiveau(ev, -1));

    // Valider / réactiver mode création danseur
    html.find("[data-action='validerCreationDanseur']").click(this._onValiderCreationDanseur.bind(this));
    html.find("[data-action='reactiverCreationDanseur']").click(this._onReactiverCreationDanseur.bind(this));

    // Édition inline des stats courantes du danseur
    html.find(".danseur-inline-num").change(this._onDanseurStatEdit.bind(this));

    // Valider / réactiver mode création démon
    html.find("[data-action='validerCreationDemon']").click(this._onValiderCreationDemon.bind(this));
    html.find("[data-action='reactiverCreationDemon']").click(this._onReactiverCreationDemon.bind(this));

    // Édition inline des stats démon
    html.find(".demon-inline-num").change(this._onDemonStatEdit.bind(this));

    // Envoyer manœuvre/botte dans le chat
    html.find("[data-action='rollManoeuvre']").click(this._onChatManoeuvre.bind(this));

    // Envoyer pouvoir de flamme dans le chat
    html.find("[data-action='chatPouvoir']").click(this._onChatPouvoir.bind(this));

    // Mode niveau — toggle visibilité boutons
    html.find("[data-action='toggleLevelUp']").click(this._onToggleLevelUp.bind(this));

    // Mode création — toggle, resets locaux et validation
    html.find("[data-action='toggleCreation']").click(this._onToggleCreation.bind(this));
    html.find("[data-action='resetCaracs']").click(this._onResetCaracs.bind(this));
    html.find("[data-action='resetComps']").click(this._onResetComps.bind(this));
    html.find("[data-action='validerCreation']").click(this._onValiderCreation.bind(this));

    // Toggle tri compétences & sorts
    html.find("[data-action='triCompsToggle']").click(this._onTriCompsToggle.bind(this));
    html.find("[data-action='triSortsToggle']").click(this._onTriSortsToggle.bind(this));

    // Drag & drop inline items
    html.find(".item-drag").each((i, li) => {
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", this._onDragStart.bind(this));
    });

    // Toggle description manœuvres
    html.on("click", ".man-desc-toggle", ev => {
      const id = ev.currentTarget.dataset.itemId;
      const row = html.find(`.man-desc-expand[data-item-id="${id}"]`);
      const icon = ev.currentTarget.querySelector(".man-toggle-icon");
      row.slideToggle(120);
      icon?.classList.toggle("fa-chevron-right");
      icon?.classList.toggle("fa-chevron-down");
    });

    // Toggle description pouvoirs de flamme
    html.on("click", ".pouvoir-desc-toggle", ev => {
      const id = ev.currentTarget.dataset.itemId;
      const row = html.find(`.pouvoir-desc-expand[data-item-id="${id}"]`);
      const icon = ev.currentTarget.querySelector(".pouvoir-toggle-icon");
      row.slideToggle(120);
      icon?.classList.toggle("fa-chevron-right");
      icon?.classList.toggle("fa-chevron-down");
    });

    // Toggle description avantages/défauts
    html.on("click", ".don-desc-toggle", ev => {
      const id = ev.currentTarget.dataset.itemId;
      const row = html.find(`.don-desc-expand[data-item-id="${id}"]`);
      const icon = ev.currentTarget.querySelector(".don-toggle-icon");
      row.slideToggle(120);
      icon?.classList.toggle("fa-chevron-right");
      icon?.classList.toggle("fa-chevron-down");
    });

    // Toggle description peines de Perfidie
    html.on("click", ".peine-desc-toggle", ev => {
      const id = ev.currentTarget.dataset.itemId;
      const row = html.find(`.peine-desc-expand[data-item-id="${id}"]`);
      const icon = ev.currentTarget.querySelector(".peine-toggle-icon");
      row.slideToggle(120);
      icon?.classList.toggle("fa-chevron-right");
      icon?.classList.toggle("fa-chevron-down");
    });

    // Acquérir un bienfait de Perfidie (+1 Perfidie, bienfaitAcquis = true)
    html.on("click", "[data-action='acquerirBienfait']", async ev => {
      ev.preventDefault();
      const itemId = ev.currentTarget.dataset.itemId;
      const peine  = this.actor.items.get(itemId);
      if (!peine) return;
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        title  : "Acquérir un Bienfait",
        content: `<p>Acquérir <strong>${peine.system.bienfait}</strong> et dépenser <strong>+1 Perfidie</strong> ?</p>`,
      });
      if (!confirmed) return;
      await peine.update({ "system.bienfaitAcquis": true });
      await this.actor.update({ "system.perfidie": (this.actor.system.perfidie ?? 0) + 1 });
      ui.notifications?.info(`Bienfait « ${peine.system.bienfait} » acquis.`);
    });

    // ── Compagnons ────────────────────────────────────────────────────────
    html.find(".companion-open").click(this._onOpenCompanion.bind(this));
    html.find(".companion-remove").click(this._onRemoveCompanion.bind(this));
    // Feedback visuel drag-over sur la zone compagnons
    html.find(".companions-drop-zone").each((_, el) => {
      el.addEventListener("dragover", (ev) => {
        ev.preventDefault();
        el.classList.add("drag-over");
      });
      el.addEventListener("dragleave", (ev) => {
        if (!el.contains(ev.relatedTarget)) el.classList.remove("drag-over");
      });
      el.addEventListener("drop", () => el.classList.remove("drag-over"));
    });

    // ── Visibilité des onglets (paramètres) ───────────────────────────────
    html.find("[data-action='toggleTabVisibility']").change(this._onToggleTabVisibility.bind(this));

  }

  // ==============================
  // Description déroulante des sorts
  // ==============================
  _onToggleSortDesc(event) {
    event.preventDefault();
    event.stopPropagation();
    const btn   = event.currentTarget;
    const card  = btn.closest(".sort-card");
    const panel = card?.querySelector(".sort-desc-panel");
    if (!panel) return;
    const isOpen = panel.style.display !== "none";
    panel.style.display = isOpen ? "none" : "";
    btn.querySelector("i")?.classList.toggle("fa-chevron-right", isOpen);
    btn.querySelector("i")?.classList.toggle("fa-chevron-down", !isOpen);
  }

  // ==============================
  // Sections dépliables
  // ==============================
  _onToggleSection(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const section = btn.closest(".agone-section");
    if (!section) return;
    const content = section.querySelector(".section-content");
    if (!content) return;
    const isOpen = !section.classList.contains("collapsed");
    section.classList.toggle("collapsed", isOpen);
    btn.querySelector("i")?.classList.toggle("fa-chevron-down", isOpen);
    btn.querySelector("i")?.classList.toggle("fa-chevron-right", !isOpen);
  }

  // ==============================
  // Gestion des Items
  // ==============================
  async _onItemCreate(event) {
    event.preventDefault();
    const btn  = event.currentTarget;
    const type = btn.dataset.type;
    let name = game.i18n.localize(`AGONE.Nouvel${type.charAt(0).toUpperCase() + type.slice(1)}`);
    if (type === "danseur") {
      const baseName = name;
      const taken = new Set(this.actor.items.filter(i => i.type === "danseur").map(i => i.name));
      if (taken.has(name)) {
        let n = 2;
        while (taken.has(`${baseName} ${n}`)) n++;
        name = `${baseName} ${n}`;
      }
    }
    const itemData = { name, type, system: {} };
    // data-categorie permet de pré-remplir la catégorie pour les "don" (avantage|défaut)
    if (type === "don" && btn.dataset.categorie) {
      itemData.system.categorie = btn.dataset.categorie;
    }
    return await Item.create(itemData, { parent: this.actor });
  }

  _onItemEdit(event) {
    event.preventDefault();
    const li   = event.currentTarget.closest("[data-item-id]");
    const item = this.actor.items.get(li.dataset.itemId);
    item?.sheet.render(true);
  }

  async _onItemDelete(event) {
    event.preventDefault();
    const li   = event.currentTarget.closest("[data-item-id]");
    const item = this.actor.items.get(li.dataset.itemId);
    if (!item) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      title: game.i18n.localize("AGONE.Supprimer"),
      content: `<p>${game.i18n.format("AGONE.ConfirmationSuppression", { nom: item.name })}</p>`
    });
    if (confirmed) await item.delete();
  }

  async _onItemSendChat(event) {
    event.preventDefault();
    const li   = event.currentTarget.closest("[data-item-id]");
    const item = this.actor.items.get(li.dataset.itemId);
    item?.toChat?.();
  }

  // ==============================
  // Jets de dés
  // ==============================
  async _onRollAttribut(event) {
    event.preventDefault();
    const attrKey = event.currentTarget.dataset.carac;
    await this.actor.rollAttribut(attrKey);
  }

  async _onRollCompetence(event) {
    event.preventDefault();
    const li     = event.currentTarget.closest("[data-item-id]");
    const itemId = li?.dataset.itemId ?? event.currentTarget.dataset.itemId;
    await this.actor.rollCompetence(itemId);
  }

  async _onRollCompetenceNA(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    await this.actor.rollCompetenceSansItem(
      btn.dataset.nom,
      btn.dataset.attributLie,
      btn.dataset.domaine
    );
  }

  async _onApprendreCompetenceNA(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    await Item.create({
      name  : btn.dataset.nom,
      type  : "competence",
      system: { domaine: "", attributLie: btn.dataset.attributLie ?? "agilite", score: 0, exp: 0 },
    }, { parent: this.actor });
  }

  _onFilterCompetences(event, html) {
    const query = event.currentTarget.value.trim().toLowerCase();
    const clearBtn = html.find(".comp-search-clear")[0];
    if (clearBtn) clearBtn.style.display = query ? "" : "none";

    // Filtrer les cartes acquises et masquer les groupes vides
    html.find(".comp-group").each((_, group) => {
      let anyVisible = false;
      group.querySelectorAll(".comp-card.item-row").forEach(card => {
        const name = (card.querySelector(".comp-card-name")?.textContent ?? "").trim().toLowerCase();
        const visible = !query || name.includes(query);
        card.style.display = visible ? "" : "none";
        if (visible) anyVisible = true;
      });
      group.style.display = (!query || anyVisible) ? "" : "none";
    });

    // Section non acquises : visible seulement si recherche active
    const naSection = html.find(".comps-na-section")[0];
    if (!naSection) return;
    if (!query) { naSection.style.display = "none"; return; }
    naSection.style.display = "";

    let anyVisible = false;
    html.find(".comp-card--na.na-row").each((_, card) => {
      const nom     = (card.dataset.nom     ?? "").toLowerCase();
      const domaine = (card.dataset.domaine ?? "").toLowerCase();
      const visible = nom.includes(query) || domaine.includes(query);
      card.style.display = visible ? "" : "none";
      if (visible) anyVisible = true;
    });
    naSection.style.display = anyVisible ? "" : "none";
  }

  async _onRollInitiative(event) {
    event.preventDefault();
    const armeId = event.currentTarget.dataset.armeId ?? null;
    await this.actor.rollInitiative(armeId);
  }

  async _onRollInitiativeMagique(event) {
    event.preventDefault();
    await this.actor.rollInitiativeMagique();
  }

  async _onRollAttaque(event) {
    event.preventDefault();
    const li     = event.currentTarget.closest("[data-item-id]");
    const armeId = li?.dataset.itemId ?? event.currentTarget.dataset.armeId;
    await this.actor.rollAttaque(armeId);
  }

  async _onRollParade(event) {
    event.preventDefault();
    const li     = event.currentTarget.closest("[data-item-id]");
    const armeId = li?.dataset.itemId ?? event.currentTarget.dataset.armeId;
    await this.actor.rollParade(armeId);
  }

  async _onRollEsquive(event) {
    event.preventDefault();
    await this.actor.rollEsquive();
  }

  async _onRollDefenseNaturelle(event) {
    event.preventDefault();
    await this.actor.rollDefenseNaturelle();
  }

  async _onRollFumble(event) {
    event.preventDefault();
    await this.actor.rollFumble();
  }

  async _onRollBonusDe(event) {
    event.preventDefault();
    const roll = await new Roll("1d10").evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor:  game.i18n.localize("AGONE.BonusDePdvFlavor")
    });
    await this.actor.update({ "system.pdv.bonusDe": roll.total });
  }

  async _onRollSort(event) {
    event.preventDefault();
    const li     = event.currentTarget.closest("[data-item-id]");
    const itemId = li?.dataset.itemId ?? event.currentTarget.dataset.itemId;
    await this.actor.rollSort(itemId);
  }

  async _onRollSortImpro(event) {
    event.preventDefault();
    const li     = event.currentTarget.closest("[data-item-id]");
    const itemId = li?.dataset.itemId ?? event.currentTarget.dataset.itemId;
    await this.actor.rollSort(itemId, { impro: true });
  }

  // ==============================
  // Emprise & Improvisation Danseur
  // ==============================
  async _onRollEmprise(event) {
    event.preventDefault();
    const itemId  = event.currentTarget.dataset.itemId;
    const danseur = this.actor.items.get(itemId);
    if (!danseur) return;

    const sd    = this.actor.system;
    const label = game.i18n.format("AGONE.PotentielEmpriseLabel", { nom: danseur.name });

    // Source EMP selon type de mage
    const empSourceLabel = sd.typeMage === "jorniste"       ? `INT (${sd.intelligence?.score ?? 0}) — Jorniste`
                         : sd.typeMage === "obscurantiste"  ? `VOL (${sd.volonte?.score ?? 0}) — Obscurantiste`
                         : `(INT ${sd.intelligence?.score ?? 0} + VOL ${sd.volonte?.score ?? 0}) / 2 — Éclipsiste`;

    const compDanseurs      = this.actor.items.find(i =>
      i.type === "competence" && i.name.toLowerCase().includes("danseur")
    );
    const scoreConnDanseurs = compDanseurs?.system.score ?? 0;
    const bonusEsprit       = sd.bonusEsprit ?? 0;
    const aptitude          = (sd.emprise ?? 0) + scoreConnDanseurs + bonusEsprit;
    const bonusDanseur      = danseur.system.bonusEmprise ?? 0;
    const endAct            = danseur.system.enduranceActuelle ?? 0;
    const endMax            = danseur.system.enduranceMax     ?? 0;

    const modif = await this.actor._dialogModificateur(label);
    if (modif === null) return;

    const roll = new Roll("1d10x10 + @apt + @bd + @modif", {
      apt: aptitude, bd: bonusDanseur, modif
    });
    await roll.evaluate();
    await this.actor._sendRollToChat(roll, label, {
      danseur:   { label: "Danseur",               value: danseur.name },
      endurance: { label: "Endurance danseur",      value: `${endAct} / ${endMax}` },
      empBase:   { label: "Emprise (base)",          value: sd.emprise ?? 0, tooltip: empSourceLabel },
      connDans:  { label: compDanseurs?.name ?? "Conn. Danseurs", value: `+${scoreConnDanseurs}` },
      esprit:    { label: "Bonus Esprit",            value: `+${bonusEsprit}`,
                   tooltip: `Esprit ${sd.esprit?.score ?? 0} − Esprit Noir ${sd.esprit?.noir ?? 0}` },
      aptTotal:  { label: "Total Emprise",           value: aptitude },
      bonusDans: { label: `Bonus d'Emprise (${danseur.name})`, value: `+${bonusDanseur}` },
      modif:     { label: "Bonus / Malus",           value: modif >= 0 ? `+${modif}` : modif },
    });
  }

  async _onRollImprovisation(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    await this.actor.rollImprovisationDanseur(itemId);
  }

  // ==============================
  // Mini-filtre sorts (onglet Magie)
  // ==============================
  _onFiltreSorts(event) {
    const query     = event.currentTarget.value.toLowerCase().trim();
    const sortsBlock = event.currentTarget.closest(".sorts-block");
    if (!sortsBlock) return;
    sortsBlock.querySelectorAll(".sort-group").forEach(group => {
      let anyVisible = false;
      group.querySelectorAll(".sort-card").forEach(card => {
        const name = (card.querySelector(".sort-card-name")?.textContent ?? "").toLowerCase().trim();
        const type = (card.querySelector(".sort-type-badge")?.textContent ?? "").toLowerCase().trim();
        const show = !query || name.includes(query) || type.includes(query);
        card.style.display = show ? "" : "none";
        if (show) anyVisible = true;
      });
      group.style.display = (!query || anyVisible) ? "" : "none";
    });
  }

  _onFiltreTypeSorts(event) {
    const checks      = event.currentTarget.closest(".smf-checks")?.querySelectorAll(".smf-check");
    const activeTypes = new Set([...(checks ?? [])].filter(c => c.checked).map(c => c.value));
    const sortsBlock  = event.currentTarget.closest(".sorts-block");
    if (!sortsBlock) return;
    sortsBlock.querySelectorAll(".sort-group").forEach(group => {
      let anyVisible = false;
      group.querySelectorAll(".sort-card").forEach(card => {
        const cardType = (card.querySelector(".sort-type-badge")?.textContent?.trim() ?? "").split(" / ")[0];
        const show     = activeTypes.size === 0 || activeTypes.has(cardType);
        card.style.display = show ? "" : "none";
        if (show) anyVisible = true;
      });
      group.style.display = (activeTypes.size === 0 || anyVisible) ? "" : "none";
    });
  }

  // ==============================
  // Drag & drop sorts → danseurs
  // ==============================
  _onDragSortStart(event) {
    // Drag uniquement si initié depuis la poignée (tracké via mousedown)
    if (!this._sortDragFromHandle) {
      event.preventDefault();
      return;
    }
    this._sortDragFromHandle = false;
    const itemId = event.currentTarget.dataset.itemId;
    if (!itemId) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify({ type: "sort-assign", itemId }));
    event.currentTarget.classList.add("dragging");
  }

  _onDragSortEnd(event) {
    event.currentTarget.classList.remove("dragging");
  }

  _onDragOverDanseur(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    event.currentTarget.classList.add("drag-over");
  }

  _onDragLeaveDanseur(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      event.currentTarget.classList.remove("drag-over");
    }
  }

  async _onDropSortOnDanseur(event) {
    event.preventDefault();
    const zone = event.currentTarget;
    zone.classList.remove("drag-over");
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { return; }
    if (data?.type !== "sort-assign") return;

    const danseurId    = zone.dataset.danseurId;
    const danseur      = this.actor.items.get(danseurId);
    const sort         = this.actor.items.get(data.itemId);
    if (!danseur || !sort) return;

    const memoireMax    = danseur.system.memoireMax ?? 0;
    const assignedCount = this.actor.items.filter(i =>
      i.type === "sort" && i.system.danseurNom === danseur.name
    ).length;

    if (memoireMax > 0 && assignedCount >= memoireMax && sort.system.danseurNom !== danseur.name) {
      ui.notifications.warn(
        game.i18n.format("AGONE.DanseurMemoirePleine", { nom: danseur.name, max: memoireMax })
      );
      return;
    }
    await sort.update({ "system.danseurNom": danseur.name });
  }

  // ==============================
  // Réordonnancement des sorts
  // ==============================
  _getTargetSortCard(event, container) {
    for (const card of container.querySelectorAll(".sort-card")) {
      const rect = card.getBoundingClientRect();
      if (event.clientY >= rect.top && event.clientY <= rect.bottom) return card;
    }
    return null;
  }

  _clearSortDropIndicators(container) {
    container.querySelectorAll(".sort-drop-above, .sort-drop-below").forEach(el => {
      el.classList.remove("sort-drop-above", "sort-drop-below");
    });
  }

  _onDragOverSortReorder(event) {
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { /* ok */ }
    if (data?.type !== "sort-assign" && !event.dataTransfer.types.includes("text/plain")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const container  = event.currentTarget;
    const targetCard = this._getTargetSortCard(event, container);
    this._clearSortDropIndicators(container);
    if (!targetCard) return;
    const rect   = targetCard.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    targetCard.classList.add(before ? "sort-drop-above" : "sort-drop-below");
  }

  _onDragLeaveSortReorder(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      this._clearSortDropIndicators(event.currentTarget);
    }
  }

  async _onDropSortReorder(event) {
    const container = event.currentTarget;
    this._clearSortDropIndicators(container);
    // Le drop→danseur est prioritaire ; ne pas intercepter si la target est une zone danseur
    if (event.target.closest(".danseur-slots")) return;
    event.preventDefault();
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { return; }
    if (data?.type !== "sort-assign") return;

    const draggedSort = this.actor.items.get(data.itemId);
    if (!draggedSort || draggedSort.type !== "sort") return;

    const targetCard = this._getTargetSortCard(event, container);
    if (!targetCard || targetCard.dataset.itemId === data.itemId) return;

    const targetSort = this.actor.items.get(targetCard.dataset.itemId);
    if (!targetSort) return;

    const rect       = targetCard.getBoundingClientRect();
    const sortBefore = event.clientY < rect.top + rect.height / 2;
    const siblings   = this.actor.items.filter(i => i.type === "sort" && i.id !== draggedSort.id);

    const sortHelper = foundry.utils.SortingHelpers ?? globalThis.SortingHelpers;
    const updates    = sortHelper.performIntegerSort(draggedSort, { target: targetSort, siblings, sortBefore });
    if (updates.length) {
      await this.actor.updateEmbeddedDocuments("Item",
        updates.map(u => ({ _id: u.target.id, sort: u.update.sort }))
      );
    }
  }

  async _onRetireSortDanseur(event) {
    event.preventDefault();
    event.stopPropagation();
    const sortId = event.currentTarget.dataset.sortId;
    const sort   = this.actor.items.get(sortId);
    if (sort) await sort.update({ "system.danseurNom": "" });
  }

  async _onRollSortDanseur(event) {
    event.preventDefault();
    event.stopPropagation();
    const { sortId, danseurId } = event.currentTarget.dataset;
    const danseur = this.actor.items.get(danseurId);
    const sort    = this.actor.items.get(sortId);
    if (!danseur || !sort) return;

    // Guard endurance
    if ((danseur.system.enduranceActuelle ?? 0) <= 0) {
      ui.notifications.warn(`${danseur.name} n'a plus d'endurance et ne peut pas lancer de sort.`);
      return;
    }

    const sd    = this.actor.system;
    const label = `${sort.name} (via ${danseur.name})`;

    // Aptitude d'emprise : EMP + Conn. Danseurs + bonusEsprit + bonusDanseur
    const compDanseurs      = this.actor.items.find(i =>
      i.type === "competence" && i.name.toLowerCase().includes("danseur")
    );
    const scoreConnDanseurs = compDanseurs?.system.score ?? 0;
    const aptitude          = (sd.emprise ?? 0) + scoreConnDanseurs + (sd.bonusEsprit ?? 0);
    const bonusDanseur      = danseur.system.bonusEmprise ?? 0;
    const seuil             = sort.system.seuil ?? 0;

    // Source EMP selon type de mage
    const empSourceLabel = sd.typeMage === "jorniste"      ? `INT (${sd.intelligence?.score ?? 0}) — Jorniste`
                         : sd.typeMage === "obscurantiste" ? `VOL (${sd.volonte?.score ?? 0}) — Obscurantiste`
                         : `(INT ${sd.intelligence?.score ?? 0} + VOL ${sd.volonte?.score ?? 0}) / 2 — Éclipsiste`;
    const bonusEsprit = sd.bonusEsprit ?? 0;
    const endBefore   = danseur.system.enduranceActuelle ?? 0;
    const newEnd      = Math.max(0, endBefore - 1);

    const modif = await this.actor._dialogModificateur(label);
    if (modif === null) return;

    const roll = new Roll("1d10x10 + @apt + @bd + @modif", {
      apt: aptitude, bd: bonusDanseur, modif
    });
    await roll.evaluate();
    await this.actor._sendRollToChat(roll, label, {
      sort:      { label: "Sort",  value: sort.name },
      seuil:     { label: "Seuil", value: seuil, tooltip: "Score total à atteindre pour réussir le sort" },
      danseur:   { label: "Danseur",                value: danseur.name },
      endurance: { label: "Endurance",              value: `${endBefore} → ${newEnd} / ${danseur.system.enduranceMax ?? 0}` },
      empBase:   { label: "Emprise (base)",          value: sd.emprise ?? 0, tooltip: empSourceLabel },
      connDans:  { label: compDanseurs?.name ?? "Conn. Danseurs", value: `+${scoreConnDanseurs}` },
      esprit:    { label: "Bonus Esprit",            value: `+${bonusEsprit}`,
                   tooltip: `Esprit ${sd.esprit?.score ?? 0} − Esprit Noir ${sd.esprit?.noir ?? 0}` },
      aptTotal:  { label: "Total Emprise",           value: aptitude },
      bonusDans: { label: `Bonus d'Emprise (${danseur.name})`, value: `+${bonusDanseur}` },
      modif:     { label: "Bonus / Malus",           value: modif >= 0 ? `+${modif}` : modif },
    });

    // Décrémenter l'endurance du danseur
    await danseur.update({ "system.enduranceActuelle": newEnd });
  }

  // ==============================
  // Drag & drop réordonnancement dans les slots danseurs
  // ==============================
  _setupDanseurSlotsDrag(html) {
    html.find(".danseur-slot-sort").each((_, el) => {
      const sortId = el.dataset.sortId;
      if (!sortId) return;
      el.setAttribute("draggable", true);
      el.addEventListener("dragstart", evt => {
        evt.stopPropagation();
        evt.dataTransfer.effectAllowed = "move";
        evt.dataTransfer.setData("text/plain", JSON.stringify({ type: "slot-reorder", sortId }));
        el.classList.add("dragging");
      });
      el.addEventListener("dragend", () => el.classList.remove("dragging"));
    });
    html.find(".danseur-slots").each((_, container) => {
      container.addEventListener("dragover", evt => {
        let data;
        try { data = JSON.parse(evt.dataTransfer.getData("text/plain")); } catch { }
        if (data?.type !== "slot-reorder") return;
        evt.preventDefault();
        evt.dataTransfer.dropEffect = "move";
        const slots = [...container.querySelectorAll(".danseur-slot-sort")];
        container.querySelectorAll(".slot-drop-above, .slot-drop-below")
          .forEach(s => s.classList.remove("slot-drop-above", "slot-drop-below"));
        const target = slots.find(s => {
          const r = s.getBoundingClientRect();
          return evt.clientY >= r.top && evt.clientY <= r.bottom;
        });
        if (!target) return;
        const r = target.getBoundingClientRect();
        target.classList.add(evt.clientY < r.top + r.height / 2 ? "slot-drop-above" : "slot-drop-below");
      });
      container.addEventListener("dragleave", evt => {
        if (!container.contains(evt.relatedTarget)) {
          container.querySelectorAll(".slot-drop-above, .slot-drop-below")
            .forEach(s => s.classList.remove("slot-drop-above", "slot-drop-below"));
        }
      });
      container.addEventListener("drop", async evt => {
        container.querySelectorAll(".slot-drop-above, .slot-drop-below")
          .forEach(s => s.classList.remove("slot-drop-above", "slot-drop-below"));
        let data;
        try { data = JSON.parse(evt.dataTransfer.getData("text/plain")); } catch { return; }
        if (data?.type !== "slot-reorder") return;
        evt.preventDefault();
        evt.stopPropagation();
        const danseurId    = container.dataset.danseurId;
        const danseur      = this.actor.items.get(danseurId);
        const draggedSort  = this.actor.items.get(data.sortId);
        if (!danseur || !draggedSort) return;
        const slots = [...container.querySelectorAll(".danseur-slot-sort")];
        const targetSlot = slots.find(s => {
          const r = s.getBoundingClientRect();
          return evt.clientY >= r.top && evt.clientY <= r.bottom;
        });
        if (!targetSlot || targetSlot.dataset.sortId === data.sortId) return;
        const targetSort = this.actor.items.get(targetSlot.dataset.sortId);
        if (!targetSort) return;
        const r = targetSlot.getBoundingClientRect();
        const sortBefore = evt.clientY < r.top + r.height / 2;
        const siblings   = this.actor.items.filter(i =>
          i.type === "sort" && i.id !== draggedSort.id && i.system.danseurNom === danseur.name
        );
        const sortHelper = foundry.utils.SortingHelpers ?? globalThis.SortingHelpers;
        const updates    = sortHelper.performIntegerSort(draggedSort, { target: targetSort, siblings, sortBefore });
        if (updates.length) {
          await this.actor.updateEmbeddedDocuments("Item",
            updates.map(u => ({ _id: u.target.id, sort: u.update.sort }))
          );
        }
      });
    });
  }

  _setupDragReorder(html, rowSel, containerSel) {
    html.find(rowSel).each((_, el) => {
      const handle = el.querySelector(".item-drag-handle");
      if (!handle) return;
      handle.addEventListener("mousedown", () => { el._fromDragHandle = true; });
      el.addEventListener("mouseup", () => { el._fromDragHandle = false; });
      el.setAttribute("draggable", true);
      el.addEventListener("dragstart", evt => {
        if (!el._fromDragHandle) { evt.preventDefault(); return; }
        el._fromDragHandle = false;
        const itemId = el.dataset.itemId;
        if (!itemId) return;
        evt.dataTransfer.effectAllowed = "move";
        evt.dataTransfer.setData("text/plain", JSON.stringify({ type: "item-reorder", itemId }));
        el.classList.add("dragging");
      });
      el.addEventListener("dragend", () => el.classList.remove("dragging"));
    });
    html.find(containerSel).each((_, container) => {
      container.addEventListener("dragover",  this._onDragOverItemReorder.bind(this));
      container.addEventListener("dragleave", this._onDragLeaveItemReorder.bind(this));
      container.addEventListener("drop",      this._onDropItemReorder.bind(this));
    });
  }

  _onDragOverItemReorder(event) {
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { }
    if (data?.type !== "item-reorder" && !event.dataTransfer.types.includes("text/plain")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const container = event.currentTarget;
    const rows = [...container.querySelectorAll(".item-row[data-item-id]")];
    const targetRow = rows.find(row => {
      const rect = row.getBoundingClientRect();
      return event.clientY >= rect.top && event.clientY <= rect.bottom;
    });
    container.querySelectorAll(".item-drop-above, .item-drop-below")
      .forEach(el => el.classList.remove("item-drop-above", "item-drop-below"));
    if (!targetRow) return;
    const rect = targetRow.getBoundingClientRect();
    targetRow.classList.add(event.clientY < rect.top + rect.height / 2 ? "item-drop-above" : "item-drop-below");
  }

  _onDragLeaveItemReorder(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      event.currentTarget.querySelectorAll(".item-drop-above, .item-drop-below")
        .forEach(el => el.classList.remove("item-drop-above", "item-drop-below"));
    }
  }

  async _onDropItemReorder(event) {
    const container = event.currentTarget;
    container.querySelectorAll(".item-drop-above, .item-drop-below")
      .forEach(el => el.classList.remove("item-drop-above", "item-drop-below"));
    event.preventDefault();
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { return; }
    if (data?.type !== "item-reorder") return;
    const draggedItem = this.actor.items.get(data.itemId);
    if (!draggedItem) return;
    const rows = [...container.querySelectorAll(".item-row[data-item-id]")];
    const targetRow = rows.find(row => {
      const rect = row.getBoundingClientRect();
      return event.clientY >= rect.top && event.clientY <= rect.bottom;
    });
    if (!targetRow || targetRow.dataset.itemId === data.itemId) return;
    const targetItem = this.actor.items.get(targetRow.dataset.itemId);
    if (!targetItem || targetItem.type !== draggedItem.type) return;
    const rect = targetRow.getBoundingClientRect();
    const sortBefore = event.clientY < rect.top + rect.height / 2;
    const siblings   = this.actor.items.filter(i => i.type === draggedItem.type && i.id !== draggedItem.id);
    const sortHelper = foundry.utils.SortingHelpers ?? globalThis.SortingHelpers;
    const updates    = sortHelper.performIntegerSort(draggedItem, { target: targetItem, siblings, sortBefore });
    if (updates.length) {
      await this.actor.updateEmbeddedDocuments("Item",
        updates.map(u => ({ _id: u.target.id, sort: u.update.sort }))
      );
    }
  }

  async _onRollSort(event) {
    event.preventDefault();
    const li     = event.currentTarget.closest("[data-item-id]");
    const itemId = li?.dataset.itemId ?? event.currentTarget.dataset.itemId;
    await this.actor.rollSort(itemId);
  }

  async _onRollAptitudeMagie(event) {
    event.preventDefault();
    // Roll arts magiques : aptitudeArtsMagiques
    const sd = this.actor.system;
    const label = game.i18n.localize("AGONE.AptitudeArtsMagiques");
    const modif = await this.actor._dialogModificateur(label);
    if (modif === null) return;
    const roll = new Roll("1d10x10 + @apt + @modif", { apt: sd.aptitudeArtsMagiques ?? 0, modif });
    await roll.evaluate();
    await this.actor._sendRollToChat(roll, label, {
      aptitude: `${label} : ${sd.aptitudeArtsMagiques ?? 0}`,
      modif: `Bonus/Malus : ${modif}`
    });
  }

  async _onRollAptitudeConjuration(event) {
    event.preventDefault();
    const sd = this.actor.system;
    const label = game.i18n.localize("AGONE.AptitudeConjuration");
    const modif = await this.actor._dialogModificateur(label);
    if (modif === null) return;
    const roll = new Roll("1d10x10 + @apt + @modif", { apt: sd.aptitudeConjuration ?? 0, modif });
    await roll.evaluate();
    await this.actor._sendRollToChat(roll, label, {
      aptitude: `${label} : ${sd.aptitudeConjuration ?? 0}`,
      modif: `Bonus/Malus : ${modif}`
    });
  }

  async _onRollArtDomaine(event) {
    event.preventDefault();
    const btn       = event.currentTarget;
    const domaine   = btn.dataset.domaine ?? "";
    const apt       = parseInt(btn.dataset.apt)       || 0;
    const specialite = btn.dataset.specialite ?? "";
    // Composantes pour le tooltip
    const artVal    = parseInt(btn.dataset.art)       || 0;
    const scoreArts = parseInt(btn.dataset.scoreArts) || 0;
    const scoreComp = parseInt(btn.dataset.scoreComp) || 0;
    const nomComp   = btn.dataset.nomComp ?? "";
    const scoreEff  = parseInt(btn.dataset.scoreEff)  || 0;
    const bonusAme  = parseInt(btn.dataset.bonusAme)  || 0;
    const label     = game.i18n.format("AGONE.PotentielArtLabel", { domaine });
    const modif     = await this.actor._dialogModificateur(label, { specialite });
    if (modif === null) return;
    const bonusSpe  = this.actor._lastBonusSpe ?? 0;
    const total     = apt + bonusSpe;
    const roll = new Roll("1d10x10 + @total + @modif", { total, modif });
    await roll.evaluate();
    // Formule détaillée visible dans le chat
    const formule = `ART(${artVal}) + min(Arts:${scoreArts}, ${nomComp}:${scoreComp})→${scoreEff} + BonusÂme(${bonusAme})${bonusSpe ? ` + Spé(+${bonusSpe})` : ""}`;
    await this.actor._sendRollToChat(roll, label, {
      aptitude: `${formule} : ${apt}${bonusSpe ? ` +${bonusSpe}` : ""}`,
      modif: `Bonus/Malus : ${modif}`
    });
  }

  async _onRollImpArtDomaine(event) {
    event.preventDefault();
    const btn       = event.currentTarget;
    const domaine   = btn.dataset.domaine ?? "";
    const apt       = parseInt(btn.dataset.apt)       || 0;
    const specialite = btn.dataset.specialite ?? "";
    // Composantes pour le tooltip
    const creVal    = parseInt(btn.dataset.cre)       || 0;
    const scoreArts = parseInt(btn.dataset.scoreArts) || 0;
    const scoreComp = parseInt(btn.dataset.scoreComp) || 0;
    const nomComp   = btn.dataset.nomComp ?? "";
    const scoreEff  = parseInt(btn.dataset.scoreEff)  || 0;
    const bonusAme  = parseInt(btn.dataset.bonusAme)  || 0;
    const label     = game.i18n.format("AGONE.ImproArtLabel", { domaine });
    const modif     = await this.actor._dialogModificateur(label, { specialite });
    if (modif === null) return;
    const bonusSpe  = this.actor._lastBonusSpe ?? 0;
    const total     = apt + bonusSpe;
    const roll = new Roll("1d10x10 + @total + @modif", { total, modif });
    await roll.evaluate();
    // Formule détaillée visible dans le chat
    const formule = `CRÉ(${creVal}) + min(Arts:${scoreArts}, ${nomComp}:${scoreComp})→${scoreEff} + BonusÂme(${bonusAme})${bonusSpe ? ` + Spé(+${bonusSpe})` : ""}`;
    await this.actor._sendRollToChat(roll, label, {
      aptitude: `${formule} : ${apt}${bonusSpe ? ` +${bonusSpe}` : ""}`,
      modif: `Bonus/Malus : ${modif}`
    });
  }

  // ==============================
  // Calcul automatique armure
  // ==============================
  async _onArmureItemPorteeChange(event) {
    event.preventDefault();
    const el     = event.currentTarget;
    const itemId = el.dataset.itemId;
    const portee = el.checked;

    // Dé-équiper toutes les armures d'abord
    const updateBatch = this.actor.items
      .filter(i => i.type === "armure")
      .map(i => ({ _id: i.id, "system.portee": i.id === itemId ? portee : false }));
    await this.actor.updateEmbeddedDocuments("Item", updateBatch);

    // Synchroniser les stats d'armure de l'acteur
    if (portee) {
      const item = this.actor.items.get(itemId);
      if (item) {
        await this.actor.update({
          "system.armure.portee":     true,
          "system.armure.nom":        item.name,
          "system.armure.type":       item.system.type,
          "system.armure.protection": item.system.protection,
          "system.armure.malusAgi":   item.system.malusAgi,
          "system.armure.malusPer":   item.system.malusPer
        });
      }
    } else {
      await this.actor.update({
        "system.armure.portee":     false,
        "system.armure.nom":        "",
        "system.armure.protection": 0,
        "system.armure.malusAgi":   0,
        "system.armure.malusPer":   0
      });
    }
  }

  async _onArmurePorteeChange(event) {
    const portee = event.currentTarget.checked;
    if (!portee) {
      await this.actor.update({
        "system.armure.portee": false
      });
    }
  }

  async _onArmureMalusChange(event) {
    // Déclenche la mise à jour pour recalculer malusPer
    const form = this.element.find("form");
    const malusAgi = parseInt(form.find("[name='system.armure.malusAgi']").val()) || 0;
    const type     = form.find("[name='system.armure.type']").val();
    let malusPer = 0;
    if (type === "1") malusPer = Math.floor(malusAgi / 2);
    if (type === "2") malusPer = malusAgi;
    await this.actor.update({ "system.armure.malusPer": malusPer });
  }

  // ==============================
  // Compendium
  // ==============================
  async _onBrowseCompendium(event) {
    event.preventDefault();
    const packId = event.currentTarget.dataset.pack ?? "agone.competences";

    // Sorts → navigateur personnalisé
    if (packId === "agone.sorts") {
      if (!this._sortsBrowser) {
        this._sortsBrowser = new SortsBrowser(this.actor);
      }
      this._sortsBrowser.render(true);
      return;
    }

    // Compétences → navigateur personnalisé
    if (packId === "agone.competences") {
      if (!this._competencesBrowser) {
        this._competencesBrowser = new CompetencesBrowser(this.actor);
      }
      this._competencesBrowser.render(true);
      return;
    }

    // Armes → navigateur personnalisé
    if (packId === "agone.armes") {
      if (!this._armesBrowser) {
        this._armesBrowser = new ArmesBrowser(this.actor);
      }
      this._armesBrowser.render(true);
      return;
    }

    // Armures & Boucliers → navigateur personnalisé
    if (packId === "agone.armures") {
      if (!this._armuresBrowser) {
        this._armuresBrowser = new ArmuresBrowser(this.actor);
      }
      this._armuresBrowser.render(true);
      return;
    }

    // Avantages & Défauts → navigateur personnalisé (données PDF)
    if (packId === "agone.dons") {
      if (!this._avantagesBrowser) {
        this._avantagesBrowser = new AvantagesBrowser(this.actor);
      }
      this._avantagesBrowser.render(true);
      return;
    }

    // Manœuvres & Bottes → navigateur personnalisé
    if (packId === "agone.manoeuvres") {
      if (!this._manoeuvresBrowser) {
        this._manoeuvresBrowser = new ManoeuvresBrowser(this.actor);
      }
      this._manoeuvresBrowser.render(true);
      return;
    }

    // Peuples → navigateur personnalisé
    if (packId === "agone.peuples") {
      if (!this._peuplesBrowser) {
        this._peuplesBrowser = new PeuplesBrowser(this.actor);
      }
      this._peuplesBrowser.render(true);
      return;
    }

    // Pouvoirs de Flamme → navigateur personnalisé
    if (packId === "agone.pouvoirs") {
      if (!this._pouvoirsBrowser) {
        this._pouvoirsBrowser = new PouvoirsBrowser(this.actor);
      }
      this._pouvoirsBrowser.render(true);
      return;
    }

    // Peines de Perfidie → navigateur personnalisé
    if (packId === "agone.peines") {
      if (!this._peinesBrowser) {
        this._peinesBrowser = new PeinesBrowser(this.actor);
      }
      this._peinesBrowser.render(true);
      return;
    }

    // Autres compendiums → comportement standard
    const pack = game.packs.get(packId);
    if (!pack) return ui.notifications?.warn(game.i18n.localize("AGONE.CompendiumIntrouvable"));
    pack.render(true);
  }

  async _onClearPeuple(event) {
    event.preventDefault();
    const sd  = this.actor.system;
    const old = sd.peupleBonusApplique ?? {};

    // Supprimer les compétences raciales de l'ancien peuple
    const oldCompIds = (sd.peupleCompetenceIds ?? []).filter(id => this.actor.items.has(id));
    if (oldCompIds.length) await this.actor.deleteEmbeddedDocuments("Item", oldCompIds);

    const update = {
      "system.peuple":                 "",
      "system.peupleId":               "",
      "system.tai":                    0,
      "system.mvOverride":             null,
      "system.mvVol":                  0,
      "system.peupleCompetenceIds":    [],
      "system.peupleBonusApplique.corpsBonus":        0,
      "system.peupleBonusApplique.espritBonus":       0,
      "system.peupleBonusApplique.ameBonus":          0,
      "system.peupleBonusApplique.agiliteBonus":      0,
      "system.peupleBonusApplique.forceBonus":        0,
      "system.peupleBonusApplique.perceptionBonus":   0,
      "system.peupleBonusApplique.resistanceBonus":   0,
      "system.peupleBonusApplique.intelligenceBonus": 0,
      "system.peupleBonusApplique.volonteBonus":      0,
      "system.peupleBonusApplique.charismaBonus":     0,
      "system.peupleBonusApplique.creativiteBonus":   0,
      "system.peupleMalusEnAttente.corpsBonus":        0,
      "system.peupleMalusEnAttente.espritBonus":       0,
      "system.peupleMalusEnAttente.ameBonus":          0,
      "system.peupleMalusEnAttente.agiliteBonus":      0,
      "system.peupleMalusEnAttente.forceBonus":        0,
      "system.peupleMalusEnAttente.perceptionBonus":   0,
      "system.peupleMalusEnAttente.resistanceBonus":   0,
      "system.peupleMalusEnAttente.intelligenceBonus": 0,
      "system.peupleMalusEnAttente.volonteBonus":      0,
      "system.peupleMalusEnAttente.charismaBonus":     0,
      "system.peupleMalusEnAttente.creativiteBonus":   0,
      "system.corps.score":       Math.max(0, (sd.corps?.score  ?? 0) - (old.corpsBonus  ?? 0)),
      "system.esprit.score":      Math.max(0, (sd.esprit?.score ?? 0) - (old.espritBonus ?? 0)),
      "system.ame.score":         Math.max(0, (sd.ame?.score    ?? 0) - (old.ameBonus    ?? 0)),
      "system.agilite.score":     Math.max(0, (sd.agilite?.score      ?? 0) - (old.agiliteBonus      ?? 0)),
      "system.agilite.raceMin":   null,
      "system.agilite.raceMax":   null,
      "system.force.score":       Math.max(0, (sd.force?.score        ?? 0) - (old.forceBonus        ?? 0)),
      "system.force.raceMin":     null,
      "system.force.raceMax":     null,
      "system.perception.score":  Math.max(0, (sd.perception?.score   ?? 0) - (old.perceptionBonus   ?? 0)),
      "system.perception.raceMin":   null,
      "system.perception.raceMax":   null,
      "system.resistance.score":  Math.max(0, (sd.resistance?.score   ?? 0) - (old.resistanceBonus   ?? 0)),
      "system.resistance.raceMin":   null,
      "system.resistance.raceMax":   null,
      "system.intelligence.score":Math.max(0, (sd.intelligence?.score ?? 0) - (old.intelligenceBonus ?? 0)),
      "system.intelligence.raceMin": null,
      "system.intelligence.raceMax": null,
      "system.volonte.score":     Math.max(0, (sd.volonte?.score      ?? 0) - (old.volonteBonus      ?? 0)),
      "system.volonte.raceMin":   null,
      "system.volonte.raceMax":   null,
      "system.charisma.score":    Math.max(0, (sd.charisma?.score     ?? 0) - (old.charismaBonus     ?? 0)),
      "system.charisma.raceMin":  null,
      "system.charisma.raceMax":  null,
      "system.creativite.score":  Math.max(0, (sd.creativite?.score   ?? 0) - (old.creativiteBonus   ?? 0)),
      "system.creativite.raceMin": null,
      "system.creativite.raceMax": null,
    };
    await this.actor.update(update);
  }

  // ── Drop d'un item de type peuple ──────────────────────────────────────
  /** @override */
  async _onDropItem(event, data) {
    const item = await Item.fromDropData(data);
    if (!item || item.type !== "peuple") {
      return super._onDropItem(event, data);
    }
    await this._applyPeuple(item);
  }

  async _applyPeuple(peupleItem) {
    const sd  = this.actor.system;
    const old = sd.peupleBonusApplique ?? {};
    const nw  = peupleItem.system;

    // Supprimer les compétences raciales de l'ancien peuple
    const oldCompIds = (sd.peupleCompetenceIds ?? []).filter(id => this.actor.items.has(id));
    if (oldCompIds.length) await this.actor.deleteEmbeddedDocuments("Item", oldCompIds);

    // Résoudre les compétences raciales du nouveau peuple
    // Priorité : champ sur l'item > table de config (par nom français)
    const peupleKey     = CONFIG.AGONE.peupleNomVersKey[peupleItem.name];
    const compRaciales  = (nw.competencesRaciales?.length > 0)
      ? nw.competencesRaciales
      : (CONFIG.AGONE.peuplesData[peupleKey]?.competencesRaciales ?? []);

    // Créer les nouvelles compétences raciales (score 5)
    let newCompIds = [];
    if (compRaciales.length) {
      const VALID_ATTRS = ["agilite","force","perception","resistance","intelligence","volonte","charisma","creativite","melee","tir"];
      const itemsData = compRaciales.map(c => ({
        name:   c.specialite ? `${c.nom} (${c.specialite})` : c.nom,
        type:   "competence",
        system: {
          nom:         c.nom,
          domaine:     c.famille     ?? "",
          specialite:  c.specialite  ?? "",
          attributLie: VALID_ATTRS.includes(c.attributLie) ? c.attributLie : "agilite",
          score:       c.score       ?? 5,
        },
      }));
      const created = await this.actor.createEmbeddedDocuments("Item", itemsData);
      newCompIds = created.map(i => i.id);
    }

    // Retire l'ancien bonus appliqué, ajoute le nouveau bonus POSITIF uniquement.
    // Le max racial s'applique sur le score brut (acheté), soit total <= rawMax + posBonus.
    // Les malus (valeurs négatives) sont stockés dans peupleMalusEnAttente.
    const calcScoreCrea = (current, oldApplied, newPosBonus, newMax) => {
      let v = Math.max(0, (current ?? 0) - (oldApplied ?? 0) + newPosBonus);
      if (newMax != null) v = Math.min(v, newMax + newPosBonus);
      return v;
    };
    const posB = k => Math.max(0, nw[`${k}Bonus`] ?? 0);
    const negB = k => Math.min(0, nw[`${k}Bonus`] ?? 0);

    const update = {
      "system.peuple":                 peupleItem.name,
      "system.peupleId":               peupleItem.uuid,
      "system.tai":                    nw.taiBase ?? 0,
      "system.mvOverride":             nw.mvBase  ?? (CONFIG.AGONE.peuplesData[peupleKey]?.mvBase ?? null),
      "system.mvVol":                  nw.mvVolBase || (CONFIG.AGONE.peuplesData[peupleKey]?.mvVolBase ?? 0),
      "system.peupleCompetenceIds":    newCompIds,
      "system.peupleBonusApplique.corpsBonus":        Math.max(0, nw.corpsBonus   ?? 0),
      "system.peupleBonusApplique.espritBonus":       Math.max(0, nw.espritBonus  ?? 0),
      "system.peupleBonusApplique.ameBonus":          Math.max(0, nw.ameBonus     ?? 0),
      "system.peupleBonusApplique.agiliteBonus":      posB('agilite'),
      "system.peupleBonusApplique.forceBonus":        posB('force'),
      "system.peupleBonusApplique.perceptionBonus":   posB('perception'),
      "system.peupleBonusApplique.resistanceBonus":   posB('resistance'),
      "system.peupleBonusApplique.intelligenceBonus": posB('intelligence'),
      "system.peupleBonusApplique.volonteBonus":      posB('volonte'),
      "system.peupleBonusApplique.charismaBonus":     posB('charisma'),
      "system.peupleBonusApplique.creativiteBonus":   posB('creativite'),
      // Malus négatifs en attente (appliqués à la fin de création)
      "system.peupleMalusEnAttente.corpsBonus":        Math.min(0, nw.corpsBonus  ?? 0),
      "system.peupleMalusEnAttente.espritBonus":       Math.min(0, nw.espritBonus ?? 0),
      "system.peupleMalusEnAttente.ameBonus":          Math.min(0, nw.ameBonus    ?? 0),
      "system.peupleMalusEnAttente.agiliteBonus":      negB('agilite'),
      "system.peupleMalusEnAttente.forceBonus":        negB('force'),
      "system.peupleMalusEnAttente.perceptionBonus":   negB('perception'),
      "system.peupleMalusEnAttente.resistanceBonus":   negB('resistance'),
      "system.peupleMalusEnAttente.intelligenceBonus": negB('intelligence'),
      "system.peupleMalusEnAttente.volonteBonus":      negB('volonte'),
      "system.peupleMalusEnAttente.charismaBonus":     negB('charisma'),
      "system.peupleMalusEnAttente.creativiteBonus":   negB('creativite'),
      // Reset total : aspects remis à 0 + bonus racial positif
      "system.corps.score":  posB('corps'),
      "system.esprit.score": posB('esprit'),
      "system.ame.score":    posB('ame'),
      // Reset total : attributs remis à 0 + bonus racial positif
      "system.agilite.score":      posB('agilite'),
      "system.force.score":        posB('force'),
      "system.perception.score":   posB('perception'),
      "system.resistance.score":   posB('resistance'),
      "system.intelligence.score": posB('intelligence'),
      "system.volonte.score":      posB('volonte'),
      "system.charisma.score":     posB('charisma'),
      "system.creativite.score":   posB('creativite'),
      // Contraintes raciales persistantes
      "system.agilite.raceMin":      nw.agiliteMin      ?? null,
      "system.agilite.raceMax":      nw.agiliteMax      ?? null,
      "system.force.raceMin":        nw.forceMin        ?? null,
      "system.force.raceMax":        nw.forceMax        ?? null,
      "system.perception.raceMin":   nw.perceptionMin   ?? null,
      "system.perception.raceMax":   nw.perceptionMax   ?? null,
      "system.resistance.raceMin":   nw.resistanceMin   ?? null,
      "system.resistance.raceMax":   nw.resistanceMax   ?? null,
      "system.intelligence.raceMin": nw.intelligenceMin ?? null,
      "system.intelligence.raceMax": nw.intelligenceMax ?? null,
      "system.volonte.raceMin":      nw.volonteMin      ?? null,
      "system.volonte.raceMax":      nw.volonteMax      ?? null,
      "system.charisma.raceMin":     nw.charismaMin     ?? null,
      "system.charisma.raceMax":     nw.charismaMax     ?? null,
      "system.creativite.raceMin":   nw.creativiteMin   ?? null,
      "system.creativite.raceMax":   nw.creativiteMax   ?? null,
      // Réinitialisation des points de création
      "system.ptsCreationCarac.depense": 0,
      "system.ptsCreationComp.depense":  0,
      "system.saisonPerso":          nw.saisonDefaut || (CONFIG.AGONE.peuplesData[peupleKey]?.saisonDefaut ?? ""),
    };
    await this.actor.update(update);
    // Reset des scores de toutes les compétences non-raciales
    const compsToReset = this.actor.items.filter(i => i.type === "competence" && !newCompIds.includes(i.id));
    if (compsToReset.length) {
      await this.actor.updateEmbeddedDocuments("Item", compsToReset.map(i => ({
        _id: i.id, "system.score": 0, "system.exp": 0,
      })));
    }
    ui.notifications?.info(game.i18n.format("AGONE.PeupleApplique", { name: peupleItem.name }));
  }

  // Toggle tri des compétences
  async _onTriCompsToggle(event) {
    event.preventDefault();
    const cur = this.actor.getFlag("agone", "triComps") ?? "famille";
    await this.actor.setFlag("agone", "triComps", cur === "famille" ? "score" : "famille");
  }

  // Toggle tri des sorts
  async _onTriSortsToggle(event) {
    event.preventDefault();
    const cur = this.actor.getFlag("agone", "triSorts") ?? "type";
    await this.actor.setFlag("agone", "triSorts", cur === "type" ? "seuil" : "type");
  }

  // Montée de niveau (dépense XP)
  // ==============================
  async _onLevelUp(event) {
    event.preventDefault();
    const btn    = event.currentTarget;
    const type   = btn.dataset.type;
    const key    = btn.dataset.key;
    const itemId = btn.dataset.itemId;
    const xpCout = Number(btn.dataset.cout);
    const sd     = this.actor.system;

    // Vérification du max racial (caracs seulement — seuil sur score brut hors bonus)
    if (type === "carac") {
      const pKeyRace  = CONFIG.AGONE?.peupleNomVersKey?.[sd.peuple] ?? "humain";
      const pDatRace  = CONFIG.AGONE?.peuplesData?.[pKeyRace] ?? {};
      const maxRacial = pDatRace[`${key}Max`] ?? null;
      const bonusApp  = sd.peupleBonusApplique?.[`${key}Bonus`] ?? 0;
      const rawScore  = (sd[key]?.score ?? 0) - bonusApp;
      if (maxRacial !== null && rawScore >= maxRacial) {
        return ui.notifications.warn(game.i18n.localize("AGONE.MaxRacialAtteint"));
      }
    }

    // Vérification du plafond de score compétence (max 10)
    if (type === "competence") {
      const item0 = this.actor.items.get(itemId);
      if (item0 && (item0.system.score ?? 0) >= 10) {
        return ui.notifications.warn(game.i18n.localize("AGONE.MaxCompetenceAtteint"));
      }
    }

    const isCarac  = (type === "aspect" || type === "carac");
    const pool     = isCarac ? sd.ptsCreationCarac : sd.ptsCreationComp;
    const restePts = (pool?.max ?? 0) - (pool?.depense ?? 0);
    const creaCout = Number(btn.dataset.creaCout) || null;

    const item     = (type === "competence") ? this.actor.items.get(itemId) : null;
    const localExp = isCarac ? (sd[key]?.exp ?? 0) : (item?.system.exp ?? 0);

    // ── MODE CRÉATION ────────────────────────────────────────
    if (sd.modeCreation) {
      if (type === "aspect") {
        return ui.notifications.warn(game.i18n.localize("AGONE.AspectsBloquesCrea"));
      }
      if (creaCout === null) {
        return ui.notifications.warn(game.i18n.localize("AGONE.NiveauMaxCrea"));
      }
      if (restePts < creaCout) {
        return ui.notifications.warn(
          game.i18n.format("AGONE.PasAssezPtsCrea", { cout: creaCout, actuel: restePts })
        );
      }
      if (isCarac) {
        await this.actor.update({
          [`system.${key}.score`]:          (sd[key].score ?? 0) + 1,
          "system.ptsCreationCarac.depense": (pool.depense ?? 0) + creaCout,
        });
      } else if (type === "competence") {
        if (!item) return;
        await Promise.all([
          item.update({ "system.score": item.system.score + 1 }),
          this.actor.update({ "system.ptsCreationComp.depense": (pool.depense ?? 0) + creaCout }),
        ]);
      }
      return;
    }

    // ── MODE XP NORMAL ───────────────────────────────────────
    const fromLocal   = Math.min(localExp, xpCout);
    const fromGeneral = xpCout - fromLocal;

    // XP insuffisants
    if (fromGeneral > sd.experience.courante) {
      const totalDispo = localExp + sd.experience.courante;
      // Si aucun XP disponible du tout → erreur directe
      if (sd.experience.courante === 0) {
        return ui.notifications.error(
          game.i18n.format("AGONE.PasAssezXP", { cout: xpCout, actuel: totalDispo })
        );
      }
      // Sinon, propose de verser les XP disponibles en réserve locale
      const aVerser = sd.experience.courante;
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        title:   game.i18n.localize("AGONE.XPInsuffisants"),
        content: `<p>${game.i18n.format("AGONE.PasAssezXPReserve", {
          cout:    xpCout,
          actuel:  totalDispo,
          reserve: aVerser
        })}</p>`
      });
      if (!confirmed) return;
      if (isCarac) {
        await this.actor.update({
          [`system.${key}.exp`]:           localExp + aVerser,
          "system.experience.courante":    0,
        });
      } else if (type === "competence" && item) {
        await Promise.all([
          item.update({ "system.exp": localExp + aVerser }),
          this.actor.update({ "system.experience.courante": 0 }),
        ]);
      }
      return;
    }

    if (isCarac) {
      await this.actor.update({
        [`system.${key}.score`]: (sd[key].score ?? 0) + 1,
        ...(fromLocal   > 0 ? { [`system.${key}.exp`]:       localExp - fromLocal                      } : {}),
        ...(fromGeneral > 0 ? { "system.experience.courante": sd.experience.courante - fromGeneral      } : {}),
        "system.experience.totale": (sd.experience.totale ?? 0) + xpCout,
      });
    } else if (type === "competence") {
      if (!item) return;
      const updates = [];
      updates.push(item.update({
        "system.score": item.system.score + 1,
        ...(fromLocal > 0 ? { "system.exp": localExp - fromLocal } : {}),
      }));
      updates.push(this.actor.update({
        ...(fromGeneral > 0 ? { "system.experience.courante": sd.experience.courante - fromGeneral } : {}),
        "system.experience.totale": (sd.experience.totale ?? 0) + xpCout,
      }));
      await Promise.all(updates);
    }
  }

  // ==============================
  // Rétrogradation (remboursement pts création ou XP)
  // ==============================
  async _onLevelDown(event) {
    event.preventDefault();
    const btn    = event.currentTarget;
    const type   = btn.dataset.type;
    const key    = btn.dataset.key;
    const itemId = btn.dataset.itemId;
    const sd     = this.actor.system;

    const item         = (type === "competence") ? this.actor.items.get(itemId) : null;
    const currentScore = (type === "competence") ? (item?.system.score ?? 0) : (sd[key]?.score ?? 0);

    if (currentScore <= 0) {
      return ui.notifications.warn(game.i18n.localize("AGONE.ScoreDejaZero"));
    }

    const tbl       = CONFIG.AGONE.tableAchatCreation ?? [0, 1, 2, 3, 4, 5, 7, 10, 14, 19, 25];
    const lastDelta = tbl.length >= 2 ? tbl[tbl.length - 1] - tbl[tbl.length - 2] : 1;
    const creaDelta = (s) => s + 1 < tbl.length ? tbl[s + 1] - tbl[s] : lastDelta + (s - (tbl.length - 2));
    const m         = CONFIG.AGONE.xpMultipliers ?? { aspect: 7, carac: 5, competence: 5 };

    // ── MODE CRÉATION ────────────────────────────────────────
    if (sd.modeCreation) {
      if (type === "aspect") {
        return ui.notifications.warn(game.i18n.localize("AGONE.AspectsBloquesCrea"));
      }
      const pool   = (type === "carac") ? sd.ptsCreationCarac : sd.ptsCreationComp;
      const bonus  = (type === "carac") ? (sd.peupleBonusApplique?.[`${key}Bonus`] ?? 0) : 0;
      const rawScore = Math.max(0, currentScore - bonus);

      if (rawScore <= 0) {
        return ui.notifications.warn(game.i18n.localize("AGONE.RemboursementImpossible"));
      }
      const remboursement = creaDelta(rawScore - 1);

      if (type === "carac") {
        await this.actor.update({
          [`system.${key}.score`]:           currentScore - 1,
          "system.ptsCreationCarac.depense": Math.max(0, (pool.depense ?? 0) - remboursement),
        });
      } else if (type === "competence" && item) {
        await Promise.all([
          item.update({ "system.score": currentScore - 1 }),
          this.actor.update({ "system.ptsCreationComp.depense": Math.max(0, (pool.depense ?? 0) - remboursement) }),
        ]);
      }
      return;
    }

    // ── MODE XP NORMAL ───────────────────────────────────────
    const mult            = type === "aspect" ? m.aspect : type === "carac" ? m.carac : m.competence;
    const xpRemboursement = currentScore * mult;
    const isCaracOrAspect = (type === "carac" || type === "aspect");

    if (isCaracOrAspect) {
      await this.actor.update({
        [`system.${key}.score`]:       currentScore - 1,
        "system.experience.courante":  (sd.experience.courante ?? 0) + xpRemboursement,
        "system.experience.totale":    Math.max(0, (sd.experience.totale ?? 0) - xpRemboursement),
      });
    } else if (type === "competence" && item) {
      await Promise.all([
        item.update({ "system.score": currentScore - 1 }),
        this.actor.update({
          "system.experience.courante": (sd.experience.courante ?? 0) + xpRemboursement,
          "system.experience.totale":   Math.max(0, (sd.experience.totale ?? 0) - xpRemboursement),
        }),
      ]);
    }
  }

  // ==============================
  // Montée de niveau d'un Danseur (dépense XP danseur)
  // ==============================
  async _onLevelUpDanseur(event) {
    event.preventDefault();
    const btn    = event.currentTarget;
    const itemId = btn.dataset.itemId;
    const stat   = btn.dataset.stat;
    const cout   = Number(btn.dataset.cout);
    const danseur = this.actor.items.get(itemId);
    if (!danseur) return;

    const xpActuel = danseur.system.experience ?? 0;
    if (xpActuel < cout) {
      return ui.notifications.error(
        game.i18n.format("AGONE.PasAssezXPDanseur", { cout, actuel: xpActuel, nom: danseur.name })
      );
    }
    const label = btn.dataset.label ?? stat;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      title:   game.i18n.localize("AGONE.MonterNiveauDanseur"),
      content: `<p>${game.i18n.format("AGONE.ConfirmerLevelUpDanseur", { nom: danseur.name, stat: label, cout })}</p>`
    });
    if (!confirmed) return;

    await danseur.update({
      [`system.${stat}`]:       (danseur.system[stat] ?? 0) + 1,
      "system.experience":      xpActuel - cout,
    });
  }

  // ==============================
  // Envoyer manœuvre/botte dans le chat
  // ==============================
  async _onChatManoeuvre(event) {
    event.preventDefault();
    const id   = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(id);
    if (item) await item.toChat();
  }

  // ==============================
  // Envoyer pouvoir de flamme dans le chat
  // ==============================
  async _onChatPouvoir(event) {
    event.preventDefault();
    const id   = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(id);
    if (item) await item.toChat();
  }

  // ==============================
  // Danseur — +/− niveau en mode création
  // ==============================
  async _onDanseurNiveau(event, delta) {
    event.preventDefault();
    const btn     = event.currentTarget;
    const itemId  = btn.dataset.itemId;
    const stat    = btn.dataset.stat;          // ex. "memoireNiveau"
    const danseur = this.actor.items.get(itemId);
    if (!danseur) return;
    const current = danseur.system[stat] ?? 1;
    const next    = Math.max(1, Math.min(7, current + delta));
    if (next === current) return;
    // Vérifier les pts restants si montée
    if (delta > 0 && (danseur.system.ptsCreationRestants ?? 0) <= 0) {
      return ui.notifications.warn(game.i18n.localize("AGONE.PasAssezPtsCrea") || "Plus de points de création disponibles.");
    }
    await danseur.update({ [`system.${stat}`]: next });
  }

  // ==============================
  // Danseur — valider la création
  // ==============================
  async _onValiderCreationDanseur(event) {
    event.preventDefault();
    const id      = event.currentTarget.dataset.itemId;
    const danseur = this.actor.items.get(id);
    if (!danseur) return;
    const sd = danseur.system;
    if ((sd.ptsCreationRestants ?? 0) < 0) {
      return ui.notifications.warn(game.i18n.localize("AGONE.DanseurPtsDeficit"));
    }
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      title:   game.i18n.localize("AGONE.DanseurValiderCrea"),
      content: `<p>${game.i18n.format("AGONE.DanseurValiderCreaConfirm", { nom: danseur.name })}</p>`
    });
    if (!confirmed) return;
    // Initialise les valeurs courantes = max
    await danseur.update({
      "system.modeCreation":      false,
      "system.memoireActuelle":   sd.memoireMax,
      "system.enduranceActuelle": sd.enduranceMax,
    });
  }

  // ==============================
  // Danseur — réactiver le mode création
  // ==============================
  async _onReactiverCreationDanseur(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.itemId;
    const danseur = this.actor.items.get(id);
    if (!danseur) return;
    await danseur.update({ "system.modeCreation": true });
  }

  // ==============================
  // Danseur — édition inline stat courante (memoireActuelle, enduranceActuelle, experience)
  // ==============================
  async _onDanseurStatEdit(event) {
    event.preventDefault();
    const input   = event.currentTarget;
    const itemId  = input.dataset.itemId;
    const field   = input.dataset.field;
    const value   = Number(input.value);
    const danseur = this.actor.items.get(itemId);
    if (!danseur || !field) return;
    await danseur.update({ [`system.${field}`]: value });
  }

  // ==============================
  // Démon — valider la création
  // ==============================
  async _onValiderCreationDemon(event) {
    event.preventDefault();
    const id    = event.currentTarget.dataset.itemId;
    const demon = this.actor.items.get(id);
    if (!demon) return;
    await demon.update({ "system.modeCreation": false });
  }

  // ==============================
  // Démon — réactiver le mode création
  // ==============================
  async _onReactiverCreationDemon(event) {
    event.preventDefault();
    const id    = event.currentTarget.dataset.itemId;
    const demon = this.actor.items.get(id);
    if (!demon) return;
    await demon.update({ "system.modeCreation": true });
  }

  // ==============================
  // Démon — édition inline d'un champ
  // ==============================
  async _onDemonStatEdit(event) {
    event.preventDefault();
    const input  = event.currentTarget;
    const itemId = input.dataset.itemId;
    const field  = input.dataset.field;
    const value  = Number(input.value);
    const demon  = this.actor.items.get(itemId);
    if (!demon || !field) return;
    await demon.update({ [`system.${field}`]: value });
  }

  // Mode création — activer/désactiver
  // ==============================
  async _onToggleCreation(event) {
    event.preventDefault();
    await this.actor.update({ "system.modeCreation": !this.actor.system.modeCreation });
  }

  // Toggle visibilité boutons level-up
  // ==============================
  async _onToggleLevelUp(event) {
    event.preventDefault();
    await this.actor.update({ "system.modeLevelUp": !this.actor.system.modeLevelUp });
  }

  // Mode création — reset caractéristiques
  // ==============================
  async _onResetCaracs(event) {
    event.preventDefault();
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      title:   game.i18n.localize("AGONE.ResetCreation"),
      content: `<p>${game.i18n.localize("AGONE.ResetCreationCaracConfirm")}</p>`
    });
    if (!confirmed) return;

    const sd = this.actor.system;
    const caracs  = ['agilite','force','perception','resistance','intelligence','volonte','charisma','creativite'];
    const aspects = ['corps','esprit','ame'];
    const upd = { "system.ptsCreationCarac.depense": 0 };

    for (const k of caracs) {
      const bonus = sd.peupleBonusApplique?.[`${k}Bonus`] ?? 0;
      upd[`system.${k}.score`] = Math.max(0, bonus);
    }
    for (const asp of aspects) {
      upd[`system.${asp}.score`] = 0;
    }

    await this.actor.update(upd);
    ui.notifications.info(game.i18n.localize("AGONE.ResetCreationDone"));
  }

  // Mode création — reset compétences
  // ==============================
  async _onResetComps(event) {
    event.preventDefault();
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      title:   game.i18n.localize("AGONE.ResetCreation"),
      content: `<p>${game.i18n.localize("AGONE.ResetCreationCompConfirm")}</p>`
    });
    if (!confirmed) return;

    await this.actor.update({ "system.ptsCreationComp.depense": 0 });

    const compUpdates = this.actor.items
      .filter(i => ['competence', 'manoeuvre'].includes(i.type))
      .map(i => ({ _id: i.id, "system.score": 0, "system.exp": 0 }));
    if (compUpdates.length) await this.actor.updateEmbeddedDocuments("Item", compUpdates);

    ui.notifications.info(game.i18n.localize("AGONE.ResetCreationDone"));
  }

  // Mode création — valider (fin de création)
  // ==============================
  async _onValiderCreation(event) {
    event.preventDefault();
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      title:   game.i18n.localize("AGONE.ValiderCreation"),
      content: `<p>${game.i18n.localize("AGONE.ValiderCreationConfirm")}</p>`
    });
    if (!confirmed) return;

    // Appliquer les malus raciaux en attente sur les scores
    const sd     = this.actor.system;
    const malus  = sd.peupleMalusEnAttente ?? {};
    const caracs = ['agilite','force','perception','resistance','intelligence','volonte','charisma','creativite'];
    const aspects = ['corps','esprit','ame'];
    const upd = { "system.modeCreation": false };

    for (const k of caracs) {
      const m = malus[`${k}Bonus`] ?? 0;
      if (m !== 0) {
        upd[`system.${k}.score`]                          = Math.max(0, (sd[k]?.score ?? 0) + m);
        upd[`system.peupleBonusApplique.${k}Bonus`]       = (sd.peupleBonusApplique?.[`${k}Bonus`] ?? 0) + m;
        upd[`system.peupleMalusEnAttente.${k}Bonus`]      = 0;
      }
    }
    for (const asp of aspects) {
      const m = malus[`${asp}Bonus`] ?? 0;
      if (m !== 0) {
        upd[`system.${asp}.score`]                         = Math.max(0, (sd[asp]?.score ?? 0) + m);
        upd[`system.peupleBonusApplique.${asp}Bonus`]      = (sd.peupleBonusApplique?.[`${asp}Bonus`] ?? 0) + m;
        upd[`system.peupleMalusEnAttente.${asp}Bonus`]     = 0;
      }
    }

    await this.actor.update(upd);
    ui.notifications.info(game.i18n.localize("AGONE.CreationTerminee"));
  }

  // Édition inline
  // ==============================
  async _onInlineEdit(event) {
    event.preventDefault();
    const el     = event.currentTarget;
    const itemId = el.dataset.itemId;
    const field  = el.dataset.field;
    const value  = el.type === "checkbox" ? el.checked : (isNaN(el.value) ? el.value : Number(el.value));
    const item   = this.actor.items.get(itemId);
    if (item && field) await item.update({ [field]: value });
  }

  // ==============================
  // Drop d'acteur (companions)
  // ==============================
  /** @override */
  async _onDropActor(event, data) {
    if (event.target?.closest(".companions-drop-zone")) {
      const uuid = data.uuid;
      if (!uuid || uuid === this.actor.uuid) return;
      const current = this.actor.getFlag("agone", "companions") ?? [];
      if (current.includes(uuid)) return;
      await this.actor.setFlag("agone", "companions", [...current, uuid]);
      return;
    }
    // Pas d'autre comportement de drop d'acteur par défaut
  }

  // ==============================
  // Compagnons — ouvrir / retirer
  // ==============================
  async _onOpenCompanion(event) {
    event.preventDefault();
    const uuid  = event.currentTarget.dataset.uuid;
    const actor = await fromUuid(uuid).catch(() => null);
    if (actor) actor.sheet.render(true);
  }

  async _onRemoveCompanion(event) {
    event.preventDefault();
    const uuid    = event.currentTarget.dataset.uuid;
    const current = this.actor.getFlag("agone", "companions") ?? [];
    await this.actor.setFlag("agone", "companions", current.filter(u => u !== uuid));
  }

  // ==============================
  // Paramètres — visibilité onglets
  // ==============================
  async _onToggleTabVisibility(event) {
    const tab     = event.currentTarget.dataset.tab;
    const checked = event.currentTarget.checked;
    // Si l'onglet actif est masqué, repasser sur Attributs
    if (!checked && this._tabs?.[0]?.active === tab) {
      this._tabs[0].activate("attributs");
    }
    const current = this.actor.getFlag("agone", "tabsVisible") ?? {};
    await this.actor.setFlag("agone", "tabsVisible", { ...current, [tab]: checked });
  }
}
