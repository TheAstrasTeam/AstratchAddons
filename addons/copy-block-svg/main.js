export default (ctx) => {
  const { blockly: Blockly, toast, t } = ctx;

  const MENU_ID = "copyBlockSvg";

  // 收集与 Blockly / 主题相关的 CSS，让导出的 SVG 能独立正确渲染
  // （积木字段文字的颜色等由 .blocklyText{fill:#fff} 这类规则决定）
  const collectBlocklyCss = () => {
    let css = "";
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of rules) {
        const text = rule.cssText;
        if (text && (text.includes("blockly") || text.includes(":root"))) {
          css += text + "\n";
        }
      }
    }
    return css;
  };

  // 从右键点击的积木取整条堆叠（顶部到末尾）
  const getStackBlocks = (block) => {
    const result = [];
    let current = block.getRootBlock();
    while (current) {
      result.push(current);
      current = current.getNextBlock();
    }
    return result;
  };

  const serializeBlocksSvg = (blocks, workspace) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    svg.setAttribute("class", "blocklySvg");

    // 工作区的 defs（渐变 / 滤镜），保证 url(#...) 引用有效
    const workspaceSvg = workspace.getSvg();
    const defs = workspaceSvg?.querySelector("defs");
    if (defs) svg.appendChild(defs.cloneNode(true));

    // 注入 CSS
    const style = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "style",
    );
    style.textContent = collectBlocklyCss();
    svg.appendChild(style);

    // 计算所有积木的包围盒（工作区坐标）
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const block of blocks) {
      const xy = block.getRelativeToSurfaceXY();
      const hw = block.getHeightWidth();
      minX = Math.min(minX, xy.x);
      minY = Math.min(minY, xy.y);
      maxX = Math.max(maxX, xy.x + hw.width);
      maxY = Math.max(maxY, xy.y + hw.height);
    }
    if (!Number.isFinite(minX)) {
      minX = 0;
      minY = 0;
      maxX = 10;
      maxY = 10;
    }
    const pad = 8;
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;

    // 保留积木自身的位移，用 viewBox 对齐坐标系
    for (const block of blocks) {
      svg.appendChild(block.getSvgRoot().cloneNode(true));
    }

    svg.setAttribute("width", String(maxX - minX));
    svg.setAttribute("height", String(maxY - minY));
    svg.setAttribute(
      "viewBox",
      `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
    );

    return new XMLSerializer().serializeToString(svg);
  };

  const writeSvgToClipboard = async (svgString) => {
    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([svgString], { type: "text/plain" }),
            "image/svg+xml": new Blob([svgString], { type: "image/svg+xml" }),
          }),
        ]);
        return true;
      }
    } catch {
      // 部分环境不支持 image/svg+xml，退回纯文本
    }
    try {
      await navigator.clipboard.writeText(svgString);
      return true;
    } catch {
      return false;
    }
  };

  const handleCopy = async (scope) => {
    const block = scope.block;
    if (!block) return;
    const workspace = block.workspace;
    const blocks = getStackBlocks(block);
    const svgString = serializeBlocksSvg(blocks, workspace);
    const ok = await writeSvgToClipboard(svgString);
    toast.create({
      type: ok ? "info" : "error",
      id: `copy_block_svg_${Date.now().toString()}`,
      text: ok
        ? t("addon_copy-block-svg:copied")
        : t("addon_copy-block-svg:failed"),
    });
  };

  const menuItem = {
    id: MENU_ID,
    scopeType: Blockly.ContextMenuRegistry.ScopeType.BLOCK,
    weight: 99,
    displayText: () => t("addon_copy-block-svg:copy"),
    preconditionFn: (scope) =>
      scope.block && !scope.block.isInFlyout ? "enabled" : "hidden",
    callback: (scope) => {
      void handleCopy(scope);
    },
  };

  const registerMenu = () => {
    try {
      Blockly.ContextMenuRegistry.registry.register(menuItem);
    } catch {
      // 已存在（重复启用），先注销再注册
      try {
        Blockly.ContextMenuRegistry.registry.unregister(MENU_ID);
      } catch {
        // 不需要处理
      }
      Blockly.ContextMenuRegistry.registry.register(menuItem);
    }
  };

  registerMenu();

  return () => {
    try {
      Blockly.ContextMenuRegistry.registry.unregister(MENU_ID);
    } catch {
      // 已经注销过了
    }
  };
};
