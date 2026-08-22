# Example 插件

一个演示 Astratch 插件系统的示例插件。

## 功能

- 启用时显示一条通知
- 在右下角显示浮动徽章
- 支持可配置的设置（问候名字、音量等）

## 设置项

| 设置 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| greeting name | string | world | 问候的名字 |
| volume | number | 50 | 音量（0-100） |
| notify on disable | boolean | true | 禁用时显示通知 |
| multiline note | string | hello\nworld | 多行备注 |

## 开发

本插件使用 TypeScript + JSX 编写，运行 `npm run build` 编译。

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
