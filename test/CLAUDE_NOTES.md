# Claude Notes — ClaudeExcell

## Where we left off
Live AI Status/Note update from Claude edits is NOT fully working yet.

## The problem
When Claude edits a JSON file directly (e.g. `@test/prompts.json`), the browser
doesn't see the changes. The browser polls `/task-status` which only reads
`output/pending-tasks.json` — not whatever file the user shared with `@`.

## What's built so far
- `POST /submit` → saves spreadsheet to `output/pending-tasks.json` + timestamped file
- `POST /update-task { rowIndex, status, note }` → updates `pending-tasks.json`
- `GET /task-status` → returns `[{ status, note }]` for each row
- Browser polls `/task-status` every 2s from page load and updates AI Status + AI Note cells live

## What needs to be solved
The polling is hardcoded to read `output/pending-tasks.json`.
When user does `@some-other-file.json`, Claude edits that file but browser polls the wrong path.

## Agreed solution (not yet implemented)
Claude edits whatever file is shared via `@` directly (no `/update-task` calls needed).
Browser needs to poll the **currently active file path**, not a hardcoded one.

Options discussed:
1. Make polling path dynamic — track which file was last submitted/opened
2. Always use `output/pending-tasks.json` as the canonical file (user must use Send to Claude first)
3. Add a "Refresh" button as a simple fallback

## Current state of AI Status bug
The `renderStatusCell` bug (showing "None" even when value is "Done") was fixed by:
- Moving `td.appendChild(sel)` BEFORE `sel.value = value` (browser resets value on DOM insert)
- Removing `renderStatusCell` call from `appendRow` — let `renderAllCells()` handle it after DOM is ready

## Do NOT commit anything until user says so
User is managing commits manually.
