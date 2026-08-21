export default (ctx) => {
  const { blockly: Blockly, vm } = ctx;

  // 获取主工作区（与 block-duplicate 插件保持一致）
  const getWorkspace = () => vm.runtime.blocks?.workspaceSvg ?? null;

  // 从指针坐标找积木：积木的 SVG 根元素带有 data-id
  const getBlockAt = (workspace, clientX, clientY) => {
    const element = document.elementFromPoint(clientX, clientY);
    if (!element) return null;
    const blockElement = element.closest("[data-id]");
    const blockID = blockElement?.getAttribute("data-id");
    if (!blockID) return null;
    const block = workspace.getBlockById(blockID);
    // 只处理主工作区（不含 flyout）的积木
    return block && block.workspace === workspace ? block : null;
  };

  const handlePointerDown = (event) => {
    // 忽略程序生成的合成事件，避免递归触发
    if (!event.isTrusted) return;
    // 仅处理带 Alt 的左键
    if (event.button !== 0 || !event.altKey) return;
    // Ctrl+Alt+click 为"摘选"：只复制被点击的那一个积木
    const cherryPick = event.ctrlKey;

    const workspace = getWorkspace();
    if (!workspace) return;

    const block = getBlockAt(workspace, event.clientX, event.clientY);
    if (!block || block.isInFlyout || !block.isMovable()) return;
    if (!block.getRootBlock().isMovable()) return;

    // 阻止 Blockly 自己的手势，改用下面的方式处理
    event.preventDefault();
    event.stopPropagation();

    // 副本放在被点击积木的原始位置，这样副本相对鼠标的偏移
    // 与原件相对鼠标的偏移一致（在鼠标下用相同的抓取点拖拽）。
    // 普通 Alt+click 复制整条堆叠（addNextBlocks: true）；
    // Ctrl+Alt+click 摘选只复制被点击的积木（addNextBlocks: false）。
    const originalXY = block.getRelativeToSurfaceXY();
    const copyData = block.toCopyData(!cherryPick);
    if (!copyData) return;
    const pasted = Blockly.clipboard.paste(copyData, workspace, originalXY.clone());
    if (!pasted) return;

    pasted.select();

    // 手动登记指针 id：我们的 capture 阶段处理器已经 stopPropagation，
    // Blockly 自己的 pointerdown 绑定不会执行，导致其内部的 touch
    // identifier 未被记录，pointerup 时 handleUp 会被 ea() 拦下而无法
    // 结束拖拽。这里补上登记，这样松开鼠标就会正常结束拖拽并放下积木。
    Blockly.Touch?.checkTouchIdentifier?.(event);

    // 让 Blockly 手势从被复制出的积木上开始（并绑定 pointermove/pointerup）
    const gesture = workspace.getGesture(event);
    if (!gesture) return;

    try {
      // 先把副本对齐到原件位置，避免 paste 内部的 bump 把副本挪开
      pasted.moveTo(originalXY);

      gesture.handleBlockStart(event, pasted);
      gesture.handleWsStart(event, workspace);

      // 关闭本次拖拽的接点吸附：副本与原件重叠，
      // 若不禁止吸附会立刻吸附到原件的接点上。
      // 需要在 updateIsDragging 之前调用。
      gesture.suppressConnectionSnapping?.();

      // 强制立刻越过拖拽半径并在副本所在位置开始拖拽
      gesture.hasExceededDragRadius = true;
      gesture.updateIsDragging(event);

      const dragger = gesture.getCurrentDragger();
      if (dragger) {
        // 旧版 Astratch 兼容：没有补丁时直接关闭拖拽器的吸附
        if (!gesture.suppressConnectionSnapping) dragger.getSearchRadius = () => 0;
        // startDrag 时 BlockDragger 记录的是"积木位置 vs 鼠标位置"的偏移，
        // 让偏移等于"原件 vs 鼠标"的偏移（即 startLoc = 原件位置）
        dragger.startLoc = originalXY;
      }
    } catch (error) {
      console.error("Alt-click copy drag failed:", error);
    }
  };

  document.addEventListener("pointerdown", handlePointerDown, true);

  return () => {
    document.removeEventListener("pointerdown", handlePointerDown, true);
  };
};