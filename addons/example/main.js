// shared/jsx.ts
var Fragment = Symbol("Fragment");
var toNode = (child) => {
  if (child == null || child === false) return document.createTextNode("");
  if (typeof child === "string" || typeof child === "number") {
    return document.createTextNode(String(child));
  }
  return child;
};
var appendChild = (parent, child) => {
  if (Array.isArray(child)) {
    for (const item of child) appendChild(parent, item);
  } else {
    parent.appendChild(toNode(child));
  }
};
var appendChildren = (parent, children) => {
  for (const child of children) appendChild(parent, child);
};
var h = (tag, props, ...children) => {
  if (tag === Fragment) {
    const fragment = document.createDocumentFragment();
    appendChildren(fragment, children);
    return fragment;
  }
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === "children") continue;
    if (key === "className") {
      element.className = String(value);
    } else if (key === "style") {
      element.setAttribute("style", String(value));
    } else if (key.startsWith("on") && typeof value === "function") {
      element.addEventListener(
        key.slice(2).toLowerCase(),
        value
      );
    } else {
      element.setAttribute(key, String(value));
    }
  }
  appendChildren(element, children);
  return element;
};

// addons/example/main.tsx
var main_default = (ctx) => {
  ctx.toast.create({
    type: "info",
    id: "addon_example_greet",
    text: ctx.t("addon_example:greet")
  });
  const badge = /* @__PURE__ */ h(
    "div",
    {
      className: "astratch-example-badge",
      style: "position:fixed;right:12px;bottom:12px;z-index:99999;padding:8px 12px;background:#855cd6;color:#fff;border-radius:8px;font:12px/1.4 system-ui, sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35)"
    },
    ctx.t("addon_example:greet")
  );
  document.body.appendChild(badge);
  return () => {
    badge.remove();
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
