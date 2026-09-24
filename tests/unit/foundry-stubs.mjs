/**
 * Globales Foundry minimales pour tester hors Foundry la logique pure du système.
 * À importer en premier dans chaque fichier de test.
 */
const racine = new URL("../../", import.meta.url);

/** URL d'un fichier du système (pour les imports dynamiques et la lecture de fichiers). */
export const fichier = chemin => new URL(chemin, racine);

// foundry.utils : fonctions utilitaires utilisées par le code testé
globalThis.foundry = {
  utils: {
    escapeHTML: texte => String(texte).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" })[c]),
  },
};

globalThis.CONST = { ACTIVE_EFFECT_MODES: { CUSTOM: 0, MULTIPLY: 1, ADD: 2, DOWNGRADE: 3, UPGRADE: 4, OVERRIDE: 5 } };

const reglages = new Map([["agone.domainesArtsCustom", []]]);
globalThis.game = {
  i18n: {
    localize: cle => cle,
    format  : (cle, data) => `${cle}${JSON.stringify(data)}`,
  },
  settings: {
    get: (ns, cle) => reglages.get(`${ns}.${cle}`),
    set: (ns, cle, valeur) => reglages.set(`${ns}.${cle}`, valeur),
  },
};

const { AGONE } = await import(fichier("module/helpers/config.mjs"));
globalThis.CONFIG = { AGONE };

/** Faux item Foundry : { name, type, system } + quelques champs utiles aux fonctions testées. */
export function item(name, type, system = {}, extra = {}) {
  return { name, type, system, id: extra.id ?? name, ...extra };
}

/** Faux acteur minimal pour les fonctions qui lisent des flags. */
export function acteur(flags = {}) {
  return { getFlag: (ns, cle) => flags[cle] };
}
