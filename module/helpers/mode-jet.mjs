/**
 * Mode de jet (public, MJ, aveugle, privé).
 * Foundry v14 lit le réglage `core.messageMode` (valeurs public/gm/blind/self) et applique un mode
 * avec `ChatMessage.applyMode`. Le système manipule toujours les noms historiques (publicroll,
 * gmroll, blindroll, selfroll), stockés tels quels dans les drapeaux des messages.
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

/** Mode de jet actuellement choisi dans le chat, sous son nom historique. */
export function modeJetCourant() {
  return modeHistorique(game.settings.get("core", "messageMode")) ?? "publicroll";
}

/** Applique un mode (nom historique ou v14 ; mode courant par défaut) aux données d'un message. */
export function appliquerModeJet(chatData, mode = modeJetCourant()) {
  return ChatMessage.applyMode(chatData, modeMessage(mode));
}
