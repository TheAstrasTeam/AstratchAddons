import { h } from "../../shared/jsx";
import type { AddonContext } from "../../shared/types";

export default (ctx: AddonContext) => {
  ctx.toast.create({
    type: "info",
    id: "addon_example_greet",
    text: ctx.t("addon_example:greet"),
  });

  const badge = (
    <div
      className="astratch-example-badge"
      style="position:fixed;right:12px;bottom:12px;z-index:99999;padding:8px 12px;background:#855cd6;color:#fff;border-radius:8px;font:12px/1.4 system-ui, sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35)"
    >
      {ctx.t("addon_example:greet")}
    </div>
  );
  document.body.appendChild(badge);

  return () => {
    badge.remove();
    ctx.toast.create({
      type: "info",
      id: "addon_example_bye",
      text: ctx.t("addon_example:bye"),
    });
  };
};