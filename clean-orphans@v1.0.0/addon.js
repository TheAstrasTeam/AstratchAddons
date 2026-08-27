/**
 * 此文件由AI生成
 * 插件：Clean Orphans - 在工作区右键菜单添加"清理孤立积木"按钮
 *
 * "孤立积木"指未与任何根积木（脚本起点）相连的积木。
 * 根积木是没有 previousConnection 且没有 outputConnection 的积木（如事件帽子块）。
 */

// 模块级活跃标记：用于在 configureContextMenu 中判断本插件是否仍启用。
// 这样即使 cleanup 未能及时移除 hook（例如工作区已销毁），菜单也不会出现。
const activeInstances = new Set();

export default (ctx) => {
  const { blockly: Blockly, vm } = ctx;
  const ADDON_ID = "clean-orphans";
  const I18N_NS = `addon_${ADDON_ID}`;

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
   * 删除孤立积木并发送通知。
   */
  const deleteOrphans = (orphans) => {
    const count = orphans.length;
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
        text: ctx.t("cleaned", { ns: I18N_NS, count }),
      });
    }, 0);
  };

  /**
   * 点击菜单项时的处理逻辑。
   * scanOrphans=true 时 orphans 已在右键时预计算传入；
   * scanOrphans=false 时需即时做 BFS。
   */
  const cleanOrphans = (precomputed) => {
    const workspace = getWorkspace();
    if (!workspace) return;

    const orphans = precomputed ?? findOrphans(workspace);
    if (orphans.length === 0) {
      ctx.toast.create({
        type: "info",
        id: "addon_clean_orphans_none",
        text: ctx.t("noOrphans", { ns: I18N_NS }),
      });
      return;
    }

    deleteOrphans(orphans);
  };

  /**
   * 给工作区注入"清理孤立积木"右键菜单项。
   */
  const hookWorkspace = (workspace) => {
    if (!workspace || workspace.__cleanOrphansHooked) return;
    workspace.__cleanOrphansHooked = true;

    // 保存原始 configureContextMenu 以便 cleanup 时完整还原
    const prev = workspace.configureContextMenu;
    workspace.__cleanOrphansPrev = prev;

    workspace.configureContextMenu = (options, e) => {
      if (prev) prev(options, e);
      if (!activeInstances.has(ADDON_ID)) return;

      const scanOnOpen = ctx.settings.get("scanOrphans") !== false;

      if (scanOnOpen) {
        const orphans = findOrphans(workspace);
        const count = orphans.length;
        options.push({ separator: true });
        options.push({
          id: "clean_orphans",
          text:
            count > 0
              ? ctx.t("menuLabelCount", { ns: I18N_NS, count })
              : ctx.t("menuLabel", { ns: I18N_NS }),
          enabled: count > 0,
          weight: 200,
          scope: { workspace },
          callback: () => {
            cleanOrphans(orphans);
          },
        });
      } else {
        options.push({ separator: true });
        options.push({
          id: "clean_orphans",
          text: ctx.t("menuLabel", { ns: I18N_NS }),
          enabled: true,
          weight: 200,
          scope: { workspace },
          callback: () => {
            cleanOrphans();
          },
        });
      }
    };
  };

  /**
   * 还原指定工作区的 configureContextMenu。
   */
  const unhookWorkspace = (workspace) => {
    if (!workspace || !workspace.__cleanOrphansHooked) return;
    delete workspace.__cleanOrphansHooked;
    // 恢复原始的 configureContextMenu（hook 中闭包捕获的 prev），
    // 而非置 null——否则会破坏其他插件或核心代码设置的回调。
    workspace.configureContextMenu =
      workspace.__cleanOrphansPrev ?? null;
    delete workspace.__cleanOrphansPrev;
  };

  // 标记为活跃
  activeInstances.add(ADDON_ID);

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

  // 监听目标切换：切换目标后工作区会被重建，
  // 通过此事件确保新工作区也能被 hook。
  // 这解决了"默认启用时工作区尚未创建"的时序问题。
  const onSwitchTarget = () => {
    if (!activeInstances.has(ADDON_ID)) return;
    const workspace = getWorkspace();
    if (workspace) hookWorkspace(workspace);
  };
  vm.on("switch_target", onSwitchTarget);

  return () => {
    activeInstances.delete(ADDON_ID);
    Blockly.inject = originalInject;
    vm.off("switch_target", onSwitchTarget);

    // 还原当前工作区
    const workspace = getWorkspace();
    unhookWorkspace(workspace);
  };
};
