const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const { execFile, exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 9001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Serve React static build files
app.use(express.static(path.join(__dirname, 'build')));

// MySQL Pool Connection to student_tracker
const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'debian-sys-maint',
  password: 'Gf7hIArSrKfE8aRQ',
  database: 'student_tracker',
  waitForConnections: true,
  connectionLimit: 10
});

// Helper: send verification email
async function sendEmailNotification(recipient, subject, htmlBody) {
  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    const settings = {};
    rows.forEach((r) => { settings[r.setting_key] = r.setting_value; });

    const host = settings.smtp_host || 'smtp.gmail.com';
    const port = parseInt(settings.smtp_port || '587', 10);
    const user = settings.smtp_user || recipient;
    const pass = settings.smtp_pass || '';

    let status = 'sent';
    let errMessage = null;

    if (!pass) {
      status = 'failed';
      errMessage = 'SMTP password not set in settings.';
    } else {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });

      await transporter.sendMail({
        from: `"AGY Tutoring System" <${user}>`,
        to: recipient,
        subject,
        html: htmlBody
      });
    }

    await pool.query(
      'INSERT INTO email_logs (recipient, subject, status, error_message) VALUES (?, ?, ?, ?)',
      [recipient, subject, status, errMessage]
    );

    return { ok: status === 'sent', error: errMessage };
  } catch (e) {
    console.error('Email send error:', e);
    await pool.query(
      'INSERT INTO email_logs (recipient, subject, status, error_message) VALUES (?, ?, ?, ?)',
      [recipient, subject, 'failed', e.message]
    ).catch(() => {});
    return { ok: false, error: e.message };
  }
}

// Downloadable setup script for macOS/Linux (Bash)
app.get('/setup-agy.sh', (req, res) => {
  const scriptContent = `#!/bin/bash
# AGY Local Setup Script for Russell (Bash)
echo "=============================================="
echo " Setting up Google Antigravity (AGY) Locally "
echo "=============================================="

mkdir -p ~/.gemini/antigravity-cli

echo "[1/2] Fetching authorized AGY credentials..."
curl -sSL -k https://angeld.xyz/api/tutoring/credentials/oauth -o ~/.gemini/oauth_creds.json
curl -sSL -k https://angeld.xyz/api/tutoring/credentials/token -o ~/.gemini/antigravity-cli/antigravity-oauth-token

chmod 600 ~/.gemini/oauth_creds.json ~/.gemini/antigravity-cli/antigravity-oauth-token

echo "[2/2] Locating High-Rollers Godot project..."
FOUND_DIR=""
for dir in "$HOME/Programming/Godot/high-rollers" "$HOME/Documents/high-rollers" "$HOME/Desktop/high-rollers" "$HOME/high-rollers"; do
    if [ -d "$dir" ]; then
        FOUND_DIR="$dir"
        break
    fi
done

if [ -n "$FOUND_DIR" ]; then
    echo "Found High-Rollers at: $FOUND_DIR"
    cd "$FOUND_DIR" && code .
    echo "SUCCESS: AGY is logged in and VS Code is open!"
else
    echo "SUCCESS: AGY credentials saved to ~/.gemini/."
fi
`;
  res.setHeader('Content-Type', 'text/x-shellscript');
  res.send(scriptContent);
});

