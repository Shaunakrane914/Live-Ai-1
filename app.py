"""
app.py — AegisGrid One-Click Launcher
======================================
Starts all three services in parallel and streams their logs to the terminal.

  Service       Port   Command
  ──────────────────────────────────────────────────────
  AI Engine     8001   uvicorn main:app (Python FastAPI)
  Gateway       8000   node index.js (Node.js Socket.io)
  Frontend      5173   npm run dev (Vite / React)

Usage:
  python app.py            # start everything
  python app.py --prod     # start Gateway + AI only (no Vite dev server)

Stop with Ctrl+C — all child processes are killed cleanly.
"""

import subprocess
import sys
import os
import signal
import threading
import time
import argparse
import shutil
import re

# ── Resolve root directory (parent of this file) ──────────────────────
ROOT = os.path.dirname(os.path.abspath(__file__))
AI_DIR       = os.path.join(ROOT, "ai-engine")
BACKEND_DIR  = os.path.join(ROOT, "backend")
FRONTEND_DIR = os.path.join(ROOT, "frontend")

# ── ANSI colour prefixes for each service ─────────────────────────────
COLOURS = {
    "AI Engine": "\033[94m",   # blue
    "Gateway":   "\033[92m",   # green
    "Frontend":  "\033[95m",   # magenta
}
RESET = "\033[0m"
BOLD  = "\033[1m"


def prefix(name: str) -> str:
    c = COLOURS.get(name, "")
    return f"{c}{BOLD}[{name}]{RESET} "


# ── Stream a process's stdout/stderr to the terminal ──────────────────
def stream(proc: subprocess.Popen, name: str):
    p = prefix(name)
    try:
        for raw in proc.stdout:  # type: ignore[union-attr]
            line = raw.decode(errors="replace").rstrip()
            if line:
                print(f"{p}{line}", flush=True)
    except Exception:
        pass


def find_python() -> str:
    """Return the correct python executable (venv-aware)."""
    venv_py = os.path.join(AI_DIR, "venv", "Scripts", "python.exe")   # Windows
    if os.path.exists(venv_py):
        return venv_py
    venv_py2 = os.path.join(AI_DIR, "venv", "bin", "python")          # Unix
    if os.path.exists(venv_py2):
        return venv_py2
    return sys.executable   # fall back to the python running this script


