# AstratchAddons

[English](./README.md)

Astratch 插件中心 — 源码、编译产物与构建脚本。

无需自建服务器、数据库、GitHub Pages 或后端。分发和更新仅依赖 GitHub 基础设施 — 仓库本身、Raw 链接和 GitHub Actions。

## 工作原理

```
GitHub Actions（push 到 main）
   │  npm ci → typecheck → validate → build → prepare-release
   ▼
main 分支：
  addons/<id>/info.yaml, main.tsx, ...   ← 仅源码

release 分支（只增不删，不覆盖旧版本）：
  <id>@v<version>/                        ← 扁平发布目录（addon.js, info.json, assets/, i18n/）
  registry.json                           ← 商店目录（release 时生成，不提交到 main）
   │
   ▼
Astratch（运行时）
   1. 启动 → 读取缓存的 registry → 立即展示商店
   2. 静默拉取最新的 registry.json → 更新缓存
   3. 用户安装插件时通过 GitHub Raw 下载 <id>@v<version>/addon.js
```

**release 分支**只增不删 — 旧版本永不被移除或覆盖，新版本与已有版本并存。

## 目录结构

```
addons.json                   已发布的插件 ID 列表（CI 的唯一依据）
schemas/info.schema.json      校验每个插件 info.yaml 的 JSON Schema
addons/<id>/
  info.yaml                   插件元信息（id, name, version, main, settings, ...）
  main.tsx / main.ts          TypeScript 源码（由 CI 编译）
  main.js                     纯 JavaScript 源码
  assets/icon.svg             插件图标
  i18n/<locale>.json          可选的用户可见翻译
  README/<locale>.md          可选的多语言 README
  releases/<version>/         编译后的发布产物（main 上 gitignored，存在于 release 分支）
    addon.js                  编译后的入口
    info.json                 info.yaml 转 JSON
    assets/                   复制的资源
    i18n/                     复制的翻译
    README/                   复制的 README
scripts/
  build.mjs                   编译每个插件到 releases/<version>/
  validate.mjs                根据 schema 校验所有插件的 info.yaml
  prepare-release.mjs         生成 registry.json + 复制产物到扁平 <id>@v<version>/ 目录
.gitattributes                标记 TS 插件的 main.js 为 generated
```

### Release 分支

独立的 orphan `release` 分支，仅包含编译产物：

```
<id>@v<version>/              ← 扁平发布目录
  addon.js
  info.json
  assets/
  i18n/
  README/
registry.json                 ← 生成的商店目录（不在 main 上）
```

不含源码、脚本或工作流文件。Astratch 运行时从此分支拉取数据。

## info.yaml

每个插件位于 `addons/<id>/` 目录下，由 `info.yaml` 描述：

```yaml
id: example
name: Example Addon
version: 1.0.0
author: AstrasTeam
description: A sample addon that shows a notification when enabled.
license: MIT
icon: assets/icon.svg
main: main.tsx          # 必填 — TS 用 .ts/.tsx，纯 JS 用 .js
typescript: true        # main 为 .ts/.tsx 时设置
defaultEnabled: false

astratch:
  version: '>=1.0.0'
  settings:
    - name: greeting name
      id: name
      type: string
      default: world
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 是 | 必须与文件夹名一致。格式：`^[a-z0-9]+(-[a-z0-9]+)*$` |
| `name` | 是 | 显示名称 |
| `version` | 是 | 语义化版本号；版本升级会创建新的不可变发布 |
| `author` | 是 | 作者 |
| `description` | 是 | 简短描述 |
| `icon` | 是 | 插件文件夹内的图标路径 |
| `main` | 是 | 入口文件。`typescript: true` 时为 `.ts`/`.tsx`，否则为 `.js` |
| `license` | 否 | 许可证标识（默认 `MIT`） |
| `typescript` | 否 | 源码为 TypeScript/JSX 时设为 `true` |
| `files` | 否 | 多文件纯 JS 插件需要包含的额外 JS 文件 |
| `defaultEnabled` | 否 | 新用户安装时是否默认启用 |
| `astratch.version` | 否 | 兼容的 Astratch 版本范围（semver range） |
| `astratch.settings` | 否 | 设置项定义数组（见下文） |

### 设置项

在 `astratch.settings` 下声明，每个设置项会出现在 Astratch 的设置面板中：

```yaml
astratch:
  settings:
    - name: greeting name    # 显示标签（可通过 @settings/<id> 翻译）
      id: name               # 读写的唯一 key
      type: string           # "string" | "number" | "boolean"
      default: world         # 默认值
      min: 0                 # （number）最小值
      max: 100               # （number）最大值
      allowLines: true       # （string）渲染为多行文本框
```

### 多文件纯 JS 插件

TypeScript 插件会被 esbuild 打包为单个 `addon.js`。对于多文件的纯 JS 插件，使用 `files` 字段：

```yaml
main: main.js
files:
  - utils.js       # 指定文件
  - lib/           # lib/ 下所有 .js 文件（递归）
```

入口文件（`main`）始终包含。构建和运行时都会将列出的文件打包为单个 `addon.js`。

## registry.json

由 `prepare-release.mjs` 生成，**仅部署到 release 分支**，不提交到 main。

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
      "icon": "assets/icon.svg",
      "defaultEnabled": false,
      "settings": [...],
      "i18n": ["en", "zh-CN"],
      "readme": ["en", "zh-CN"],
      "astratch": { "version": ">=1.0.0" },
      "versions": ["1.0.0", "1.1.0"]
    }
  ]
}
```

图标、i18n 和 README 使用**相对于版本目录的路径**，不是内联数据。客户端按需拉取。

## 发布

1. 在 `addons/<id>/info.yaml` 中升级 `version`
2. 提交到 `main`
3. CI 构建 `releases/<new-version>/`，生成 `registry.json`，并 force-push `release` 分支

已有的版本目录永不被覆盖。

## 编写插件

入口文件必须默认导出一个函数：

```ts
export default (ctx: AddonContext) => void | (() => void)
```

返回一个清理函数，在插件被禁用时执行。

### TypeScript/JSX

在 `info.yaml` 中设置 `main: main.tsx`（或 `main.ts`）和 `typescript: true`。支持 JSX — 从 `../../shared/jsx` 导入 `h` 和 `Fragment`：

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

### 纯 JavaScript

在 `info.yaml` 中设置 `main: main.js`（无需 `typescript` 字段）：

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

| 属性 | 类型 | 说明 |
|------|------|------|
| `vm` | `IVM` | 虚拟机实例 |
| `blockly` | `Blockly` | Blockly 实例 |
| `toast` | `IToastManager` | 通知管理器 |
| `t` | `TFunction` | i18next 翻译函数 |
| `storage` | `IAddonStorage` | 命名空间隔离的键值存储 |
| `settings` | `IAddonSettingsApi` | 读写插件设置 |

## i18n

翻译文件位于 `i18n/<locale>.json`，注册在 `addon_<id>` 命名空间下：

```json
{
  "@name": "My Addon",
  "@description": "What it does",
  "@settings/name": "Greeting name",
  "greet": "Hello!"
}
```

在代码中使用：`ctx.t("addon_<id>:key")`

## 构建

```bash
npm install
npm run check            # typecheck + validate + build
npm run prepare-release  # 生成 registry.json + 复制产物到扁平 <id>@v<version>/ 目录
```

GitHub Actions 在每次 push 到 `main` 时运行 `npm run check`，然后运行 `prepare-release` 并 force-push `release` 分支。要发布插件，将其 ID 添加到 `addons.json` 并提交源码即可。
