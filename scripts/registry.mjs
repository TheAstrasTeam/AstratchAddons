import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const addons = JSON.parse(readFileSync("addons.json", "utf8"));
if (!Array.isArray(addons)) {
  throw new Error("addons.json must be an array of addon names");
}

/**
 * 生成根级 registry.json —— 插件中心的"统一商店入口"。
 *
 * 单文件包含所有插件的元信息：名称、作者、简介、当前版本、全部可用版本、
 * 内联小图标、权限、Astratch 兼容版本，以及当前版本的下载路径（相对仓库根）。
 *
 * 这样 Astratch 的商店只需要一次请求就能拿到完整目录。
 */
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

const registry = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  addons: [],
};

for (const name of addons) {
  const dir = join("addons", name);
  const infoPath = join(dir, "info.yaml");
  if (!existsSync(infoPath)) {
    console.log(`[skip] ${name}: no info.yaml`);
    continue;
  }
  const info = parse(readFileSync(infoPath, "utf8"));

  const releasesDir = join(dir, "releases");
  if (!existsSync(releasesDir)) {
    console.log(`[skip] ${name}: no releases dir (run build first)`);
    continue;
  }
  const versions = readdirSync(releasesDir)
    .filter(
      (v) =>
        existsSync(join(releasesDir, v, "addon.js")) &&
        statSync(join(releasesDir, v, "addon.js")).isFile(),
    )
    .sort(semverCompare);

  if (versions.length === 0) {
    console.log(`[skip] ${name}: no built releases`);
    continue;
  }

  const currentVersion = versions[versions.length - 1];

  // 图标：输出文件路径（相对于 release 根目录），不再内联 data URL
  let icon = "";
  if (info.icon) {
    icon = `${name}@v${currentVersion}/${info.icon}`;
  }

  // i18n：输出文件路径（相对于 release 根目录），不再内联 JSON
  const i18n = {};
  const i18nDir = join(dir, "i18n");
  if (existsSync(i18nDir)) {
    for (const localeFile of readdirSync(i18nDir).filter((f) => f.endsWith(".json"))) {
      const locale = localeFile.replace(/\.json$/, "");
      i18n[locale] = `${name}@v${currentVersion}/i18n/${localeFile}`;
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
    astratch: { minVersion: info.astratch?.minVersion ?? "0.0.0" },
    versions,
    download: `${name}@v${currentVersion}/`,
  });
  console.log(
    `[registry] ${name}@${currentVersion} (${versions.length} versions)`,
  );
}

writeFileSync("registry.json", `${JSON.stringify(registry, null, 2)}\n`);
console.log(`registry.json: ${registry.addons.length} addons`);