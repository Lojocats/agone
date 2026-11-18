import { cleBarreJeton } from "../helpers/derivations.mjs";

/**
 * AgoneTokenDocument — barres de santé modifiables depuis le HUD du jeton.
 *
 * Le cœur ne rend une barre modifiable que si `<attribut>.value` est un champ du schéma ;
 * ici la valeur stockée s'appelle `valeur` (`value` n'est qu'un alias dérivé), et l'écriture
 * passe par AgoneActor#modifyTokenAttribute.
 */
export class AgoneTokenDocument extends TokenDocument {
  /** @override */
  getBarAttribute(barName, options = {}) {
    const barre = super.getBarAttribute(barName, options);
    if (barre?.type === "bar" && cleBarreJeton(barre.attribute)) barre.editable = true;
    return barre;
  }
}
