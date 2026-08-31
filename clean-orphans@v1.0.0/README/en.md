# Clean Orphans

Adds a "Clean orphans" button to the workspace right-click menu to clean orphaned blocks (those without a hat block at the top) .

## Settings

| Name | Default | Description |
| --- | --- | --- |
| scan orphans on open | `true` | Pre-scan orphans when the context menu is opened. |

### scan orphans on open

When **enabled** (default), the addon traverses (BFS) the entire workspace every time you right-click to detect orphan blocks. The menu label displays the current orphan count (e.g. "Clean orphans (3)"), giving you immediate feedback before deleting.

When **disabled**, the BFS scan is skipped on menu open. The menu always shows a generic "Clean orphans" label with no count. The scan only runs when you actually click the button. This can significantly improve performance on large projects with many blocks, since the traversal is no longer triggered on every right-click.

