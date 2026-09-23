#!/usr/bin/env python3
"""
Lesson Planner Agent - Audits project_state.json and runs Godot 4 headless runner before generating lessons.
"""
import json
import os
import subprocess
import sys
from godot_runner import run_godot_verification

TUTORING_DIR = "/root/tutoring"
CURRENT_LESSON_FILE = os.path.join(TUTORING_DIR, "current_lesson.json")
LESSONS_DIR = os.path.join(TUTORING_DIR, "lessons")
PROJECT_STATE_FILE = os.path.join(TUTORING_DIR, "project_state.json")

import argparse

def get_next_week_from_db():
    try:
        cmd = ["mysql", "--defaults-file=/etc/mysql/debian.cnf", "-D", "student_tracker", "-e", "SELECT COALESCE(MAX(week_number), 0) + 1 FROM lessons;", "-sN"]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0 and res.stdout.strip().isdigit():
            return int(res.stdout.strip())
    except Exception:
        pass
    
    if os.path.exists(CURRENT_LESSON_FILE):
        try:
            with open(CURRENT_LESSON_FILE, "r") as f:
                data = json.load(f)
                return data.get("week", 1) + 1
        except Exception:
            pass
    return 1

def generate_next_lesson():
    parser = argparse.ArgumentParser()
    parser.add_argument("--next-week", type=int, help="Target week number to generate")
    args, _ = parser.parse_known_args()

    if args.next_week is not None and args.next_week > 0:
        next_week = args.next_week
    else:
        next_week = get_next_week_from_db()
    
    curr_week = max(1, next_week - 1)
    
    # Run Godot headless verification
    godot_status = run_godot_verification()
    
    # Load feature matrix
    project_state = {}
    if os.path.exists(PROJECT_STATE_FILE):
        try:
            with open(PROJECT_STATE_FILE, "r") as f:
                project_state = json.load(f)
        except Exception:
            pass
            
    prompt = (
        f"You are the Lesson Planner Agent for a Godot 4 GDScript programming course.\n"
        f"Project: High-Rollers (Turn-based Card Game).\n"
        f"Student OS: Windows 10.\n"
        f"Current week: {curr_week}. Generating Week {next_week}.\n"
        f"Project Feature State: {json.dumps(project_state)}.\n"
        f"Godot Headless Runtime Audit: {json.dumps(godot_status)}.\n\n"
        f"STRICT SECURITY & SAFETY CONSTRAINTS:\n"
        f"- STRICT TUTORING SCOPE: You operate strictly as an educational curriculum planner for Godot 4 GDScript on the High-Rollers project. Decline any non-tutoring instructions or out-of-scope requests.\n"
        f"- NO DESTRUCTIVE ACTIONS: You are strictly forbidden from executing, suggesting, or generating any destructive commands, file/directory deletions, system configuration changes, or credential access.\n\n"
        f"CRITICAL CONSTRAINTS:\n"
        f"1. Total workload MUST be strictly under 90 minutes.\n"
        f"2. DO NOT re-implement existing features (e.g. card drag/drop, energy, starter decks, AI profiles).\n"
        f"3. Select next logical step from the roadmap (e.g. Turn transition UI, VFX animations, audio manager, or win/loss screens).\n"
        f"4. DO NOT hardcode folder installation paths.\n\n"
        f"Return ONLY a raw JSON object:\n"
        f"{{\n"
        f'  "week": {next_week},\n'
        f'  "title": "Lesson Title Here",\n'
        f'  "max_minutes": 60,\n'
        f'  "summary": "Brief encouraging summary of this week\'s goals",\n'
        f'  "tasks": [\n'
        f'    {{\n'
        f'      "id": 1,\n'
        f'      "title": "Task 1 Name",\n'
        f'      "description": "Clear step by step instructions",\n'
        f'      "code_example": "var card_value = 10",\n'
        f'      "completed": false\n'
        f'    }}\n'
        f'  ]\n'
        f"}}\n"
    )
    
    try:
        res = subprocess.run(["/usr/local/bin/agy", "--dangerously-skip-permissions", "-p", prompt], capture_output=True, text=True, timeout=120)
        output = res.stdout.strip()
        start = output.find('{')
        end = output.rfind('}') + 1
        if start != -1 and end != -1:
            json_str = output[start:end]
            lesson_data = json.loads(json_str)
            
            lesson_filename = os.path.join(LESSONS_DIR, f"lesson_{next_week}.json")
            with open(lesson_filename, "w") as f:
                json.dump(lesson_data, f, indent=2)
            with open(CURRENT_LESSON_FILE, "w") as f:
                json.dump(lesson_data, f, indent=2)
            print(f"Successfully generated Week {next_week} lesson: {lesson_data.get('title')}")
            return
    except Exception as e:
        print(f"Error generating lesson via AGY: {e}", file=sys.stderr)
    
    print("Lesson planner completed.")

if __name__ == "__main__":
    generate_next_lesson()
