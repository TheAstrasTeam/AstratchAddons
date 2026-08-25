# Clean Orphans

Adds a "Clean orphans" button to the workspace right-click menu.

## What are orphans?

Orphan blocks are blocks that are **not connected to any root block** (scripts). A root block is a block that has no `previousConnection` and no `outputConnection` — typically event/hat blocks that start a script.

For example, if you disconnect a block from a "when green flag clicked" script, the disconnected block becomes an orphan.

## Usage

1. Enable this addon
2. Right-click on the workspace (not on a block)
3. Click **"Clean orphans"** (or **"清理孤立积木"** in Chinese)
4. All orphan blocks will be removed at once

If there are no orphan blocks, the menu item will be grayed out.

## Notes

- All deleted orphans are grouped into a single undo step — press Ctrl+Z to restore them all at once.
- Only blocks on the main workspace are affected. Blocks in the flyout (toolbox) are not touched.
