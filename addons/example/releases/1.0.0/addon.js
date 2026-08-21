// addons/example/main.tsx
var main_default = (ctx) => {
  const name = String(ctx.settings.get("name") ?? "");
  ctx.toast.create({
    type: "info",
    id: "addon_example_greet",
    text: `${ctx.t("addon_example:greet")} ${name}`.trim()
  });
  return () => {
    ctx.toast.create({
      type: "info",
      id: "addon_example_bye",
      text: ctx.t("addon_example:bye")
    });
  };
};
export {
  main_default as default
};
