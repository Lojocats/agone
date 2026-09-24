/**
 * Aides DOM natives (remplacent la délégation d'évènements jQuery).
 */

/**
 * Écouteur délégué : `handler` est appelé pour tout évènement `type` dont la cible
 * est (ou descend de) un élément correspondant à `selector` à l'intérieur de `root`.
 *
 * Comme avec jQuery, `event.currentTarget` désigne l'élément correspondant au sélecteur
 * (et non `root`) ; il est aussi passé en second argument.
 *
 * @param {HTMLElement} root
 * @param {string} type                 Type d'évènement ("click", "change", "input"…)
 * @param {string} selector             Sélecteur CSS des éléments ciblés
 * @param {(event: Event, target: HTMLElement) => any} handler
 * @param {object} [options]
 * @param {AbortSignal} [options.signal] Retire l'écouteur quand le signal est déclenché
 */
export function delegate(root, type, selector, handler, { signal } = {}) {
  root.addEventListener(type, event => {
    const target = event.target instanceof Element ? event.target.closest(selector) : null;
    if (!target || !root.contains(target)) return;
    return handler(withCurrentTarget(event, target), target);
  }, { signal });
}

/**
 * Renvoie une vue de `event` dont `currentTarget` vaut `target`.
 * Les méthodes (preventDefault, stopPropagation…) restent liées à l'évènement d'origine.
 */
function withCurrentTarget(event, target) {
  return new Proxy(event, {
    get(ev, prop) {
      if (prop === "currentTarget") return target;
      const value = Reflect.get(ev, prop, ev);
      return typeof value === "function" ? value.bind(ev) : value;
    },
  });
}

/**
 * Attache `handler` directement à chaque élément de `root` correspondant à `selector`.
 * À utiliser dans `_onRender` pour des éléments recréés à chaque rendu.
 */
export function listen(root, selector, type, handler) {
  root.querySelectorAll(selector).forEach(el => el.addEventListener(type, handler));
}
