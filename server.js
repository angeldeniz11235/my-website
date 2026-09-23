// Helper to set current active lesson in DB & current_lesson.json
async function setCurrentLessonInDBAndFile(lessonId) {
  await pool.query('UPDATE lessons SET status = "approved" WHERE status = "active"');
  await pool.query('UPDATE lessons SET status = "active" WHERE id = ?', [lessonId]);

  const [lessons] = await pool.query('SELECT * FROM lessons WHERE id = ?', [lessonId]);
  if (lessons.length > 0) {
    const l = lessons[0];
    const [tasks] = await pool.query('SELECT id, task_order, title, description, code_example, is_completed FROM lesson_tasks WHERE lesson_id = ? ORDER BY task_order ASC', [lessonId]);
    const lessonData = {
      week: l.week_number,
      title: l.title,
      summary: l.summary,
      max_minutes: l.max_minutes,
      tasks: tasks.map(t => ({
        id: t.task_order,
        db_id: t.id,
        title: t.title,
        description: t.description,
        code_example: t.code_example,
        completed: Boolean(t.is_completed)
      }))
    };
    try {
      fs.writeFileSync('/root/tutoring/current_lesson.json', JSON.stringify(lessonData, null, 2));
    } catch (e) {
      console.error('Error writing current_lesson.json:', e);
    }
  }
}
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

// Setup scripts endpoints
app.get('/setup-agy.sh', (req, res) => {
  const scriptContent = `#!/bin/bash
echo "=============================================="
echo " Setting up Google Antigravity (AGY) Locally "
echo "=============================================="
mkdir -p ~/.gemini/antigravity-cli
curl -sSL -k https://angeld.xyz/api/tutoring/credentials/oauth -o ~/.gemini/oauth_creds.json
curl -sSL -k https://angeld.xyz/api/tutoring/credentials/token -o ~/.gemini/antigravity-cli/antigravity-oauth-token
chmod 600 ~/.gemini/oauth_creds.json ~/.gemini/antigravity-cli/antigravity-oauth-token
`;
  res.setHeader('Content-Type', 'text/x-shellscript');
  res.send(scriptContent);
});

app.get('/setup-agy.ps1', (req, res) => {
  const psContent = `# AGY Windows 10 Setup Script for Russell
Write-Host "Setting up Google Antigravity (AGY) on Windows 10" -ForegroundColor Cyan
$geminiDir = "$env:USERPROFILE\\.gemini"
$cliDir = "$geminiDir\\antigravity-cli"
New-Item -ItemType Directory -Force -Path $geminiDir | Out-Null
New-Item -ItemType Directory -Force -Path $cliDir | Out-Null
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri "https://angeld.xyz/api/tutoring/credentials/oauth" -OutFile "$geminiDir\\oauth_creds.json" -SkipCertificateCheck
Invoke-WebRequest -Uri "https://angeld.xyz/api/tutoring/credentials/token" -OutFile "$cliDir\\antigravity-oauth-token" -SkipCertificateCheck
`;
  res.setHeader('Content-Type', 'text/plain');
  res.send(psContent);
});

app.get('/api/tutoring/credentials/oauth', (req, res) => {
  const file = '/root/.gemini/oauth_creds.json';
  if (fs.existsSync(file)) res.sendFile(file);
  else res.status(404).send('Not found');
});

app.get('/api/tutoring/credentials/token', (req, res) => {
  const file = '/root/.gemini/antigravity-cli/antigravity-oauth-token';
  if (fs.existsSync(file)) res.sendFile(file);
  else res.status(404).send('Not found');
});

