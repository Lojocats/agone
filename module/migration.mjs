/**
 * Agone – migrations de données du monde.
 *
 * Chaque entrée de MIGRATIONS est appliquée une seule fois, dans l'ordre, lorsque
 * la version enregistrée dans le paramètre `systemMigrationVersion` est inférieure
 * à la sienne. Pour ajouter une migration : ajouter une entrée { version, label, run }
 * avec la version du système qui introduit le changement de données.
 */
import { EFFET_PREFIX, effetsDepuisTable } from "./helpers/effets.mjs";

/** Texte brut (sans balise) → paragraphes HTML ; `null` si le texte est déjà du HTML ou vide. */
function texteEnHTML(texte) {
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

const MIGRATIONS = [
  {
    version: "1.8.5",
    label: "Barre PdV des tokens prototypes",
    async run() {
      const updates = [];
      for (const actor of game.actors ?? []) {
        const bar = actor.prototypeToken?.bar1?.attribute;
        if (bar && bar !== "pdv") continue;
        updates.push({
          _id: actor.id,
          "prototypeToken.bar1.attribute": "system.pdv",
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
 * Exécute les migrations en attente. À appeler dans le hook `ready`, MJ uniquement.
 */
export async function migrateWorld() {
  if (!game.user.isGM) return;
  const current = game.settings.get("agone", "systemMigrationVersion");
  const pending = MIGRATIONS.filter(m => !current || foundry.utils.isNewerVersion(m.version, current));

  for (const migration of pending) {
    console.log(`Agone | Migration ${migration.version} : ${migration.label}`);
    try {
      await migration.run();
    } catch (err) {
      console.error(`Agone | Échec de la migration ${migration.version}`, err);
      ui.notifications.error(game.i18n.format("AGONE.Migration.Echec", { version: migration.version }), { permanent: true });
      return;
    }
    await game.settings.set("agone", "systemMigrationVersion", migration.version);
  }

  if (pending.length) ui.notifications.info(game.i18n.format("AGONE.Migration.Terminee", { version: game.system.version }));
  if (game.settings.get("agone", "systemMigrationVersion") !== game.system.version) {
    await game.settings.set("agone", "systemMigrationVersion", game.system.version);
  }
}
