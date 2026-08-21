# AstratchAddons

The plugin center of Astratch — source code, compiled release artifacts, `registry.json`, and build scripts.

No self-hosted server, database, GitHub Pages, or backend. Distribution and updates rely only on GitHub's public infrastructure — the repo itself, Raw links, and GitHub Actions.

## How it works

```
GitHub Actions (push to main)
   │  npm ci → typecheck → validate → build → registry
   ▼
addons/<id>/releases/<version>/   ← every release saved independently; old versions never overwritten
registry.json                     ← unified store entry (single file, one request for the whole catalog)
   │
   ▼
Astratch (runtime)
   1. startup → reads cached registry → shows the store immediately
   2. silently fetches the latest registry.json in the background → updates the cache
   3. downloads addon.js for the chosen version via GitHub Raw when the user installs an addon
```

## Structure

```
addons.json                   List of released addon ids (source of truth for CI)
registry.json                 Generated store entry (auto-built)
schemas/info.schema.json      JSON schema that validates every addon's info.yaml
addons/<id>/
  info.yaml                   Addon metadata (id, name, version, main, settings, ...)
  main.tsx / main.ts          TypeScript source (compiled by CI)
  main.js                     Plain JavaScript source
  assets/icon.svg             Addon icon
  i18n/<locale>.json          Optional user-visible translations
  releases/<version>/         Compiled, versioned release artifacts (auto-built, gitignored)
    addon.js                  Compiled entry point
    info.json                 info.yaml converted to JSON
    assets/                   Copied resources
scripts/
  build.mjs                   Compiles each addon to releases/<version>/
  registry.mjs                Scans addons + releases, generates registry.json
  validate.mjs                Validates all addons' info.yaml against the schema
.gitattributes                Marks releases/** as linguist-generated
```

## info.yaml

Every addon lives in `addons/<id>/` and is described by an `info.yaml`:

```yaml
id: example
name: Example Addon
version: 1.0.0
author: AstrasTeam
description: A sample addon that shows a notification when enabled.
license: MIT
icon: assets/icon.svg
main: main.tsx          # required — .ts/.tsx for TS, .js for plain JS
typescript: true        # set when main is .ts/.tsx
defaultEnabled: false

astratch:
  minVersion: 0.1.0
  settings:
    - name: greeting name
      id: name
      type: string
      default: world
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Must match the folder name. Pattern: `^[a-z0-9]+(-[a-z0-9]+)*$` |
| `name` | yes | Display name |
| `version` | yes | Semver; bumping creates a new immutable release |
| `author` | yes | Author name |
| `description` | yes | Short description |
| `icon` | yes | Path to icon inside the addon folder |
| `main` | yes | Entry point. Must be `.ts`/`.tsx` when `typescript: true`, `.js` otherwise |
| `license` | no | License identifier (default: `MIT`) |
| `typescript` | no | `true` when source is TypeScript/JSX |
| `files` | no | Extra JS files to include for multi-file plain JS addons |
| `defaultEnabled` | no | Whether the addon starts enabled for new users |
| `astratch.minVersion` | no | Minimum Astratch version required (semver) |
| `astratch.settings` | no | Array of setting definitions (see below) |

### Settings

Declared under `astratch.settings`. Each becomes a control in the Astratch Settings panel:

```yaml
astratch:
  settings:
    - name: greeting name    # display label (translatable via @settings/<id>)
      id: name               # unique key for read/write
      type: string           # "string" | "number" | "boolean"
      default: world         # default value
      min: 0                 # (number) minimum
      max: 100               # (number) maximum
      allowLines: true       # (string) render as textarea
```

### Multi-file plain JS addons

TypeScript addons are bundled by esbuild into a single `addon.js`. For plain JS addons with multiple files, use the `files` field:

```yaml
main: main.js
files:
  - utils.js       # specific file
  - lib/           # all .js files under lib/ (recursive)
```

The entry point (`main`) is always included. The build and the runtime both bundle listed files into a single `addon.js`.

## registry.json

Single file with the whole catalog as an **array**:

```jsonc
{
  "schemaVersion": 1,
  "generatedAt": "2026-08-20T...",
  "addons": [
    {
      "id": "example",
      "name": "Example Addon",
      "version": "1.0.0",
      "author": "AstrasTeam",
      "description": "...",
      "license": "MIT",
      "icon": "data:image/svg+xml,...",
      "defaultEnabled": false,
      "settings": [...],
      "i18n": { "en": {...}, "zh-CN": {...} },
      "astratch": { "minVersion": "0.1.0" },
      "versions": ["1.0.0", "1.1.0"],
      "download": "addons/example/releases/1.0.0/"
    }
  ]
}
```

The client derives per-version URLs from `download` (strip trailing `<version>/`) + target version, e.g. `addons/example/releases/1.0.0/addon.js`.

## Releasing

1. Bump `version` in `addons/<id>/info.yaml`
2. Commit to `main`
3. CI builds `releases/<new-version>/`, regenerates `registry.json`, and commits the artifacts

Existing version directories are never overwritten.

## Writing an addon

The entry point must default-export a function:

```ts
export default (ctx: AddonContext) => void | (() => void)
```

Return a cleanup function to run when the addon is disabled.

### TypeScript/JSX

Set `main: main.tsx` (or `main.ts`) and `typescript: true` in `info.yaml`. JSX is supported — import `h` and `Fragment` from `../../shared/jsx`:

```tsx
import { h } from "../../shared/jsx";
import type { AddonContext } from "../../shared/types";

export default (ctx: AddonContext) => {
  ctx.toast.create({
    type: "info",
    id: "example_greet",
    text: ctx.t("addon_example:greet"),
  });
};
```

### Plain JavaScript

Set `main: main.js` (no `typescript` key):

```js
export default (ctx) => {
  ctx.toast.create({
    type: "info",
    id: "my_greet",
    text: "Hello from my addon!",
  });
};
```

## AddonContext API

| Property | Type | Description |
|----------|------|-------------|
| `vm` | `IVM` | The virtual machine |
| `blockly` | `Blockly` | Blockly instance |
| `toast` | `IToastManager` | Notification manager |
| `t` | `TFunction` | i18next translation function |
| `storage` | `IAddonStorage` | Namespace-scoped key-value storage |
| `settings` | `IAddonSettingsApi` | Read/write addon settings |

## i18n

Translations live in `i18n/<locale>.json`, registered under namespace `addon_<id>`:

```json
{
  "@name": "My Addon",
  "@description": "What it does",
  "@settings/name": "Greeting name",
  "greet": "Hello!"
}
```

Use in code: `ctx.t("addon_<id>:key")`

## Building

```bash
npm install
npm run check   # typecheck + validate + build + registry
```

GitHub Actions runs `npm run check` on every push to `main` and commits the compiled releases and registry. To release an addon, add its id to `addons.json` and commit the source.
