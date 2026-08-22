import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const addons = JSON.parse(readFileSync("addons.json", "utf8"));
if (!Array.isArray(addons)) {
  throw new Error("addons.json must be an array of addon names");
}

const SEMVER = /^\d+\.\d+\.\d+$/;
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const errors = [];

for (const name of addons) {
  const dir = join("addons", name);
  const infoPath = join(dir, "info.yaml");
  if (!existsSync(infoPath)) {
    errors.push(`${name}: missing info.yaml`);
    continue;
  }

  let info;
  try {
    info = parse(readFileSync(infoPath, "utf8"));
  } catch (error) {
    errors.push(`${name}: invalid YAML (${error.message})`);
    continue;
  }
  if (!info || typeof info !== "object") {
    errors.push(`${name}: info.yaml must parse to an object`);
    continue;
  }

  if (info.id !== name) errors.push(`${name}: info.yaml id must be "${name}"`);
  if (!ID_RE.test(String(info.id ?? ""))) errors.push(`${name}: invalid id "${info.id}"`);
  if (!info.name) errors.push(`${name}: missing name`);
  if (!SEMVER.test(String(info.version ?? ""))) errors.push(`${name}: invalid version "${info.version}"`);
  if (!info.author) errors.push(`${name}: missing author`);
  if (!info.description) errors.push(`${name}: missing description`);
  if (!info.icon) errors.push(`${name}: missing icon`);

  const versionRange = info.astratch?.version;
  if (versionRange !== undefined && typeof versionRange !== "string") {
    errors.push(`${name}: invalid astratch.version "${versionRange}"`);
  }

  if (info.astratch?.settings !== undefined && !Array.isArray(info.astratch.settings)) {
    errors.push(`${name}: settings must be an array`);
  }

  // main 字段：始终必须
  if (!info.main) {
    errors.push(`${name}: info.main is required`);
  } else {
    const isTs = info.typescript === true;
    const mainStr = String(info.main);
    const tsExt = mainStr.endsWith(".ts") || mainStr.endsWith(".tsx");
    const jsExt = mainStr.endsWith(".js");
    if (isTs && !tsExt) {
      errors.push(`${name}: typescript: true but info.main "${info.main}" is not a .ts/.tsx file`);
    }
    if (!isTs && !jsExt) {
      errors.push(`${name}: typescript: false (or unset) but info.main "${info.main}" is not a .js file`);
    }
    if (!existsSync(join(dir, mainStr))) {
      errors.push(`${name}: entry file not found (${info.main})`);
    }
  }

  // 如果指定了 files，检查文件/目录是否存在
  if (Array.isArray(info.files)) {
    for (const pattern of info.files) {
      const resolved = join(dir, pattern);
      if (!existsSync(resolved)) {
        errors.push(`${name}: files entry not found: ${pattern}`);
      }
    }
  }

  const iconPath = join(dir, info.icon ?? "");
  if (!existsSync(iconPath)) {
    errors.push(`${name}: icon file not found (${info.icon})`);
  }
}

if (errors.length > 0) {
  console.error(`Validation failed for ${errors.length} problem(s):`);
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log(`Validated ${addons.length} addons`);