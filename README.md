# AstratchAddons

The addons of Astratch.

## Structure

```
addons.json                 List of enabled addon names
scripts/
  build.mjs                 Compiles TSX addons to main.js and syncs manifests
  update-gitattributes.mjs  Marks compiled main.js of TS addons as generated
.gitattributes              Generated; hides TS addons' main.js diffs on GitHub
addons/<name>/
  main.tsx                  Addon source (TypeScript + JSX)
  main.js                   Addon entry (built output for TSX addons)
  manifest.json             Addon metadata; files[] lists main.js
  icon.svg
  i18n/<locale>.json
shared/
  jsx.ts                    Tiny JSX runtime (h / Fragment)
  types.ts                  AddonContext types
```

## Writing an addon

Two styles are supported:

- **TypeScript/JSX** — write `addons/<name>/main.tsx` and mark the addon with `"typescript": true` in `manifest.json`. The build compiles it to `main.js` and, when that flag is set, always overwrites the manifest's `files` to `["main.js"]`.
- **Plain JavaScript** — write `addons/<name>/main.js` directly; no `typescript` key in `manifest.json`, and the build leaves it untouched.

For TSX addons:

- Write the addon entry point as `addons/<name>/main.tsx`.
- It must default-export a function: `export default (ctx: AddonContext) => void | (() => void)`.
- JSX is supported; import `h` (and `Fragment`) from `../../shared/jsx` if you use JSX.
- `manifest.json` must list the compiled `main.js` in `files`; the build script keeps this in sync.

Example:

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

## Building

TSX sources are compiled to `main.js` in place, and the compiled file is listed in `manifest.json` `files`.

```bash
npm install
npm run check   # typecheck + build
```

GitHub Actions (`npm run build`) compiles on every push to `main` and commits the compiled output and updated manifests. To add an addon, add its name to `addons.json` and commit the `main.tsx` source.
