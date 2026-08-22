# Example Addon

A sample addon that demonstrates the Astratch addon system.

## Features

- Shows a toast notification when enabled
- Displays a floating badge in the bottom-right corner
- Supports configurable settings (greeting name, volume, etc.)

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| greeting name | string | world | Name to greet |
| volume | number | 50 | Volume level (0-100) |
| notify on disable | boolean | true | Show notification when disabled |
| multiline note | string | hello\nworld | A multiline note |

## Development

This addon is written in TypeScript with JSX. Run `npm run build` to compile.

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
