import js from "@eslint/js";
import globals from "globals";

// Globales fournies par Foundry VTT à l'exécution
const foundryGlobals = Object.fromEntries([
  "foundry", "game", "CONFIG", "CONST", "ui", "Hooks", "canvas", "Handlebars", "PIXI",
  "Actor", "Item", "ActiveEffect", "ChatMessage", "Combat", "Folder", "Roll", "Token",
  "fromUuid", "fromUuidSync", "FXMASTER", "quench",
].map(name => [name, "readonly"]));

export default [
  js.configs.recommended,
  {
    files: ["module/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...foundryGlobals },
    },
    rules: {
      // Les signatures de gestionnaires (event, target, options…) restent explicites
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
      // `catch {}` volontaire : fonctionnalités optionnelles (FXMaster, sélection de texte…)
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
];
