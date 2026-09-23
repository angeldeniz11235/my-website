# AGY Multi-Agent Tutoring System - Server Administration Guide

This document contains administrative, architectural, and operational reference knowledge for the AGY Multi-Agent Tutoring System hosted on `107.152.35.192`.

---

## 1. System Architecture Overview

- **Host IP**: `107.152.35.192`
- **Domain**: `https://angeld.xyz`
- **Application Directory**: `/root/www/my-website`
- **Tutoring Agents Directory**: `/root/tutoring/`
- **Node.js Process Manager**: PM2 App `my-website-app` (ID 6, running Express on port 9001)
- **Database**: MySQL DB `student_tracker` (Config: `--defaults-file=/etc/mysql/debian.cnf`)
- **Web Server / Proxy**: Nginx with SSL & `proxy_read_timeout 300s;`
- **Godot 4 Headless Engine**: `/usr/local/bin/godot`

---

## 2. Key Services & Paths

| Component | Location / Service | Description |
|---|---|---|
| **Express Backend & Static Website** | `/root/www/my-website/server.js` | Backend API for student chat, dashboard, and settings |
| **PM2 Process** | `pm2 restart my-website-app` | Node.js runtime process (ID 6) |
| **MySQL Database** | `mysql --defaults-file=/etc/mysql/debian.cnf -D student_tracker` | Database storing lessons, tasks, agent configs, and settings |
| **Lesson Planner Agent** | `/root/tutoring/agents/planner_agent.py` | Python agent that audits Godot runtime and generates lessons |
| **Work Reviewer Agent** | `/root/tutoring/agents/reviewer_agent.py` | Lenient code checker agent evaluating student work |
| **Godot Runner Audit** | `/root/tutoring/agents/godot_runner.py` | Headless Godot runner testing GDScript syntax/errors |
| **Active Lesson File** | `/root/tutoring/current_lesson.json` | Active lesson JSON state synchronized with DB `status = 'active'` |

---

## 3. Database Tables (`student_tracker`)

1. **`lessons`**: Stores weekly lesson metadata (`id`, `week_number`, `title`, `summary`, `max_minutes`, `status`). Statuses: `pending_approval`, `approved`, `active`, `archived`.
2. **`lesson_tasks`**: Stores tasks per lesson (`lesson_id`, `task_order`, `title`, `description`, `code_example`, `is_completed`).
3. **`agent_configs`**: Stores system prompts, role descriptions, and model configuration for `planner`, `tutor`, and `reviewer` agents.
4. **`system_settings`**: Key-value settings storing SMTP config (`smtp_host`, `smtp_user`, `smtp_pass`), admin email (`notification_email`), student email (`student_email`), and template parameters.
5. **`work_submissions`**: Log of student work submissions and reviewer feedback.
6. **`email_logs`**: History of sent email notifications.

---

## 4. Operational Workflows & Commands

### Restarting the Server Application
```bash
ssh root@107.152.35.192 "pm2 restart my-website-app"
```

### Checking Application Logs
```bash
ssh root@107.152.35.192 "pm2 logs my-website-app --lines 50"
```

### Inspecting Active Lessons in Database
```bash
ssh root@107.152.35.192 "mysql --defaults-file=/etc/mysql/debian.cnf -D student_tracker -e 'SELECT id, week_number, title, status FROM lessons;'"
```

### Testing Student Notification Email
```bash
ssh root@107.152.35.192 "curl -s -X POST http://127.0.0.1:9001/api/admin/send-test-student-email"
```

### Manual Lesson Planner Execution
```bash
ssh root@107.152.35.192 "python3 /root/tutoring/agents/planner_agent.py --next-week 2"
```

---

## 5. Security & Deletion Invariants

- **Lesson Deletion Protection**: Lessons with status `approved` or `active`, or with recorded student work submissions, cannot be deleted without passing `{ override: true }` in the API payload.
- **Task Indexing**: Student UI displays 1-based sequential task order indices (`Task 1`, `Task 2`) derived from `task_order` rather than database auto-increment IDs.
- **Active Lesson Sync**: Whenever a lesson status is updated to `active`, the backend demotes other active lessons to `approved` and updates `/root/tutoring/current_lesson.json`.

---

## 5. Admin Password Authentication & Security

- **Route**:  (Tutor Admin Dashboard)
- **Default Password**: 
- **Database Storage**: Password is hashed using salted  (64-byte key length) stored in  under  and .
- **Password Updates**: Navigating to the **Email & Settings** tab in the Admin Dashboard allows changing the admin password by providing the current password and the new password.
- **Session Control**: Uses  and includes a **Logout** button on the dashboard header bar.
