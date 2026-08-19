import type { AddonContext } from "../../shared/types";

export default (ctx: AddonContext) => {
  const name = String(ctx.settings.get("name") ?? "");
  ctx.toast.create({
    type: "info",
    id: "addon_example_greet",
    text: `${ctx.t("addon_example:greet")} ${name}`.trim(),
  });

  return () => {
    ctx.toast.create({
      type: "info",
      id: "addon_example_bye",
      text: ctx.t("addon_example:bye"),
    });
  };
};