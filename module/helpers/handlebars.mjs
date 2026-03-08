/**
 * Helpers Handlebars pour le système Agone
 */
export function registerHandlebarsHelpers() {

  Handlebars.registerHelper("select", function(value, options) {
    const wrapper = document.createElement("select");
    wrapper.innerHTML = options.fn(this);
    wrapper.querySelector(`option[value="${value}"]`)?.setAttribute("selected", "selected");
    return wrapper.innerHTML;
  });

  Handlebars.registerHelper("agone_select", function(selected, options) {
    const escapedValue = RegExp.escape !== undefined
      ? RegExp.escape(selected)
      : selected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rgx = new RegExp(`value=[\"']${escapedValue}[\"']`);
    const html = options.fn(this);
    return html.replace(rgx, "$& selected");
  });

  Handlebars.registerHelper("times", function(n, block) {
    let result = "";
    for (let i = 0; i < n; ++i) result += block.fn(i);
    return result;
  });

  Handlebars.registerHelper("add", function(a, b) {
    return (Number(a) + Number(b));
  });

  Handlebars.registerHelper("sub", function(a, b) {
    return (Number(a) - Number(b));
  });

  Handlebars.registerHelper("max", function(a, b) {
    return Math.max(Number(a), Number(b));
  });

  Handlebars.registerHelper("ternary", function(condition, valTrue, valFalse) {
    return condition ? valTrue : valFalse;
  });

  Handlebars.registerHelper("ifGT", function(a, b, opts) {
    return Number(a) > Number(b) ? opts.fn(this) : opts.inverse(this);
  });

  Handlebars.registerHelper("ifLT", function(a, b, opts) {
    return Number(a) < Number(b) ? opts.fn(this) : opts.inverse(this);
  });

  Handlebars.registerHelper("checked", function(value) {
    return value ? "checked" : "";
  });

  Handlebars.registerHelper("localize", function(key) {
    return game.i18n.localize(key);
  });

  Handlebars.registerHelper("concat", function(...args) {
    args.pop(); // remove options object
    return args.join("");
  });

  Handlebars.registerHelper("json", function(obj) {
    return JSON.stringify(obj);
  });
}
