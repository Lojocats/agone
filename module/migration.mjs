/**
 * Agone – migrations de données du monde.
 *
 * Chaque entrée de MIGRATIONS est appliquée une seule fois, dans l'ordre, lorsque
 * la version enregistrée dans le paramètre `systemMigrationVersion` est inférieure
 * à la sienne. Pour ajouter une migration : ajouter une entrée { version, label, run }
 * avec la version du système qui introduit le changement de données.
 */
import { EFFET_PREFIX, effetsDepuisTable } from "./helpers/effets.mjs";
import { attributBarreSante, correctionsBarres } from "./helpers/jeton.mjs";
import { estMJActif } from "./helpers/mj.mjs";
import { lienDanseurDepuisNom } from "./helpers/danseurs.mjs";
import { armureStockeeAReinitialiser } from "./helpers/armure.mjs";

/** Texte brut (sans balise) → paragraphes HTML ; `null` si le texte est déjà du HTML ou vide. */
export function texteEnHTML(texte) {
  if (typeof texte !== "string" || !texte.trim() || /<[a-z][\s\S]*>/i.test(texte)) return null;
  const echappe = foundry.utils.escapeHTML ?? (t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
  return texte.trim().split(/\n\s*\n/)
    .map(p => `<p>${echappe(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Tous les items du monde : items du monde, des acteurs et des tokens non liés. */
function* tousLesItems() {
  yield* game.items ?? [];
  for (const actor of game.actors ?? []) yield* actor.items;
  for (const scene of game.scenes ?? []) {
    for (const token of scene.tokens) {
      if (!token.actorLink && token.actor) yield* token.actor.items;
    }
  }
}

/** Tous les acteurs du monde : acteurs du monde et acteurs des tokens non liés. */
function* tousLesActeurs() {
  yield* game.actors ?? [];
  for (const scene of game.scenes ?? []) {
    for (const token of scene.tokens) {
      if (!token.actorLink && token.actor) yield token.actor;
    }
  }
}

const MIGRATIONS = [
  {
    version: "1.8.5",
    label: "Barre PdV des tokens prototypes",
    async run() {
      const updates = [];
      // L'attribut d'une barre est relatif à actor.system : « pdv » (« densite » pour un démon).
      // Cette migration écrivait « system.pdv », que Foundry ne sait pas résoudre : la valeur
      // correcte est posée ici, et la migration 1.11.0 répare les mondes déjà migrés.
      for (const actor of game.actors ?? []) {
        if (actor.prototypeToken?.bar1?.attribute) continue;
        updates.push({
          _id: actor.id,
          "prototypeToken.bar1.attribute": attributBarreSante(actor.type),
          "prototypeToken.displayBars":    CONST.TOKEN_DISPLAY_MODES?.OWNER ?? 40,
          "prototypeToken.actorLink":      true,
        });
      }
      if (updates.length) await Actor.updateDocuments(updates);
    },
  },
  {
    version: "1.9.0",
    label: "Effets des avantages & défauts en ActiveEffect",
    async run() {
      // Les bonus des avantages venaient d'une table indexée par nom ; ils sont désormais
      // portés par des ActiveEffect sur l'item (modifiables depuis sa fiche).
      const sansEffetAgone = item => item.type === "don"
        && !item.effects.some(e => e.changes.some(c => c.key?.startsWith(EFFET_PREFIX)));
      const creer = async item => {
        const effets = effetsDepuisTable(item.name, item.img);
        if (effets.length) await item.createEmbeddedDocuments("ActiveEffect", effets);
      };
      for (const item of [...tousLesItems()].filter(sansEffetAgone)) await creer(item);
    },
  },
  {
    version: "1.9.1",
    label: "Descriptions des items en texte riche (HTML)",
    async run() {
      // Les descriptions saisies en texte brut gardent leurs retours à la ligne dans l'éditeur riche
      for (const item of tousLesItems()) {
        const update = {};
        for (const champ of ["description", "notes", "connivances"]) {
          const html = texteEnHTML(item.system[champ]);
          if (html) update[`system.${champ}`] = html;
        }
        if (Object.keys(update).length) await item.update(update);
      }
    },
  },
  {
    version: "1.11.0",
    label: "Barre de santé des tokens (attribut « pdv » ou « densite »)",
    async run() {
      // « system.pdv » n'est pas résolu par Foundry (chemin relatif à actor.system) : la barre
      // ne s'affichait pas. Tokens prototypes des acteurs, puis tokens placés dans les scènes.
      const majActeurs = correctionsBarres(
        [...game.actors ?? []].map(a => ({ id: a.id, attribut: a.prototypeToken?.bar1?.attribute, type: a.type })),
        "prototypeToken.bar1.attribute");
      if (majActeurs.length) await Actor.updateDocuments(majActeurs);

      for (const scene of game.scenes ?? []) {
        const majTokens = correctionsBarres(
          [...scene.tokens ?? []].map(t => ({
            id: t.id,
            attribut: t._source?.bar1?.attribute ?? t.bar1?.attribute,
            type: t.actor?.type ?? game.actors?.get(t.actorId)?.type,
          })),
          "bar1.attribute");
        if (majTokens.length) await scene.updateEmbeddedDocuments("Token", majTokens);
      }
    },
  },
  {
    version: "1.11.0",
    label: "Sorts des danseurs liés par identifiant, armures lues sur les items",
    async run() {
      const echecs = [];
      for (const actor of tousLesActeurs()) {
        try {
          // Sorts mémorisés : lien par id du danseur (danseurId) au lieu de son nom (danseurNom)
          const danseurs = actor.items.filter(i => i.type === "danseur");
          const majSorts = actor.items.filter(i => i.type === "sort")
            .map(sort => ({ sort, maj: lienDanseurDepuisNom(sort._source?.system ?? sort.system, danseurs) }))
            .filter(({ maj }) => maj)
            .map(({ sort, maj }) => ({ _id: sort.id, ...maj }));
          if (majSorts.length) await actor.updateEmbeddedDocuments("Item", majSorts);

          // Armure et bouclier : les copies stockées sur l'acteur (fantômes si l'item a été supprimé)
          // sont effacées, les valeurs sont désormais lues sur les items portés
          const majArmure = armureStockeeAReinitialiser(actor.type, actor._source?.system, actor.items);
          if (majArmure) await actor.update(majArmure);
        } catch (err) {
          console.warn(`Agone | Migration 1.11.0 : échec pour l'acteur ${actor.name}`, err);
          echecs.push(actor.name);
        }
      }
      // Les autres acteurs sont migrés ; l'échec fait rejouer la migration (idempotente) à la prochaine connexion
      if (echecs.length) throw new Error(`Acteurs non migrés : ${echecs.join(", ")}`);
    },
  },
];

