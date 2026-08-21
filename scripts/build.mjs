import { build } from "esbuild";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { parse } from "yaml";

const addons = JSON.parse(readFileSync("addons.json", "utf8"));
if (!Array.isArray(addons)) {
  throw new Error("addons.json must be an array of addon names");
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

/**
 * 收集 info.files 中指定的 JS 文件，返回相对于 addon 目录的路径列表。
 * 支持文件路径和目录路径（目录递归收集 .js 文件）。
 * 入口文件始终包含在内。
 */
function collectFiles(dir, info) {
  const entry = info.main ?? "main.js";
  const files = new Set([entry]);

  if (Array.isArray(info.files)) {
    for (const pattern of info.files) {
      const resolved = join(dir, pattern);
      if (!existsSync(resolved)) continue;
      if (statSync(resolved).isDirectory()) {
        // 递归收集目录下的 .js 文件
        const walk = (base) => {
          for (const item of readdirSync(base, { withFileTypes: true })) {
            const full = join(base, item.name);
            if (item.isDirectory()) {
              walk(full);
            } else if (item.name.endsWith(".js")) {
              files.add(full.replace(dir + "/", "").replace(/\\/g, "/"));
            }
          }
        };
        walk(resolved);
      } else {
        files.add(pattern);
      }
    }
  }

  return [...files];
}

/**
 * 为每个插件生成"正式版本产物"：
 *   addons/<name>/releases/<version>/
 *     ├── addon.js   编译/拷贝后的插件入口
 *     ├── info.json  info.yaml 的机器可读版本
 *     └── assets/    插件资源副本
 *
 * 版本号取自 info.yaml 的 version 字段。每次发布新版本只需改版本号，
 * 旧的版本目录不会被覆盖，从而可以长期保留多个版本（版本不可变）。
 */
for (const name of addons) {
  const dir = join("addons", name);
  const info = readInfo(name);
  const version = String(info.version ?? "1.0.0");
  const releaseDir = join(dir, "releases", version);
  const outfile = join(releaseDir, "addon.js");

  mkdirSync(releaseDir, { recursive: true });

  // info.main 始终必须
  if (!info.main) {
    console.log(`[skip] ${name}: info.main is required`);
    continue;
  }

  const isTs = info.typescript === true;
  const entry = join(dir, info.main);

  if (!existsSync(entry)) {
    console.log(`[skip] ${name}: entry file not found (${info.main})`);
    continue;
  }

  if (isTs) {
    // TypeScript/JSX：esbuild 编译 + 打包（自动处理所有 import）
    await build({
      entryPoints: [entry],
      outfile,
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "es2020",
      jsx: "transform",
      jsxFactory: "h",
      jsxFragment: "Fragment",
      logLevel: "info",
    });
  } else {
    // 纯 JavaScript：收集所有文件，用 esbuild 打包成单个 addon.js
    const files = collectFiles(dir, info);

    if (files.length === 1) {
      // 单文件：直接拷贝
      const src = join(dir, files[0]);
      await import("node:fs/promises").then(({ copyFile }) =>
        copyFile(src, outfile),
      );
    } else {
      // 多文件：用 esbuild 打包，解析本地 import
      const resolvePlugin = {
        name: "resolve-local",
        setup(build) {
          build.onResolve({ filter: /^\.\.?\/.*\.js$/ }, (args) => {
            const resolved = resolve(args.resolveDir, args.path);
            if (existsSync(resolved)) return { path: resolved };
            // 尝试 .js 后缀
            if (!resolved.endsWith(".js") && existsSync(resolved + ".js")) {
              return { path: resolved + ".js" };
            }
            return null;
          });
        },
      };

      await build({
        entryPoints: [entry],
        outfile,
        bundle: true,
        format: "esm",
        platform: "browser",
        target: "es2020",
        logLevel: "info",
        plugins: [resolvePlugin],
      });
    }
  }

  // 拷贝插件资源到 release 目录（图标等）
  const srcAssets = join(dir, "assets");
  if (existsSync(srcAssets)) {
    cpSync(srcAssets, join(releaseDir, "assets"), { recursive: true });
  }

  // 拷贝 i18n 翻译文件
  const srcI18n = join(dir, "i18n");
  if (existsSync(srcI18n)) {
    cpSync(srcI18n, join(releaseDir, "i18n"), { recursive: true });
  }

  // 生成机器可读的 info.json（info.yaml 的 JSON 形式）
  writeFileSync(
    join(releaseDir, "info.json"),
    `${JSON.stringify({ ...info, id: name }, null, 2)}\n`,
  );
  console.log(`[release] ${name}@${version} -> ${outfile}`);
}
