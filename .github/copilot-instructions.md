# Copilot instructions — Agone (Foundry VTT system)

Unofficial Foundry VTT v13–v14 game system for the French TTRPG **Agone**. Code, comments,
identifiers and game data are in **French** (`personnage`, `peine`, `bienfait`, `ténèbres`…);
keep them in French. No build step: files under `module/`, `templates/`, `css/`, `lang/` are
served as-is. `npm run lint` and `npm test` are the checks CI runs.

## Commit messages

Commit messages are written in **English**, even though the code is in French.

**Summary line**
- Imperative mood, capitalized, no trailing period, 72 characters max:
  `Add boon effects to Perfidie pains`, `Fix double initiative roll in combat tracker`.
- A commit that bumps `version` in `system.json` for a release starts with
  `Release X.Y.Z:` followed by the main themes, comma-separated:
  `Release 1.9.4: limited sheet view, editable boons, smarter browser search`.
  X.Y.Z must be the new `system.json` version. Do not mention tagging: once pushed to
  `main`, the `auto-tag.yml` workflow runs lint and tests, then creates the `vX.Y.Z`
  tag and the GitHub release by itself.
- Name French game or code terms as they are, in backticks when they are identifiers
  (`bienfaitAcquis`, `AgoneBrowser`), without translating them.

**Body** (after one blank line)
- A short bullet list (`- `), one bullet per user-visible change, wrapped at ~72 columns.
- Group by area when there are several: sheets, browsers, calendar, combat tracker,
  effects, localization, tests, tooling.
- Say *what changed for the user* and *why*, not a file-by-file list. Mention fixed bugs
  with their symptom ("players could edit fields on sheets they only observe").
- Mention tests and CI changes last, in one bullet.
- If `CHANGELOG.md` has a matching entry, keep the commit consistent with it (the
  changelog itself is in French).

**Do not**
- Do not describe unchanged files or generated content (`packs/` is generated and ignored).
- Do not add emojis, ticket prefixes (`feat:`, `fix:`) or co-author trailers.
- Do not summarize every lang key or CSS rule; say "fr/en localization" or "styles".

**Example**

```
Release 1.9.4: limited sheet view, editable boons, smarter search

- Sheets: limited permission now shows only portrait, name, people
  and public description; observers get a real read-only sheet
  (fields and rolls disabled, items, chat, search and filters work)
- Perfidie pains: editable boon description and boon-only active
  effects, suspended until the boon is acquired
- Compendium browsers: accent-insensitive multi-word search with
  exclusions, "exact phrases", nom: prefix, typo tolerance,
  relevance ranking and highlighted matches
- Calendar: weather picked with one button per weather type
- Tests: unit tests for the search engine, Quench tests for
  permissions, boon effects and browser search
```
