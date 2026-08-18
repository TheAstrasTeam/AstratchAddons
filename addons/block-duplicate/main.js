export default (ctx) => {
  const { blockly: Blockly, vm } = ctx;

  const getWorkspace = () => vm.runtime.blocks?.workspaceSvg ?? null;

  const getBlockAt = (workspace, clientX, clientY) => {
    const element = document.elementFromPoint(clientX, clientY);
    if (!element) return null;
    // 积木的 SVG 根元素带有 data-id
    const blockElement = element.closest("[data-id]");
    const blockID = blockElement?.getAttribute("data-id");
    if (!blockID) return null;
    const block = workspace.getBlockById(blockID);
    // 只处理主工作区（不含 flyout）的积木
    return block && block.workspace === workspace ? block : null;
  };

  const handleMouseDown = (event) => {
    // 忽略程序生成的合成事件，避免递归触发
    if (!event.isTrusted) return;

    const ctrlLeft = event.button === 0 && (event.ctrlKey || event.metaKey);
    const middle = event.button === 1;
    if (!ctrlLeft && !middle) return;

    const workspace = getWorkspace();
    if (!workspace) return;

    const block = getBlockAt(workspace, event.clientX, event.clientY);
    if (!block || block.isInFlyout || !block.isMovable()) return;
    if (!block.getRootBlock().isMovable()) return;

    event.preventDefault();
    event.stopPropagation();

    const wsXY = Blockly.utils.screenToWsCoordinates(
      workspace,
      new Blockly.utils.Coordinate(event.clientX, event.clientY),
    );

    const copyData = block.toCopyData();
    if (!copyData) return;
    const pasted = Blockly.clipboard.paste(copyData, workspace, wsXY);
    if (!pasted) return;

    pasted.select();

    // 让 Blockly 自己的手势接管拖拽：对复制出的积木派发一次 mousedown
    const svgRoot = pasted.getSvgRoot();
    svgRoot.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
        clientX: event.clientX,
        clientY: event.clientY,
      }),
    );
  };

  document.addEventListener("mousedown", handleMouseDown, true);

  return () => {
    document.removeEventListener("mousedown", handleMouseDown, true);
  };
};
