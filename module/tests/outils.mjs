/**
 * Outils communs des tests Quench.
 */

/** Délai des tests qui créent des documents ou rendent des fiches (Mocha : 2 s par défaut). */
export const DELAI = 15000;

/** Personnage de test : caractéristiques et aspects distincts pour vérifier les formules. */
export const PERSO = {
  modeCreation: false,
  typeMage    : "eclipsiste",
  corps       : { score: 3, noir: 1 },
  esprit      : { score: 2, noir: 0 },
  ame         : { score: 4, noir: 1 },
  agilite     : { score: 4 }, force: { score: 3 }, perception: { score: 2 }, resistance: { score: 3 },
  intelligence: { score: 3 }, volonte: { score: 2 }, charisma: { score: 2 }, creativite: { score: 5 },
};

/** PNJ de test (caractéristiques numériques et aspects). */
export const PNJ = {
  agilite: 4, force: 3, perception: 2, resistance: 3, intelligence: 3, volonte: 2, charisma: 2, creativite: 5,
  corps: 2, esprit: 1, ame: 3, typeMage: "jorniste",
};

/** Partie d'un jet hors dés : total − somme des dés (la valeur ajoutée par les formules). */
export const horsDes = roll => roll.total - roll.dice.reduce((s, d) => s + d.total, 0);

/** Attend qu'une condition soit vraie (rendus et mises à jour asynchrones). */
export async function attendre(condition, message = "condition", delai = 5000) {
  const debut = Date.now();
  while (!(await condition())) {
    if (Date.now() - debut > delai) throw new Error(`Délai dépassé : ${message}`);
    await new Promise(r => setTimeout(r, 50));
  }
}

/** Évènement minimal pour appeler directement un gestionnaire de fiche. */
export function evenement(dataset = {}, extra = {}) {
  return { preventDefault() {}, stopPropagation() {}, currentTarget: { dataset, ...extra } };
}

/**
 * Bac à documents de test : acteurs dans un dossier temporaire, items du monde, acteurs créés
 * indirectement (démons des Ténèbres). `nettoyer()` supprime tout, messages de chat compris.
 */
export function bac() {
  const docs = [];
  let dossier = null;
  return {
    async acteur(type, system = {}, data = {}) {
      dossier ??= await Folder.create({ name: "Agone — tests Quench", type: "Actor" });
      const actor = await Actor.create({ name: `Test ${type}`, type, folder: dossier.id, system, ...data });
      docs.push(actor);
      return actor;
    },
    async item(data) {
      const item = await Item.create(data);
      docs.push(item);
      return item;
    },
    suivre(doc) { if (doc) docs.push(doc); return doc; },
    async nettoyer() {
      const ids = new Set(docs.filter(d => d.documentName === "Actor").map(d => d.id));
      const messages = game.messages.filter(m => ids.has(m.speaker?.actor));
      if (messages.length) await ChatMessage.deleteDocuments(messages.map(m => m.id));
      for (const doc of docs.reverse()) {
        if (doc.documentName === "Actor") {
          for (const uuid of doc.getFlag?.("agone", "demons") ?? []) await (await fromUuid(uuid))?.delete();
        }
        if (!doc.pack && game.collections.get(doc.documentName)?.has(doc.id)) await doc.delete();
      }
      await dossier?.delete();
    },
  };
}
