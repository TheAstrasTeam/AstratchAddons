import type { AddonContext } from "../../shared/types";

export default (ctx: AddonContext) => {
  ctx.toast.create({
    type: "info",
    id: "addon_example_greet",
    text: ctx.t("addon_example:greet"),
  });

  return () => {
    ctx.toast.create({
      type: "info",
      id: "addon_example_bye",
      text: ctx.t("addon_example:bye"),
    });
  };
};