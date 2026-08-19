// addons/example/main.tsx
var main_default = (ctx) => {
  ctx.toast.create({
    type: "info",
    id: "addon_example_greet",
    text: ctx.t("addon_example:greet")
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
