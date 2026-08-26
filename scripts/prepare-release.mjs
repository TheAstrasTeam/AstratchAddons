/**
 * prepare-release.mjs
 *
 * 生成 registry.json 并输出当前构建版本到 release/ 目录。
 *
 * 版本列表会合并：本地 releases/ 目录（当前构建）+ release 分支上已有的 registry.json。
 * 这样即使旧版本的 release 目录不在 main 上，registry 仍会包含所有历史版本。
 *
 * registry.json 只存在于 release 分支，不提交到 main。
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
import { parse } from "yaml";

const addons = JSON.parse(readFileSync("addons.json", "utf8"));
if (!Array.isArray(addons)) {
  throw new Error("addons.json must be an array of addon names");
}

const OUT_DIR = "release";

if (existsSync(OUT_DIR)) {
  rmSync(OUT_DIR, { recursive: true });
}
mkdirSync(OUT_DIR, { recursive: true });

// ── 从 release 分支获取已有的 registry.json，用于合并版本列表 ──
const REGISTRY_URL =
  "https://raw.githubusercontent.com/TheAstrasTeam/AstratchAddons/refs/heads/release/registry.json";

let existingRegistry = null;
try {
  const resp = await fetch(REGISTRY_URL);
  if (resp.ok) {
    existingRegistry = await resp.json();
    console.log(`[merge] fetched existing registry (${existingRegistry.addons.length} addons)`);
  }
} catch {
  console.log("[merge] no existing registry found, building from scratch");
}

/** 获取某个插件在 release 分支上已有的版本列表 */
function getExistingVersions(addonId) {
  if (!existingRegistry) return [];
  const entry = existingRegistry.addons.find((a) => a.id === addonId);
  return entry?.versions ?? [];
}

/** 读取并解析插件的 info.yaml */
function readInfo(name) {
  const dir = join("addons", name);
  const infoPath = join(dir, "info.yaml");
  if (!existsSync(infoPath)) {
    throw new Error(`${name}: missing info.yaml`);
  }
  return parse(readFileSync(infoPath, "utf8"));
}

const semverCompare = (a, b) => {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
};

// ── 生成 registry.json ──

const registry = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  addons: [],
};

let totalReleases = 0;

for (const name of addons) {
  const infoPath = join("addons", name, "info.yaml");
  if (!existsSync(infoPath)) {
    console.log(`[skip] ${name}: no info.yaml`);
    continue;
  }
  const info = parse(readFileSync(infoPath, "utf8"));

  const releasesDir = join("addons", name, "releases");
  if (!existsSync(releasesDir)) {
    console.log(`[skip] ${name}: no releases dir (run build first)`);
    continue;
  }
  const versions = [
    ...new Set([
      ...readdirSync(releasesDir)
        .filter(
          (v) =>
            existsSync(join(releasesDir, v, "addon.js")) &&
            statSync(join(releasesDir, v, "addon.js")).isFile(),
        ),
      ...getExistingVersions(name),
    ]),
  ].sort(semverCompare);

  if (versions.length === 0) {
    console.log(`[skip] ${name}: no built releases`);
    continue;
  }

  const currentVersion = versions[versions.length - 1];

  // 图标：输出相对路径（相对于版本目录）
  let icon = "";
  if (info.icon) {
    icon = info.icon;
  }

  // i18n：输出支持的语言列表
  const i18n = [];
  const i18nDir = join("addons", name, "i18n");
  if (existsSync(i18nDir)) {
    for (const localeFile of readdirSync(i18nDir).filter((f) => f.endsWith(".json"))) {
      i18n.push(localeFile.replace(/\.json$/, ""));
    }
  }

  // readme：自动检测 README 目录中的语言文件
  const readme = [];
  const readmeDir = join("addons", name, "README");
  if (existsSync(readmeDir)) {
    for (const f of readdirSync(readmeDir).filter((f) => f.endsWith(".md"))) {
      readme.push(f.replace(/\.md$/, ""));
    }
  }

  registry.addons.push({
    id: name,
    name: info.name ?? name,
    version: currentVersion,
    author: info.author ?? "",
    description: info.description ?? "",
    license: info.license ?? "MIT",
    icon,
    defaultEnabled: info.defaultEnabled ?? false,
    settings: info.astratch?.settings ?? [],
    i18n,
    readme,
    astratch: { version: info.astratch?.version ?? "*" },
    versions,
  });

  // ── 拷贝 release 产物 ──

  const version = String(info.version ?? "1.0.0");
  const releaseDir = join(releasesDir, version);
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

  if (existsSync(i18nDir)) {
    cpSync(i18nDir, join(outDir, "i18n"), { recursive: true });
  }

  if (existsSync(readmeDir)) {
    cpSync(readmeDir, join(outDir, "README"), { recursive: true });
  }

  // ── 计算哈希并写入 hashes.json ──

  const hashes = {};
  const collectHashes = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        collectHashes(fullPath);
      } else {
        const relPath = relative(outDir, fullPath).replace(/\\/g, "/");
        const content = readFileSync(fullPath);
        hashes[relPath] = createHash("sha256").update(content).digest("hex");
      }
    }
  };
  collectHashes(outDir);
  writeFileSync(join(outDir, "hashes.json"), `${JSON.stringify(hashes, null, 2)}\n`);

  totalReleases++;
  console.log(`[release] ${name}@${version} (${versions.length} versions, ${Object.keys(hashes).length} files)`);
}

// 写入 registry.json
writeFileSync(join(OUT_DIR, "registry.json"), `${JSON.stringify(registry, null, 2)}\n`);
console.log(`registry.json: ${registry.addons.length} addons`);
console.log(`\nPrepared ${totalReleases} release(s) in ${OUT_DIR}/`);
