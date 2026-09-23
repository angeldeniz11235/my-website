#!/usr/bin/env python3
"""
Godot Headless Runner - Executes Godot 4 CLI on high-rollers project to verify GDScript compilation & runtime errors.
"""
import subprocess
import json

def run_godot_verification():
    cmd = ["/usr/local/bin/godot", "--headless", "--path", "/root/www/high-rollers", "--quit"]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        has_errors = "SCRIPT ERROR" in res.stdout or "ERROR:" in res.stdout or res.returncode != 0
        return {
            "ok": not has_errors,
            "stdout": res.stdout,
            "stderr": res.stderr,
            "exit_code": res.returncode
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}

if __name__ == "__main__":
    result = run_godot_verification()
    print(json.dumps(result, indent=2))
