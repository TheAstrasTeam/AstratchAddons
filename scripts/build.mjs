import { build } from "esbuild";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const addons = JSON.parse(readFileSync("addons.json", "utf8"));
if (!Array.isArray(addons)) {
  throw new Error("addons.json must be an array of addon names");
}

for (const name of addons) {
  const dir = join("addons", name);
  const entry = join(dir, "main.tsx");

  if (!existsSync(entry)) {
    console.log(`[skip] ${name}: no main.tsx`);
    continue;
  }

  await build({
    entryPoints: [entry],
    outfile: join(dir, "main.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2020",
    jsx: "transform",
    jsxFactory: "h",
    jsxFragment: "Fragment",
    logLevel: "info",
  });

  const manifestPath = join(dir, "manifest.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest.typescript === true) {
      manifest.files = ["main.js"];
    } else {
      const files = Array.isArray(manifest.files) ? manifest.files : [];
      if (!files.includes("main.js")) files.push("main.js");
      manifest.files = files;
    }
    manifest.main = "main.js";
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`[manifest] ${name}: files = ${JSON.stringify(manifest.files)}`);
  }
}