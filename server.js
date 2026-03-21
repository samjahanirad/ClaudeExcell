const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const OUTPUT_DIR = path.join(__dirname, 'output');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

const PENDING_FILE = path.join(OUTPUT_DIR, 'pending-tasks.json');

app.post('/submit', (req, res) => {
  const { data, headers, filename } = req.body;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(OUTPUT_DIR, filename || `prompts-${timestamp}.json`);

  const structured = data
    .filter(row => row.some(cell => cell !== ''))
    .map(row => {
      const obj = {};
      (headers || []).forEach((h, i) => { obj[h || `col_${i}`] = row[i] || ''; });
      return obj;
    });

  const payload = { exported_at: new Date().toISOString(), rows: structured.length, data: structured };

  fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2));
  fs.writeFileSync(PENDING_FILE, JSON.stringify(payload, null, 2));
  console.log(`[submit] ${structured.length} tasks → ${outputFile}`);
  console.log(`[submit] Pending tasks ready: ${PENDING_FILE}`);

  res.json({ success: true, file: outputFile, rows: structured.length });
});

// Claude calls this after completing each task
app.post('/update-task', (req, res) => {
  const { rowIndex, status, note } = req.body;
  if (!fs.existsSync(PENDING_FILE))
    return res.status(404).json({ success: false, error: 'No pending tasks' });

  const payload = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
  if (!payload.data[rowIndex])
    return res.status(400).json({ success: false, error: 'Row not found' });

  payload.data[rowIndex]['AI Status'] = status || 'Done';
  if (note !== undefined) payload.data[rowIndex]['AI Note'] = note;
  fs.writeFileSync(PENDING_FILE, JSON.stringify(payload, null, 2));
  console.log(`[update-task] row ${rowIndex} → ${status}`);
  res.json({ success: true });
});

// Browser polls this every 2s
app.get('/task-status', (req, res) => {
  if (!fs.existsSync(PENDING_FILE)) return res.json({ rows: [] });
  const payload = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
  res.json({
    rows: (payload.data || []).map(row => ({
      status: row['AI Status'] || '',
      note:   row['AI Note']   || ''
    }))
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
  console.log(`ClaudeExcell running at http://localhost:${PORT}`);
});