app.get('/api/tutoring/lesson', async (req, res) => {
  try {
    let [lessons] = await pool.query('SELECT * FROM lessons WHERE status = "active" LIMIT 1');
    if (lessons.length === 0) {
      [lessons] = await pool.query('SELECT * FROM lessons WHERE status = "approved" ORDER BY week_number DESC LIMIT 1');
    }
    if (lessons.length > 0) {
      const lesson = lessons[0];
      const [tasks] = await pool.query('SELECT id, task_order, title, description, code_example, is_completed FROM lesson_tasks WHERE lesson_id = ? ORDER BY task_order ASC', [lesson.id]);
      lesson.tasks = tasks;
      lesson.week = lesson.week_number;
      return res.json({ ok: true, lesson });
    }
  } catch (e) {}

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

app.post('/api/admin/lessons/approve', async (req, res) => {
  try {
    const { lesson_id, set_current, send_student_email, custom_email_body } = req.body;
    if (set_current !== false) {
      await setCurrentLessonInDBAndFile(lesson_id);
    } else {
      await pool.query('UPDATE lessons SET status = "approved" WHERE id = ?', [lesson_id]);
    }

    let emailResult = null;
    if (send_student_email) {
      const [lessons] = await pool.query('SELECT * FROM lessons WHERE id = ?', [lesson_id]);
      if (lessons.length > 0) {
        const l = lessons[0];
        const [setRows] = await pool.query('SELECT setting_key, setting_value FROM system_settings');
        const settings = {};
        setRows.forEach(r => { settings[r.setting_key] = r.setting_value; });

        const studentEmail = settings.student_email || settings.notification_email || 'angeldeniz11235@gmail.com';
        const defaultSubject = 'New AGY Lesson Ready: Week {week_number} - {lesson_title}';
        const defaultBody = 'Hi Russell,\n\nYour new lesson for Week {week_number} ({lesson_title}) is ready!\n\nPlease log in to access your lesson plan and interactive chat tutor:\n{login_link}\n\nHappy coding!\nAGY Tutoring System';

        const loginLink = 'https://angeld.xyz/tutoring/login';

        let subject = (settings.student_email_template_subject || defaultSubject)
          .replace(/\{week_number\}/g, l.week_number)
          .replace(/\{lesson_title\}/g, l.title);

        let rawBody = custom_email_body || settings.student_email_template_body || defaultBody;
        rawBody = rawBody
          .replace(/\{week_number\}/g, l.week_number)
          .replace(/\{lesson_title\}/g, l.title)
          .replace(/\{login_link\}/g, loginLink);

        const htmlBody = `
          <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px;">
            <h2 style="color: #10b981; margin-top: 0;">🎓 New AGY Lesson Ready!</h2>
            <div style="background-color: #1e293b; padding: 16px; border-radius: 8px; border: 1px solid #334155; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #e2e8f0;">${rawBody}</div>
            <div style="margin-top: 20px; text-align: center;">
              <a href="${loginLink}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Log In to Tutoring Workspace →
              </a>
            </div>
          </div>
        `;

        emailResult = await sendEmailNotification(studentEmail, subject, htmlBody);
      }
    }

    res.json({ ok: true, email_sent: Boolean(emailResult?.ok), email_error: emailResult?.error });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/admin/lessons/set-current', async (req, res) => {
  try {
    const { lesson_id } = req.body;
    const [rows] = await pool.query('SELECT status FROM lessons WHERE id = ?', [lesson_id]);
    if (rows.length === 0) return res.status(404).json({ ok: false, error: 'Lesson not found' });
    if (rows[0].status === 'pending_approval') {
      return res.status(400).json({ ok: false, error: 'Cannot set unapproved lesson as current. Please approve the lesson first.' });
    }
    await setCurrentLessonInDBAndFile(lesson_id);
    res.json({ ok: true, message: 'Set as current lesson successfully!' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Interactive AI Lesson Editor endpoint
app.post('/api/admin/lessons/ai-edit', async (req, res) => {
  try {
    const { lesson_id, prompt } = req.body;
    const [rows] = await pool.query('SELECT * FROM lessons WHERE id = ?', [lesson_id]);
    if (rows.length === 0) return res.status(404).json({ ok: false, error: 'Lesson not found' });
    const lesson = rows[0];

    const [tasks] = await pool.query('SELECT * FROM lesson_tasks WHERE lesson_id = ? ORDER BY task_order ASC', [lesson_id]);
    lesson.tasks = tasks;

    const editPrompt = `You are an expert GDScript teacher editing an existing lesson plan for student Russell.
Existing Lesson JSON: ${JSON.stringify(lesson)}
Tutor Requested Changes: ${prompt}

Return ONLY a raw JSON object with updated lesson structure:
{
  "week_number": ${lesson.week_number},
  "title": "Updated Title",
  "summary": "Updated Summary",
  "max_minutes": 60,
  "tasks": [
    { "title": "Task 1", "description": "Step 1", "code_example": "..." }
  ]
}`;

    execFile('/usr/local/bin/agy', ['--dangerously-skip-permissions', '-p', editPrompt], { cwd: '/root', maxBuffer: 10 * 1024 * 1024 }, async (err, stdout) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      try {
        const start = stdout.indexOf('{');
        const end = stdout.lastIndexOf('}') + 1;
        const updated = JSON.parse(stdout.substring(start, end));

        await pool.query('UPDATE lessons SET title = ?, summary = ?, max_minutes = ? WHERE id = ?', [updated.title, updated.summary, updated.max_minutes || 60, lesson_id]);
        await pool.query('DELETE FROM lesson_tasks WHERE lesson_id = ?', [lesson_id]);

        if (updated.tasks) {
          for (let i = 0; i < updated.tasks.length; i++) {
            const t = updated.tasks[i];
            await pool.query('INSERT INTO lesson_tasks (lesson_id, task_order, title, description, code_example) VALUES (?, ?, ?, ?, ?)', [lesson_id, i + 1, t.title, t.description, t.code_example]);
          }
        }
        return res.json({ ok: true, message: 'Lesson updated via AI Assistant!' });
      } catch (e) {
        return res.status(500).json({ ok: false, error: 'Failed to parse AI response' });
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Delete Lesson endpoint (With override protection)
app.post('/api/admin/lessons/delete', async (req, res) => {
  try {
    const { lesson_id, override } = req.body;
    const [lessons] = await pool.query('SELECT status FROM lessons WHERE id = ?', [lesson_id]);
    const [subs] = await pool.query('SELECT COUNT(*) as cnt FROM work_submissions WHERE lesson_id = ?', [lesson_id]);

    const isProtected = (lessons.length > 0 && (lessons[0].status === 'approved' || lessons[0].status === 'active')) || (subs.length > 0 && subs[0].cnt > 0);

    if (isProtected && override !== true) {
      return res.json({
        ok: false,
        requires_override: true,
        message: 'This lesson has submitted/verified work or is approved. Please check override to confirm deletion.'
      });
    }

    await pool.query('DELETE FROM lesson_tasks WHERE lesson_id = ?', [lesson_id]);
    await pool.query('DELETE FROM lessons WHERE id = ?', [lesson_id]);
    res.json({ ok: true, message: 'Lesson deleted successfully.' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/admin/agents', async (req, res) => {
  try {
    const [agents] = await pool.query('SELECT * FROM agent_configs');
    res.json({ ok: true, agents });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

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

app.get('/api/admin/submissions', async (req, res) => {
  try {
    const [subs] = await pool.query('SELECT * FROM work_submissions ORDER BY submitted_at DESC LIMIT 50');
    res.json({ ok: true, submissions: subs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/admin/email-logs', async (req, res) => {
  try {
    const [logs] = await pool.query('SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 50');
    res.json({ ok: true, logs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/admin/send-test-student-email', async (req, res) => {
  try {
    const [setRows] = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    const settings = {};
    setRows.forEach(r => { settings[r.setting_key] = r.setting_value; });

    const studentEmail = settings.student_email || settings.notification_email || 'angeldeniz11235@gmail.com';
    const defaultSubject = 'New AGY Lesson Ready: Week {week_number} - {lesson_title}';
    const defaultBody = 'Hi Russell,\n\nYour new lesson for Week {week_number} ({lesson_title}) is ready!\n\nPlease log in to access your lesson plan and interactive chat tutor:\n{login_link}\n\nHappy coding!\nAGY Tutoring System';

    const loginLink = 'https://angeld.xyz/tutoring/login';
    const weekNum = 2;
    const lessonTitle = 'Turn Flow and Transition UI (Sample Test)';

    let subject = (settings.student_email_template_subject || defaultSubject)
      .replace(/\{week_number\}/g, weekNum)
      .replace(/\{lesson_title\}/g, lessonTitle);

    let rawBody = (settings.student_email_template_body || defaultBody)
      .replace(/\{week_number\}/g, weekNum)
      .replace(/\{lesson_title\}/g, lessonTitle)
      .replace(/\{login_link\}/g, loginLink);

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px;">
        <h2 style="color: #10b981; margin-top: 0;">🎓 [TEST] New AGY Lesson Ready!</h2>
        <div style="background-color: #1e293b; padding: 16px; border-radius: 8px; border: 1px solid #334155; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #e2e8f0;">${rawBody}</div>
        <div style="margin-top: 20px; text-align: center;">
          <a href="${loginLink}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Log In to Tutoring Workspace →
          </a>
        </div>
      </div>
    `;

    const result = await sendEmailNotification(studentEmail, `[TEST] ${subject}`, htmlBody);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/admin/send-test-email', async (req, res) => {
  const [rows] = await pool.query('SELECT setting_value FROM system_settings WHERE setting_key = "notification_email"');
  const recipient = rows[0]?.setting_value || 'angeldeniz11235@gmail.com';

  const subject = 'AGY Tutoring - Test Verification Notification';
  const html = `<h2>AGY Tutoring Verification</h2><p>Test notification email.</p>`;

  const result = await sendEmailNotification(recipient, subject, html);
  res.json(result);
});

app.post('/api/admin/trigger-planner', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT COALESCE(MAX(week_number), 0) + 1 AS next_week FROM lessons');
    const nextWeek = rows[0]?.next_week || 1;

    exec(`/usr/bin/python3 /root/tutoring/agents/planner_agent.py --next-week ${nextWeek}`, { cwd: '/root/tutoring' }, async (err) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      try {
        const lData = JSON.parse(fs.readFileSync('/root/tutoring/current_lesson.json', 'utf8'));
        lData.week = nextWeek;
        const [insertRes] = await pool.query(
          'INSERT INTO lessons (week_number, title, summary, max_minutes, status) VALUES (?, ?, ?, ?, "pending_approval")',
          [nextWeek, lData.title, lData.summary, lData.max_minutes || 60]
        );
        const lessonId = insertRes.insertId;
        for (let i = 0; i < lData.tasks.length; i++) {
          const t = lData.tasks[i];
          await pool.query(
            'INSERT INTO lesson_tasks (lesson_id, task_order, title, description, code_example) VALUES (?, ?, ?, ?, ?)',
            [lessonId, i + 1, t.title, t.description, t.code_example]
          );
        }
        res.json({ ok: true, lesson: lData });
      } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/tutoring/submit-review', (req, res) => {
  exec('/usr/bin/python3 /root/tutoring/agents/reviewer_agent.py', { cwd: '/root/tutoring', maxBuffer: 10 * 1024 * 1024 }, async (err, stdout) => {
    let feedback = 'Work submitted for review! No new remote commits detected yet. Remember to stage, commit, and push your changes (git commit -am "..." && git push origin main) so the server can verify your work!';
    let completedTasks = [];
    let lessonId = 1;

    if (stdout) {
      try {
        const start = stdout.indexOf('{');
        const end = stdout.lastIndexOf('}') + 1;
        if (start !== -1 && end !== -1) {
          const parsed = JSON.parse(stdout.substring(start, end));
          feedback = parsed.feedback || feedback;
          completedTasks = parsed.completed_task_ids || [];
        }
      } catch (e) {
        console.error('Error parsing reviewer output:', e);
      }
    }

    try {
      const [activeLessons] = await pool.query('SELECT id FROM lessons WHERE status = "active" LIMIT 1');
      if (activeLessons.length > 0) lessonId = activeLessons[0].id;

      await pool.query(
        'INSERT INTO work_submissions (student_username, lesson_id, reviewer_feedback, status) VALUES ("russell", ?, ?, "reviewed")',
        [lessonId, feedback]
      );
    } catch (e) {
      console.error('Error inserting work_submission:', e);
    }

    res.json({ ok: true, feedback, completed_tasks: completedTasks });
  });
});

app.post('/api/tutoring/chat', async (req, res) => {
  const { prompt, username } = req.body;
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ ok: false, error: 'Prompt is required.' });

  const user = (username || '').trim().toLowerCase();
  if (user !== 'russell') return res.status(401).json({ ok: false, error: 'Unauthorized user' });

  let systemPrompt = 'You are the Friendly Chat Tutor Agent for student Russell.';
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
      lessonContext = `Active Lesson Plan: ${fs.readFileSync(lessonFile, 'utf8')}\n`;
    } catch (e) {}
  }

  const fullPrompt = `${systemPrompt}\n${lessonContext}\nStudent Prompt: ${prompt}`;
  execFile('/usr/local/bin/agy', ['--model', modelName, '--dangerously-skip-permissions', '-p', fullPrompt], { cwd: '/root', maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
    if (error) return res.status(500).json({ ok: false, error: 'Execution error' });
    const cleanOutput = stdout.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
    return res.json({ ok: true, response: cleanOutput || 'No output' });
  });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