def kill_port(port: int):
    """Kill any process already listening on `port` so we avoid EADDRINUSE."""
    try:
        if sys.platform == "win32":
            out = subprocess.check_output(
                f"netstat -ano | findstr :{port}", shell=True,
                stderr=subprocess.DEVNULL
            ).decode()
            pids = set(re.findall(r'(\d+)\s*$', out, re.MULTILINE))
            for pid in pids:
                if pid and pid != '0':
                    subprocess.call(
                        ["taskkill", "/F", "/PID", pid],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
                    )
        else:
            subprocess.call(
                f"lsof -ti tcp:{port} | xargs kill -9",
                shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
    except Exception:
        pass   # port was free — nothing to kill


def check_deps() -> bool:
    """Check if on Render and handle local dependency verification."""
    is_render = bool(os.environ.get("RENDER") or os.environ.get("IS_RENDER"))
    
    # On Render, we assume the Build Command handled everything.
    # We skip npm install and build to ensure the start command binds to the port instantly.
    if is_render:
        print("  ☁️  Render environment detected — skipping setup to ensure instant port binding.")
        return True

    npm = shutil.which("npm") or "npm"

    for label, path in [("Gateway", BACKEND_DIR), ("Frontend", FRONTEND_DIR)]:
        nm = os.path.join(path, "node_modules")
        if not os.path.isdir(nm):
            print(f"  📦  {label}: node_modules not found — running npm install …")
            # Prefer offline to speed up local dev
            try:
                subprocess.run([npm, "install", "--prefer-offline"], cwd=path, check=True, capture_output=True, text=True)
                print(f"  ✅  {label}: npm install complete")
            except subprocess.CalledProcessError as e:
                print(f"  ❌  {label}: npm install failed:\n{e.stderr}")
        else:
            print(f"  ✅  {label}: node_modules OK")

    if not shutil.which("node"):
        print("  ⚠  node not found in PATH — Gateway will fail")

    return False


def start_services(prod: bool = False) -> list[subprocess.Popen]:
    python = find_python()
    node   = shutil.which("node") or "node"
    npm    = shutil.which("npm")  or "npm"

    services = [
        {
            "name": "AI Engine",
            "cmd":  [python, "-m", "uvicorn", "main:app",
                     "--host", "0.0.0.0", "--port", "8001"] + (["--reload"] if not prod else []),
            "cwd":  AI_DIR,
        },
        {
            "name": "Gateway",
            "cmd":  [node, "index.js"],
            "cwd":  BACKEND_DIR,
            "env":  { **os.environ, "PORT": str(os.environ.get("PORT", "8000")) }
        },
    ]

    if not prod:
        services.append({
            "name": "Frontend",
            "cmd":  [npm, "run", "dev"],
            "cwd":  FRONTEND_DIR,
        })

    procs = []
    for svc in services:
        try:
            p = subprocess.Popen(
                svc["cmd"],
                cwd=svc["cwd"],
                env=svc.get("env", os.environ),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                # Windows: don't open a new console window
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
            )
            t = threading.Thread(target=stream, args=(p, svc["name"]), daemon=True)
            t.start()
            svc["last_pid"] = p.pid  # Track for restarts
            procs.append(p)
            print(f"  ✅  {svc['name']} started (pid {p.pid})")
        except FileNotFoundError as e:
            print(f"  ❌  {svc['name']} failed to start: {e}")

    return procs


def banner(prod: bool):
    print()
    print(f"{BOLD}{'═'*52}{RESET}")
    print(f"{BOLD}   Gridium — One-Click Launcher{RESET}")
    print(f"{'═'*52}")
    print(f"   AI Engine  →  http://localhost:{BOLD}8001{RESET}  (FastAPI)")
    print(f"   Gateway    →  http://localhost:{BOLD}8000{RESET}  (Socket.io)")
    if not prod:
        print(f"   Frontend   →  http://localhost:{BOLD}5173{RESET}  (Vite / React)")
    print(f"{'═'*52}")
    print(f"   Press {BOLD}Ctrl+C{RESET} to stop all services")
    print(f"{'═'*52}")
    print()


def main():
    parser = argparse.ArgumentParser(description="AegisGrid launcher")
    parser.add_argument("--prod", action="store_true",
                        help="Skip Vite dev server (production mode)")
    args = parser.parse_args()

    # check_deps now returns True when running on Render
    is_render = check_deps()
    prod = args.prod or is_render   # Render always runs in prod mode

    banner(prod)

    # Kill anything already on those ports so we don't hit EADDRINUSE
    if not is_render:
        ports_to_clear = [8001, 8000] + ([] if prod else [5173])
        for p in ports_to_clear:
            kill_port(p)
            time.sleep(0.1)

    procs = start_services(prod=prod)

    if not procs:
        print("\n  ❌  No services started — exiting.")
        sys.exit(1)

    # Wait a moment then show the ready URLs
    time.sleep(2)
    print()
    print(f"  {BOLD}Ready!{RESET}")
    if not args.prod:
        print(f"  → Open {BOLD}http://localhost:5173{RESET} in your browser")
    print()

    def shutdown(sig=None, frame=None):
        print(f"\n\n  🛑  Shutting down all services …")
        for p in procs:
            try:
                if sys.platform == "win32":
                    p.send_signal(signal.CTRL_C_EVENT)
                else:
                    p.terminate()
            except Exception:
                pass
        time.sleep(1)
        for p in procs:
            try:
                p.kill()
            except Exception:
                pass
        print("  ✅  All services stopped.")
        sys.exit(0)

    signal.signal(signal.SIGINT,  shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # ── Persistent Service Monitor ──────────────────────────────────────────
    print(f"  🛰️  Monitoring services (Auto-restart enabled) …")
    
    # Track restarts to prevent infinite fast-loops if code is broken
    restart_counts = {p.pid: 0 for p in procs}
    MAX_RESTARTS = 10
    
    while True:
        time.sleep(5)
        new_procs = []
        for p in procs:
            poll = p.poll()
            if poll is not None:
                name = "Unknown"
                # Find which service this was
                for s in services:
                    if s.get("last_pid") == p.pid:
                        name = s["name"]
                        break
                
                print(f"\n  ⚠️  {prefix(name)}Service died (exit code {poll}). Restarting …")
                
                # Identify the original service config
                svc_config = next((s for s in services if s["name"] == name), None)
                if svc_config:
                    try:
                        new_p = subprocess.Popen(
                            svc_config["cmd"],
                            cwd=svc_config["cwd"],
                            env=svc_config.get("env", os.environ),
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
                        )
                        threading.Thread(target=stream, args=(new_p, svc_config["name"]), daemon=True).start()
                        svc_config["last_pid"] = new_p.pid
                        new_procs.append(new_p)
                        print(f"  ✅  {svc_config['name']} restarted (new pid {new_p.pid})")
                    except Exception as e:
                        print(f"  ❌  Failed to restart {name}: {e}")
                continue
            else:
                new_procs.append(p)
        
        procs = new_procs
        if not procs:
            print("  🛑 All services dead and could not be restarted. Exiting launcher.")
            break


if __name__ == "__main__":
    main()
