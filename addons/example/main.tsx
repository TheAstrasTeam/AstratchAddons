import type { AddonContext } from "../../shared/types";

/** 侧边栏图标 SVG（内联为字符串，用作 <img> 的 data URI） */
const DEMO_TAB_ICON =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  );

export default (ctx: AddonContext) => {
  const name = String(ctx.settings.get("name") ?? "");
  ctx.toast.create({
    type: "info",
    id: "addon_example_greet",
    text: `${ctx.t("addon_example:greet")} ${name}`.trim(),
  });

  // 注册侧边栏标签页
  const unregisterTab = ctx.sidebar.registerTab({
    id: "demo-panel",
    title: () => ctx.t("addon_example:sidebarTitle"),
    icon: DEMO_TAB_ICON,
    content: () => createDemoPanel(ctx),
  });

  return () => {
    ctx.toast.create({
      type: "info",
      id: "addon_example_bye",
      text: ctx.t("addon_example:bye"),
    });
    unregisterTab();
  };
};

/**
 * 创建演示面板的 DOM 内容。
 * 返回一个 HTMLElement，由主应用挂载到侧边栏中。
 */
function createDemoPanel(ctx: AddonContext): HTMLElement {
  const container = document.createElement("div");
  container.style.cssText = "padding: 12px; font-size: 13px; color: inherit;";

  // 标题
  const title = document.createElement("h3");
  title.textContent = ctx.t("addon_example:sidebarTitle");
  title.style.cssText = "margin: 0 0 12px; font-size: 14px;";
  container.appendChild(title);

  // 说明文字
  const desc = document.createElement("p");
  desc.textContent = ctx.t("addon_example:sidebarDesc");
  desc.style.cssText = "margin: 0 0 12px; opacity: 0.7;";
  container.appendChild(desc);

  // 计数器演示
  let count = 0;
  const counter = document.createElement("div");
  counter.style.cssText =
    "display: flex; align-items: center; gap: 8px; margin-bottom: 12px;";

  const countLabel = document.createElement("span");
  countLabel.textContent = `${ctx.t("addon_example:count")}: ${count}`;

  const btnGroup = document.createElement("div");
  btnGroup.style.cssText = "display: flex; gap: 4px;";

  const btnStyle =
    "padding: 2px 8px; cursor: pointer; border: 1px solid currentColor; border-radius: 4px; background: transparent; color: inherit;";

  const btnDec = document.createElement("button");
  btnDec.textContent = "−";
  btnDec.style.cssText = btnStyle;
  btnDec.onclick = () => {
    count--;
    countLabel.textContent = `${ctx.t("addon_example:count")}: ${count}`;
  };

  const btnInc = document.createElement("button");
  btnInc.textContent = "+";
  btnInc.style.cssText = btnStyle;
  btnInc.onclick = () => {
    count++;
    countLabel.textContent = `${ctx.t("addon_example:count")}: ${count}`;
  };

  btnGroup.appendChild(btnDec);
  btnGroup.appendChild(btnInc);
  counter.appendChild(countLabel);
  counter.appendChild(btnGroup);
  container.appendChild(counter);

  // 分隔线
  const hr = document.createElement("hr");
  hr.style.cssText =
    "border: none; border-top: 1px solid currentColor; opacity: 0.2; margin: 8px 0;";
  container.appendChild(hr);

  // 信息
  const info = document.createElement("p");
  info.textContent = ctx.t("addon_example:sidebarInfo");
  info.style.cssText = "margin: 0; opacity: 0.5; font-size: 12px;";
  container.appendChild(info);

  return container;
}