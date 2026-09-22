const express = require('express');
const cors = require('cors');
const path = require('path');
const { execFile } = require('child_process');

const app = express();
const PORT = process.env.PORT || 9001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Serve React static build files
app.use(express.static(path.join(__dirname, 'build')));

// API route for AGY tutoring chat
app.post('/api/tutoring/chat', (req, res) => {
  const { prompt, username } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ ok: false, error: 'Prompt is required.' });
  }

  const user = (username || '').trim().toLowerCase();
  if (user !== 'russell') {
    return res.status(401).json({ ok: false, error: 'Unauthorized user for AGY tutoring session.' });
  }

  // Execute agy agent on the server
  const agyExecutable = '/usr/local/bin/agy';
  const args = ['--dangerously-skip-permissions', '-p', prompt];

  execFile(agyExecutable, args, { cwd: '/root', maxBuffer: 10 * 1024 * 1024, env: process.env }, (error, stdout, stderr) => {
    if (error) {
      console.error('[AGY EXEC ERROR]', error, stderr);
      return res.status(500).json({
        ok: false,
        error: 'Failed to execute AGY agent.',
        details: stderr || error.message
      });
    }

    // Clean any ANSI escape sequences from output
    const cleanOutput = stdout.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

    return res.json({
      ok: true,
      response: cleanOutput || 'No output returned by AGY.'
    });
  });
});

// Fallback to React index.html for client-side routing (React Router)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
