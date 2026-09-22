#!/usr/bin/env python3
"""
Lesson Planner Agent - Generates weekly <=90min GDScript/Godot lessons for High-Rollers.
Runs automatically on a schedule (Sundays at 8:00 PM).
"""
import json
import os
import subprocess
import sys

TUTORING_DIR = "/root/tutoring"
CURRENT_LESSON_FILE = os.path.join(TUTORING_DIR, "current_lesson.json")
LESSONS_DIR = os.path.join(TUTORING_DIR, "lessons")

def get_current_week():
    if os.path.exists(CURRENT_LESSON_FILE):
        try:
            with open(CURRENT_LESSON_FILE, "r") as f:
                data = json.load(f)
                return data.get("week", 1)
        except Exception:
            pass
    return 1

def generate_next_lesson():
    curr_week = get_current_week()
    next_week = curr_week + 1
    
    prompt = (
        f"You are the Lesson Planner Agent for a Godot 4 GDScript programming course.\n"
        f"Project: ~/Programming/Godot/high-rollers (Card game).\n"
        f"Current week: {curr_week}.\n"
        f"Generate Week {next_week}'s lesson plan JSON for student Russell.\n"
        f"CRITICAL CONSTRAINT: Total workload MUST be strictly under 90 minutes.\n\n"
        f"Return ONLY a raw JSON object with the following structure:\n"
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
