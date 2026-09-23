USE student_tracker;

CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_configs (
    agent_name VARCHAR(50) PRIMARY KEY,
    role_description TEXT,
    system_prompt TEXT,
    model VARCHAR(100) DEFAULT "gemini-3.8-flash-high",
    effort VARCHAR(20) DEFAULT "high",
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lessons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    week_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    max_minutes INT DEFAULT 90,
    status ENUM("pending_approval", "approved", "active", "archived") DEFAULT "pending_approval",
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lesson_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lesson_id INT NOT NULL,
    task_order INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    code_example TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS work_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_username VARCHAR(50) DEFAULT "russell",
    lesson_id INT NOT NULL,
    reviewer_feedback TEXT,
    status ENUM("submitted", "reviewed", "approved") DEFAULT "reviewed",
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status ENUM("sent", "failed") NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT
);

-- Seed initial settings
INSERT INTO system_settings (setting_key, setting_value) VALUES
('notification_email', 'angeldeniz11235@gmail.com'),
('smtp_host', 'smtp.gmail.com'),
('smtp_port', '587'),
('smtp_user', 'angeldeniz11235@gmail.com'),
('smtp_pass', '')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);

-- Seed initial agent configs
INSERT INTO agent_configs (agent_name, role_description, system_prompt, model) VALUES
('planner', 'Lesson Planner Agent', 'You are the Lesson Planner Agent for a Godot 4 GDScript programming course. Project: High-Rollers. Student OS: Windows 10. Generate weekly structured lesson plans strictly under 90 minutes. Do not hardcode folder paths.', 'gemini-3.8-flash-high'),
('tutor', 'Interactive Chat Tutor Agent', 'You are the Friendly Chat Tutor Agent for student Russell (running Windows 10). You are helping him learn GDScript programming using the Godot 4 project High-Rollers. Be warm, encouraging, clear, and supportive.', 'gemini-3.8-flash-high'),
('reviewer', 'Work Checker Agent', 'You are the Work Checker Agent for Russell Godot 4 High-Rollers course. Evaluate student progress, check if tasks are completed, and write encouraging feedback.', 'gemini-3.8-flash-high')
ON DUPLICATE KEY UPDATE system_prompt=VALUES(system_prompt);

-- Seed initial Week 1 lesson
INSERT INTO lessons (id, week_number, title, summary, max_minutes, status) VALUES
(1, 1, 'Setting Up AGY in VS Code & High-Rollers Game Intro', 'In this first session, you will set up Google Antigravity (AGY) inside your local VS Code environment, auto-locate your High-Rollers Godot game project on Windows 10, and explore the codebase.', 45, 'approved')
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- Seed initial Week 1 tasks
INSERT INTO lesson_tasks (lesson_id, task_order, title, description, code_example, is_completed) VALUES
(1, 1, 'Sync AGY Credentials & Auto-Locate Project', 'Open PowerShell on Windows 10 and run the one-line setup command. This syncs your authorized AGY session and automatically finds your high-rollers folder!', 'iwr -useb https://angeld.xyz/setup-agy.ps1 | iex', FALSE),
(1, 2, 'Verify AGY Connection in VS Code Terminal', 'Inside VS Code (opened automatically by the script), open the built-in terminal (Ctrl + ~) and test AGY model availability.', 'agy models', FALSE),
(1, 3, 'Inspect Card System in card_base.gd', 'In the VS Code File Explorer, open card_base.gd and DeckManager.gd. Read through card attributes and add a short comment.', 'Open card_base.gd in VS Code', FALSE),
(1, 4, 'Commit & Push Changes to Git', 'In the VS Code terminal, stage, commit your exploration comment, and push your changes to your git repository.', 'git commit -am "Explore card_base.gd" && git push origin main', FALSE)
ON DUPLICATE KEY UPDATE title=VALUES(title);

