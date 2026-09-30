/**
 * Mode de jet (public, MJ, aveugle, privé) compatible Foundry v13 et v14.
 * v14 remplace le réglage `core.rollMode` par `core.messageMode` (valeurs public/gm/blind/self)
 * et `ChatMessage.applyRollMode` par `ChatMessage.applyMode`. Le système manipule toujours les
 * noms historiques (publicroll, gmroll, blindroll, selfroll), stockés tels quels dans les drapeaux.
 */

const VERS_MESSAGE = { publicroll: "public", gmroll: "gm", blindroll: "blind", selfroll: "self" };
const VERS_HISTORIQUE = { public: "publicroll", gm: "gmroll", blind: "blindroll", self: "selfroll" };

/** Nom historique d'un mode, quelle que soit la forme reçue (null si vide). */
export function modeHistorique(mode) {
  if (!mode) return null;
  return VERS_HISTORIQUE[mode] ?? mode;
}

/** Nom v14 (messageMode) d'un mode, quelle que soit la forme reçue (null si vide). */
export function modeMessage(mode) {
  if (!mode) return null;
  return VERS_MESSAGE[mode] ?? mode;
}

/** Vrai si Foundry expose les modes de message v14. */
function estV14() {
  return typeof ChatMessage.applyMode === "function" && game.settings.settings.has("core.messageMode");
}

/** Mode de jet actuellement choisi dans le chat, sous son nom historique. */
export function modeJetCourant() {
  const mode = estV14() ? game.settings.get("core", "messageMode") : game.settings.get("core", "rollMode");
  return modeHistorique(mode) ?? "publicroll";
}

/** Applique un mode (nom historique ou v14 ; mode courant par défaut) aux données d'un message. */
export function appliquerModeJet(chatData, mode = modeJetCourant()) {
  if (estV14()) return ChatMessage.applyMode(chatData, modeMessage(mode));
  return ChatMessage.applyRollMode(chatData, modeHistorique(mode));
}
