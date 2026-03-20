const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;
const OUTPUT_DIR = path.join(__dirname, 'output');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

app.post('/submit', (req, res) => {
  const { data, headers, filename } = req.body;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(OUTPUT_DIR, filename || `prompts-${timestamp}.json`);

  // Build structured JSON: array of row objects keyed by header names
  const structured = data
    .filter(row => row.some(cell => cell !== ''))
    .map(row => {
      const obj = {};
      (headers || []).forEach((h, i) => {
        obj[h || `col_${i}`] = row[i] || '';
      });
      return obj;
    });

  const payload = {
    exported_at: new Date().toISOString(),
    rows: structured.length,
    data: structured
  };

  fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2));
  console.log(`[export] Saved ${structured.length} rows → ${outputFile}`);

  // Bridge to Claude Code: run `claude` CLI with the exported file as context
  const claudePrompt =
    `I have exported a prompt engineering spreadsheet to JSON.\n` +
    `File: ${outputFile}\n\n` +
    `Contents:\n${JSON.stringify(payload, null, 2)}\n\n` +
    `Please review this prompt engineering data and suggest improvements.`;

  const claude = spawn('claude', ['--print', claudePrompt], {
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60000
  });

  let stdout = '';
  let stderr = '';
  claude.stdout?.on('data', d => (stdout += d));
  claude.stderr?.on('data', d => (stderr += d));

  claude.on('close', code => {
    res.json({
      success: true,
      file: outputFile,
      rows: structured.length,
      claude_response: stdout || null,
      claude_error: code !== 0 ? stderr : null
    });
  });

  claude.on('error', () => {
    // Claude CLI not available — still report success for the file save
    res.json({
      success: true,
      file: outputFile,
      rows: structured.length,
      claude_response: null,
      claude_error: 'Claude CLI not found — file saved locally.'
    });
  });
});

// Save without invoking Claude
app.post('/save', (req, res) => {
  const { data, headers, filename } = req.body;
  if (!filename) return res.status(400).json({ success: false, error: 'filename required' });

  const outputFile = path.join(OUTPUT_DIR, path.basename(filename));
  const structured = data
    .filter(row => row.some(cell => cell !== ''))
    .map(row => {
      const obj = {};
      (headers || []).forEach((h, i) => { obj[h || `col_${i}`] = row[i] || ''; });
      return obj;
    });

  const payload = { exported_at: new Date().toISOString(), rows: structured.length, data: structured };
  fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2));
  console.log(`[save] ${structured.length} rows → ${outputFile}`);
  res.json({ success: true, file: outputFile, rows: structured.length });
});

app.listen(PORT, () => {
  console.log(`Prompt Engineering Tool running at http://localhost:${PORT}`);
});
