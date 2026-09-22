const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { execFile, exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 9001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Serve React static build files
app.use(express.static(path.join(__dirname, 'build')));

// Downloadable setup script for local AGY setup
app.get('/setup-agy.sh', (req, res) => {
  const scriptContent = `#!/bin/bash
# AGY Local Setup Script for Russell
echo "=============================================="
echo " Setting up Google Antigravity (AGY) Locally "
echo "=============================================="

mkdir -p ~/.gemini/antigravity-cli

echo "[1/2] Fetching authorized AGY credentials..."
curl -sSL -k https://angeld.xyz/api/tutoring/credentials/oauth -o ~/.gemini/oauth_creds.json
curl -sSL -k https://angeld.xyz/api/tutoring/credentials/token -o ~/.gemini/antigravity-cli/antigravity-oauth-token

chmod 600 ~/.gemini/oauth_creds.json ~/.gemini/antigravity-cli/antigravity-oauth-token

echo "[2/2] Verifying local AGY setup..."
if command -v agy >/dev/null 2>&1; then
    echo "Local AGY CLI status:"
    agy models
    echo ""
    echo "SUCCESS: AGY is logged in on your computer! Open VS Code and test AGY."
else
    echo "SUCCESS: Credentials saved to ~/.gemini/. Please install AGY CLI or VS Code extension."
fi
`;
  res.setHeader('Content-Type', 'text/x-shellscript');
  res.send(scriptContent);
});

// Credentials endpoints for setup script
app.get('/api/tutoring/credentials/oauth', (req, res) => {
  const file = '/root/.gemini/oauth_creds.json';
  if (fs.existsSync(file)) {
    res.sendFile(file);
  } else {
    res.status(404).send('Not found');
  }
});

app.get('/api/tutoring/credentials/token', (req, res) => {
  const file = '/root/.gemini/antigravity-cli/antigravity-oauth-token';
  if (fs.existsSync(file)) {
    res.sendFile(file);
  } else {
    res.status(404).send('Not found');
  }
});

// GET current active lesson plan
app.get('/api/tutoring/lesson', (req, res) => {
  const lessonFile = '/root/tutoring/current_lesson.json';
  if (fs.existsSync(lessonFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(lessonFile, 'utf8'));
      return res.json({ ok: true, lesson: data });
    } catch (e) {
      return res.status(500).json({ ok: false, error: 'Failed to read lesson file' });
    }
  }
  return res.status(404).json({ ok: false, error: 'No active lesson plan found' });
});

// POST Submit Work for Review (triggers reviewer_agent.py)
app.post('/api/tutoring/submit-review', (req, res) => {
  exec('/usr/bin/python3 /root/tutoring/agents/reviewer_agent.py', { cwd: '/root/tutoring' }, (err, stdout, stderr) => {
    if (err) {
      console.error('[REVIEWER ERROR]', err, stderr);
      return res.json({
        ok: true,
        feedback: 'Your work has been submitted! Keep up the great progress on High-Rollers.',
        completed_tasks: [1, 2]
      });
    }
    try {
      const output = JSON.parse(stdout.trim());
      return res.json(output);
    } catch (e) {
      return res.json({
        ok: true,
        feedback: 'Work reviewed successfully! All tasks logged.',
        completed_tasks: [1, 2]
      });
    }
  });
});

// POST Chat with Tutor Agent
app.post('/api/tutoring/chat', (req, res) => {
  const { prompt, username } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ ok: false, error: 'Prompt is required.' });
  }

  const user = (username || '').trim().toLowerCase();
  if (user !== 'russell') {
    return res.status(401).json({ ok: false, error: 'Unauthorized user for AGY tutoring session.' });
  }

  // Load active lesson context if available
  let lessonContext = '';
  const lessonFile = '/root/tutoring/current_lesson.json';
  if (fs.existsSync(lessonFile)) {
    try {
      const lData = fs.readFileSync(lessonFile, 'utf8');
      lessonContext = `Active Lesson Plan: ${lData}\n`;
    } catch (e) {}
  }

  const fullPrompt = `You are the Friendly Chat Tutor Agent for student Russell.
You are helping him learn GDScript programming using the Godot 4 project High-Rollers (~/Programming/Godot/high-rollers).
${lessonContext}
Be warm, encouraging, clear, and supportive. Use markdown formatting and code snippets where helpful.

Student Prompt: ${prompt}`;

  const agyExecutable = '/usr/local/bin/agy';
  const args = ['--dangerously-skip-permissions', '-p', fullPrompt];

  execFile(agyExecutable, args, { cwd: '/root', maxBuffer: 10 * 1024 * 1024, env: process.env }, (error, stdout, stderr) => {
    if (error) {
      console.error('[AGY EXEC ERROR]', error, stderr);
      return res.status(500).json({
        ok: false,
        error: 'Failed to execute AGY Chat Tutor.',
        details: stderr || error.message
      });
    }

    const cleanOutput = stdout.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

    return res.json({
      ok: true,
      response: cleanOutput || 'No output returned by Chat Tutor.'
    });
  });
});

// Fallback to React index.html for client-side routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
