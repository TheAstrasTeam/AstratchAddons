/**
 * 此文件由AI生成
 * 插件：Clean Orphans - 在工作区右键菜单添加"清理孤立积木"按钮
 *
 * "孤立积木"指未与任何根积木（脚本起点）相连的积木。
 * 根积木是没有 previousConnection 且没有 outputConnection 的积木（如事件帽子块）。
 */
export default (ctx) => {
  const { blockly: Blockly, vm } = ctx;

  const getWorkspace = () => vm.runtime.blocks?.workspaceSvg ?? null;

  /**
   * 判断积木是否为"根积木"（脚本起点）。
   */
  const isRootBlock = (block) => {
    return !block.previousConnection && !block.outputConnection;
  };

  /**
   * 查找所有孤立积木：未从任何根积木可达的积木。
   */
  const findOrphans = (workspace) => {
    const allBlocks = workspace.getAllBlocks(false);
    const connected = new Set();

    const roots = allBlocks.filter(isRootBlock);
    for (const root of roots) {
      const stack = [root];
      while (stack.length) {
        const block = stack.pop();
        if (connected.has(block.id)) continue;
        connected.add(block.id);

        const next = block.getNextBlock();
        if (next) stack.push(next);

        const children = block.getChildren(false);
        for (const child of children) {
          stack.push(child);
        }
      }
    }

    return allBlocks.filter((block) => !connected.has(block.id));
  };

  /**
   * 删除孤立积木。
   */
  const cleanOrphans = () => {
    const workspace = getWorkspace();
    if (!workspace) return;

    const orphans = findOrphans(workspace);
    if (orphans.length === 0) {
      ctx.toast.create({
        type: "info",
        id: "addon_clean_orphans_none",
        text: ctx.t("addon_clean-orphans:noOrphans"),
      });
      return;
    }

    const count = orphans.length;

    // 延迟执行删除，确保右键菜单先关闭
    setTimeout(() => {
      const prevGroup = Blockly.Events.getGroup?.();
      try {
        Blockly.Events.setGroup(true);
        for (const block of orphans) {
          block.dispose(false);
        }
      } finally {
        Blockly.Events.setGroup(prevGroup);
      }

      ctx.toast.create({
        type: "info",
        id: "addon_clean_orphans_done",
        text: ctx.t("addon_clean-orphans:cleaned", { count }),
      });
    }, 0);
  };

  /**
   * 给工作区注入"清理孤立积木"右键菜单项。
   */
  const hookWorkspace = (workspace) => {
    if (!workspace || workspace.__cleanOrphansHooked) return;
    workspace.__cleanOrphansHooked = true;

    const prev = workspace.configureContextMenu;

    workspace.configureContextMenu = (options, e) => {
      if (prev) prev(options, e);

      // scanOrphans=true（默认）：右键时做 BFS，无孤立积木则灰显菜单项。
      // scanOrphans=false：跳过右键时的 BFS，始终启用菜单项（BFS 推迟到点击时）。
      const scanOnOpen = ctx.settings.get("scanOrphans") !== false;
      let enabled = true;
      if (scanOnOpen) {
        enabled = findOrphans(workspace).length > 0;
      }

      options.push({ separator: true });
      options.push({
        id: "clean_orphans",
        text: ctx.t("addon_clean-orphans:menuLabel"),
        enabled,
        weight: 200,
        scope: { workspace },
        callback: () => {
          cleanOrphans();
        },
      });
    };
  };

  // 首次注入当前工作区
  const ws = getWorkspace();
  if (ws) hookWorkspace(ws);

  // 包装 Blockly.inject，确保新建的工作区也自动注入菜单项
  const originalInject = Blockly.inject.bind(Blockly);
  Blockly.inject = function (...args) {
    const workspace = originalInject(...args);
    hookWorkspace(workspace);
    return workspace;
  };

  return () => {
    // 恢复 Blockly.inject
    Blockly.inject = originalInject;

    // 移除当前工作区的 hook
    const workspace = getWorkspace();
    if (workspace && workspace.__cleanOrphansHooked) {
      delete workspace.__cleanOrphansHooked;
      // configureContextMenu 恢复为 null（原始值）
      workspace.configureContextMenu = null;
    }
  };
};
