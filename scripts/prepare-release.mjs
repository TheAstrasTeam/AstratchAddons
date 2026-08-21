/**
 * prepare-release.mjs
 *
 * 读取当前构建的版本（info.yaml 中的 version），输出到 release/ 目录：
 *   release/<id>@v<version>/addon.js
 *   release/<id>@v<version>/info.json
 *   release/<id>@v<version>/assets/
 *   release/registry.json
 *
 * 只输出当前版本，不包含历史版本（历史版本已在 release 分支上）。
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const addons = JSON.parse(readFileSync("addons.json", "utf8"));
if (!Array.isArray(addons)) {
  throw new Error("addons.json must be an array of addon names");
}

const OUT_DIR = "release";

import { rmSync } from "node:fs";
if (existsSync(OUT_DIR)) {
  rmSync(OUT_DIR, { recursive: true });
}
mkdirSync(OUT_DIR, { recursive: true });

let totalReleases = 0;

for (const name of addons) {
  const infoPath = join("addons", name, "info.yaml");
  if (!existsSync(infoPath)) {
    console.log(`[skip] ${name}: no info.yaml`);
    continue;
  }
  const info = parse(readFileSync(infoPath, "utf8"));
  const version = String(info.version ?? "1.0.0");

  const releaseDir = join("addons", name, "releases", version);
  if (!existsSync(releaseDir)) {
    console.log(`[skip] ${name}@${version}: no release dir (run build first)`);
    continue;
  }

  const outDir = join(OUT_DIR, `${name}@v${version}`);
  mkdirSync(outDir, { recursive: true });

  cpSync(join(releaseDir, "addon.js"), join(outDir, "addon.js"));

  if (existsSync(join(releaseDir, "info.json"))) {
    cpSync(join(releaseDir, "info.json"), join(outDir, "info.json"));
  }

  const srcAssets = join(releaseDir, "assets");
  if (existsSync(srcAssets)) {
    cpSync(srcAssets, join(outDir, "assets"), { recursive: true });
  }

  totalReleases++;
  console.log(`[release] ${name}@v${version}`);
}

if (existsSync("registry.json")) {
  cpSync("registry.json", join(OUT_DIR, "registry.json"));
  console.log(`[release] registry.json`);
}

console.log(`\nPrepared ${totalReleases} release(s) in ${OUT_DIR}/`);
