# ClaudeExcell

A spreadsheet-style prompt engineering editor that integrates with Claude Code.

## Requirements

- [Node.js](https://nodejs.org) v18 or higher
- macOS / Linux / Windows

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/samjahanirad/ClaudeExcell.git
cd ClaudeExcell

# 2. Install dependencies
npm install

# 3. Register the global command (once)
npm link
```

## Run

```bash
claudeExcell
```

This starts the server on `http://localhost:3000` and opens it in your browser automatically. If it's already running, it just opens the browser.

## Uninstall global command

```bash
npm unlink -g excell-editor
```