/**
 * Enregistre le paramètre de version. À appeler dans le hook `init`.
 */
export function registerMigrationSettings() {
  game.settings.register("agone", "systemMigrationVersion", {
    scope: "world", config: false,
    type: String,
    default: "",
  });
}

/**
 * Exécute les migrations en attente. À appeler dans le hook `ready`.
 * Seul le client du MJ actif migre : deux MJ connectés ne migrent pas le monde en parallèle.
 */
export async function migrateWorld() {
  if (!estMJActif()) return;
  const current = game.settings.get("agone", "systemMigrationVersion");
  const pending = MIGRATIONS.filter(m => !current || foundry.utils.isNewerVersion(m.version, current));

  for (const [i, migration] of pending.entries()) {
    console.log(`Agone | Migration ${migration.version} : ${migration.label}`);
    try {
      await migration.run();
    } catch (err) {
      console.error(`Agone | Échec de la migration ${migration.version}`, err);
      ui.notifications.error(game.i18n.format("AGONE.Migration.Echec", { version: migration.version }), { permanent: true });
      return;
    }
    // Plusieurs migrations peuvent porter la même version : la version n'est enregistrée
    // qu'après la dernière, pour qu'un échec de l'une les fasse toutes rejouer (elles sont idempotentes)
    if (pending[i + 1]?.version !== migration.version) {
      await game.settings.set("agone", "systemMigrationVersion", migration.version);
    }
  }

  if (pending.length) ui.notifications.info(game.i18n.format("AGONE.Migration.Terminee", { version: game.system.version }));
  if (game.settings.get("agone", "systemMigrationVersion") !== game.system.version) {
    await game.settings.set("agone", "systemMigrationVersion", game.system.version);
  }
}
