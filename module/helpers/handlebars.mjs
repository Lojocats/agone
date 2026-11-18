/**
 * Helpers Handlebars pour le système Agone.
 * Seuls les helpers appelés par les templates sont enregistrés (vérifié par fichiers.test.mjs) ;
 * localize, eq, lt, gt, gte, lookup… viennent de Foundry ou de Handlebars.
 */
export function registerHandlebarsHelpers() {

  Handlebars.registerHelper("ifGT", function(a, b, opts) {
    return Number(a) > Number(b) ? opts.fn(this) : opts.inverse(this);
  });

  Handlebars.registerHelper("multiply", function(a, b) {
    return Number(a) * Number(b);
  });

  // Identique au helper « or » du cœur de Foundry ; conservé pour ne pas dépendre de sa présence
  Handlebars.registerHelper("or", function(...args) {
    args.pop(); // options object
    return args.some(Boolean);
  });
}
