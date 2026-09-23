# Multi-Agent Tutoring System Guidelines & Rules

This rule defines core operational invariants, database state synchronization, and UI rules for the Godot 4 AGY Tutoring platform.

---

## 1. Database-Driven Week Numbering
- **Invariable**: Lesson plan generation must compute the target week number directly from `SELECT COALESCE(MAX(week_number), 0) + 1 FROM lessons` in MySQL or via explicit `--next-week <N>` CLI arguments.
- **Prevention**: Never compute week numbers solely from on-disk `current_lesson.json` files, as disk files become stale when earlier lessons are deleted by the tutor.

## 2. Student UI Task Indexing Invariant
- **Invariable**: Student-facing lesson plan UIs (e.g. `/tutoring/chat`) must display 1-based sequential task indices (`Task 1:`, `Task 2:`, `Task 3:`) derived from array order (`idx + 1`) or `task_order`.
- **Prevention**: Do not present auto-increment database primary key IDs (`task.id`) to the student as task numbers.

## 3. Active Lesson State Synchronization
- **Invariable**: When a lesson is marked or approved as the **Current Active Lesson**:
  1. Demote any prior active lessons in MySQL to `approved`.
  2. Set target lesson to `status = 'active'`.
  3. Immediately write the complete active lesson payload to `/root/tutoring/current_lesson.json`.
- **Rationale**: Keeps multi-agent scripts (`planner_agent.py`, `reviewer_agent.py`, `godot_runner.py`) and Express API endpoints synchronized without race conditions.

## 4. Work Checker Leniency & Remediation
- **Invariable**: The Work Checker / Reviewer Agent prompt must instruct leniency—approving student submissions if core task functionality is present, while promptly providing encouraging, actionable tips and code snippets when script errors occur.

## 5. Deletion Protection & Tutor Override
- **Invariable**: Endpoints and UI modals must block deletion of lessons that are `approved`, `active`, or have existing student work submissions unless explicit `override: true` is provided.