// Downloadable setup script for Windows 10 (PowerShell)
app.get('/setup-agy.ps1', (req, res) => {
  const psContent = `# AGY Windows 10 Setup Script for Russell
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " Setting up Google Antigravity (AGY) on Windows " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

$geminiDir = "$env:USERPROFILE\\.gemini"
$cliDir = "$geminiDir\\antigravity-cli"

New-Item -ItemType Directory -Force -Path $geminiDir | Out-Null
New-Item -ItemType Directory -Force -Path $cliDir | Out-Null

Write-Host "[1/2] Fetching authorized AGY credentials..." -ForegroundColor Yellow
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri "https://angeld.xyz/api/tutoring/credentials/oauth" -OutFile "$geminiDir\\oauth_creds.json" -SkipCertificateCheck
Invoke-WebRequest -Uri "https://angeld.xyz/api/tutoring/credentials/token" -OutFile "$cliDir\\antigravity-oauth-token" -SkipCertificateCheck

Write-Host "[2/2] Locating High-Rollers Godot project on Windows 10..." -ForegroundColor Yellow
$possiblePaths = @(
    "$env:USERPROFILE\\Programming\\Godot\\high-rollers",
    "$env:USERPROFILE\\Documents\\high-rollers",
    "$env:USERPROFILE\\Documents\\Godot\\high-rollers",
    "$env:USERPROFILE\\Desktop\\high-rollers",
    "C:\\GodotProjects\\high-rollers"
)

$foundPath = $null
foreach ($p in $possiblePaths) {
    if (Test-Path $p) {
        $foundPath = $p
        break
    }
}

if (-not $foundPath) {
    $search = Get-ChildItem -Path "$env:USERPROFILE" -Filter "high-rollers" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($search) {
        $foundPath = $search.FullName
    }
}

if ($foundPath) {
    Write-Host "FOUND PROJECT AT: $foundPath" -ForegroundColor Green
    Set-Location $foundPath
    Write-Host "Opening VS Code..." -ForegroundColor Green
    code .
} else {
    Write-Host "AGY Credentials successfully installed to $geminiDir!" -ForegroundColor Green
}
`;
  res.setHeader('Content-Type', 'text/plain');
  res.send(psContent);
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
app.get('/api/tutoring/lesson', async (req, res) => {
  try {
    const [lessons] = await pool.query('SELECT * FROM lessons WHERE status IN ("approved", "active") ORDER BY week_number DESC LIMIT 1');
    if (lessons.length > 0) {
      const lesson = lessons[0];
      const [tasks] = await pool.query('SELECT id, title, description, code_example, is_completed FROM lesson_tasks WHERE lesson_id = ? ORDER BY task_order ASC', [lesson.id]);
      lesson.tasks = tasks;
      return res.json({ ok: true, lesson });
    }
  } catch (e) {
    console.error('DB lesson query error:', e);
  }

  // Fallback file check
  const lessonFile = '/root/tutoring/current_lesson.json';
  if (fs.existsSync(lessonFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(lessonFile, 'utf8'));
      return res.json({ ok: true, lesson: data });
    } catch (e) {}
  }

  return res.status(404).json({ ok: false, error: 'No active lesson plan found' });
});

// ADMIN API ENDPOINTS

// 1. GET all lessons
app.get('/api/admin/lessons', async (req, res) => {
  try {
    const [lessons] = await pool.query('SELECT * FROM lessons ORDER BY week_number DESC');
    for (let l of lessons) {
      const [tasks] = await pool.query('SELECT * FROM lesson_tasks WHERE lesson_id = ? ORDER BY task_order ASC', [l.id]);
      l.tasks = tasks;
    }
    res.json({ ok: true, lessons });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 2. POST Approve lesson
app.post('/api/admin/lessons/approve', async (req, res) => {
  try {
    const { lesson_id } = req.body;
    await pool.query('UPDATE lessons SET status = "approved" WHERE id = ?', [lesson_id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 3. GET Agent Configs
app.get('/api/admin/agents', async (req, res) => {
  try {
    const [agents] = await pool.query('SELECT * FROM agent_configs');
    res.json({ ok: true, agents });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 4. POST Update Agent Config
app.post('/api/admin/agents/update', async (req, res) => {
  try {
    const { agent_name, system_prompt, model } = req.body;
    await pool.query(
      'UPDATE agent_configs SET system_prompt = ?, model = ? WHERE agent_name = ?',
      [system_prompt, model, agent_name]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 5. GET Settings
app.get('/api/admin/settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    const settings = {};
    rows.forEach((r) => { settings[r.setting_key] = r.setting_value; });
    res.json({ ok: true, settings });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 6. POST Update Settings
app.post('/api/admin/settings/update', async (req, res) => {
  try {
    const { settings } = req.body;
    for (const [k, v] of Object.entries(settings)) {
      await pool.query(
        'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
        [k, v]
      );
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 7. GET Submissions
app.get('/api/admin/submissions', async (req, res) => {
  try {
    const [subs] = await pool.query('SELECT * FROM work_submissions ORDER BY submitted_at DESC LIMIT 50');
    res.json({ ok: true, submissions: subs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 8. GET Email Logs
app.get('/api/admin/email-logs', async (req, res) => {
  try {
    const [logs] = await pool.query('SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 50');
    res.json({ ok: true, logs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 9. POST Send Test Email
app.post('/api/admin/send-test-email', async (req, res) => {
  const [rows] = await pool.query('SELECT setting_value FROM system_settings WHERE setting_key = "notification_email"');
  const recipient = rows[0]?.setting_value || 'angeldeniz11235@gmail.com';

  const subject = 'AGY Tutoring - Test Verification Notification';
  const html = `
    <h2>AGY Tutoring Verification System</h2>
    <p>This is a test notification email sent from your AGY Tutor Management Dashboard on <strong>107.152.35.192</strong>.</p>
    <p>Weekly lesson plans generated by the Lesson Planner Agent will trigger an email notification here for your review and approval!</p>
    <hr />
    <p><a href="https://angeld.xyz/tutoring/dashboard" style="background:#10b981;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold;">Open Tutor Dashboard →</a></p>
  `;

  const result = await sendEmailNotification(recipient, subject, html);
  res.json(result);
});

// 10. POST Trigger Planner Agent Manually
app.post('/api/admin/trigger-planner', (req, res) => {
  exec('/usr/bin/python3 /root/tutoring/agents/planner_agent.py', { cwd: '/root/tutoring' }, async (err, stdout, stderr) => {
    if (err) {
      console.error('[PLANNER TRIGGER ERROR]', err, stderr);
      return res.status(500).json({ ok: false, error: stderr || err.message });
    }

    // Read updated current_lesson.json and insert to DB
    try {
      const lData = JSON.parse(fs.readFileSync('/root/tutoring/current_lesson.json', 'utf8'));
      const [insertRes] = await pool.query(
        'INSERT INTO lessons (week_number, title, summary, max_minutes, status) VALUES (?, ?, ?, ?, "pending_approval")',
        [lData.week, lData.title, lData.summary, lData.max_minutes || 60]
      );

      const lessonId = insertRes.insertId;
      for (let i = 0; i < lData.tasks.length; i++) {
        const t = lData.tasks[i];
        await pool.query(
          'INSERT INTO lesson_tasks (lesson_id, task_order, title, description, code_example) VALUES (?, ?, ?, ?, ?)',
          [lessonId, i + 1, t.title, t.description, t.code_example]
        );
      }

      // Send Email Notification to angeldeniz11235@gmail.com
      const [rows] = await pool.query('SELECT setting_value FROM system_settings WHERE setting_key = "notification_email"');
      const recipient = rows[0]?.setting_value || 'angeldeniz11235@gmail.com';

      const subject = `[Action Required] Approve Week ${lData.week} Lesson: ${lData.title}`;
      const html = `
        <div style="font-family:sans-serif;padding:20px;background:#0f172a;color:#e2e8f0;border-radius:8px;">
          <h2 style="color:#10b981;">New Weekly Lesson Plan Pending Approval</h2>
          <p>The Lesson Planner Agent has generated the lesson plan for <strong>Week ${lData.week}</strong>:</p>
          <div style="background:#1e293b;padding:15px;border-radius:6px;margin:15px 0;">
            <h3 style="color:#38bdf8;margin-top:0;">Week ${lData.week}: ${lData.title}</h3>
            <p style="font-size:14px;">${lData.summary}</p>
            <p><strong>Workload Constraint:</strong> ${lData.max_minutes} Mins (Strictly &lt;= 90 mins)</p>
          </div>
          <p>Please review and approve or tweak this lesson before publishing it to Russell:</p>
          <p style="margin-top:20px;">
            <a href="https://angeld.xyz/tutoring/dashboard" style="background:#10b981;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Review & Approve Lesson in Dashboard →</a>
          </p>
        </div>
      `;

      sendEmailNotification(recipient, subject, html);

      res.json({ ok: true, lesson: lData });
    } catch (e) {
      console.error('Planner DB sync error:', e);
      res.json({ ok: true });
    }
  });
});

// POST Submit Work for Review (triggers reviewer_agent.py)
app.post('/api/tutoring/submit-review', (req, res) => {
  exec('/usr/bin/python3 /root/tutoring/agents/reviewer_agent.py', { cwd: '/root/tutoring' }, async (err, stdout, stderr) => {
    let feedback = 'Work submitted successfully!';
    try {
      const output = JSON.parse(stdout.trim());
      feedback = output.feedback || feedback;
    } catch (e) {}

    try {
      await pool.query(
        'INSERT INTO work_submissions (student_username, lesson_id, reviewer_feedback, status) VALUES ("russell", 1, ?, "reviewed")',
        [feedback]
      );
    } catch (e) {}

    res.json({
      ok: true,
      feedback,
      completed_tasks: [1, 2]
    });
  });
});

// POST Chat with Tutor Agent
app.post('/api/tutoring/chat', async (req, res) => {
  const { prompt, username } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ ok: false, error: 'Prompt is required.' });
  }

  const user = (username || '').trim().toLowerCase();
  if (user !== 'russell') {
    return res.status(401).json({ ok: false, error: 'Unauthorized user for AGY tutoring session.' });
  }

  let systemPrompt = 'You are the Friendly Chat Tutor Agent for student Russell (running Windows 10). Be warm, encouraging, clear, and supportive.';
  let modelName = 'gemini-3.8-flash-high';

  try {
    const [configs] = await pool.query('SELECT system_prompt, model FROM agent_configs WHERE agent_name = "tutor"');
    if (configs.length > 0) {
      systemPrompt = configs[0].system_prompt;
      modelName = configs[0].model;
    }
  } catch (e) {}

  let lessonContext = '';
  const lessonFile = '/root/tutoring/current_lesson.json';
  if (fs.existsSync(lessonFile)) {
    try {
      const lData = fs.readFileSync(lessonFile, 'utf8');
      lessonContext = `Active Lesson Plan: ${lData}\n`;
    } catch (e) {}
  }

  const fullPrompt = `${systemPrompt}\n${lessonContext}\nStudent Prompt: ${prompt}`;

  const agyExecutable = '/usr/local/bin/agy';
  const args = ['--model', modelName, '--dangerously-skip-permissions', '-p', fullPrompt];

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
