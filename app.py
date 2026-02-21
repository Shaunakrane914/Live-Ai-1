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


def check_deps():
    """Warn if node_modules are missing."""
    for label, path in [("Gateway", BACKEND_DIR), ("Frontend", FRONTEND_DIR)]:
        nm = os.path.join(path, "node_modules")
        if not os.path.isdir(nm):
            print(f"  ⚠  {label}: node_modules not found — run `npm install` in {path}")

    if not shutil.which("node"):
        print("  ⚠  node not found in PATH — Gateway and Frontend will fail")


def start_services(prod: bool = False) -> list[subprocess.Popen]:
    python = find_python()
    node   = shutil.which("node") or "node"
    npm    = shutil.which("npm")  or "npm"

    services = [
        {
            "name": "AI Engine",
            "cmd":  [python, "-m", "uvicorn", "main:app",
                     "--host", "0.0.0.0", "--port", "8001", "--reload"],
            "cwd":  AI_DIR,
        },
        {
            "name": "Gateway",
            "cmd":  [node, "index.js"],
            "cwd":  BACKEND_DIR,
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
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                # Windows: don't open a new console window
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
            )
            t = threading.Thread(target=stream, args=(p, svc["name"]), daemon=True)
            t.start()
            procs.append(p)
            print(f"  ✅  {svc['name']} started (pid {p.pid})")
        except FileNotFoundError as e:
            print(f"  ❌  {svc['name']} failed to start: {e}")

    return procs


def banner(prod: bool):
    print()
    print(f"{BOLD}{'═'*52}{RESET}")
    print(f"{BOLD}   AegisGrid — One-Click Launcher{RESET}")
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

    banner(args.prod)
    check_deps()

    # Kill anything already on those ports so we don't hit EADDRINUSE
    ports_to_clear = [8001, 8000] + ([] if args.prod else [5173])
    for p in ports_to_clear:
        kill_port(p)
        time.sleep(0.1)

    procs = start_services(prod=args.prod)

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

    # Keep alive — monitor processes, warn once if one crashes
    crashed: set[int] = set()
    while True:
        time.sleep(3)
        for p in procs:
            if p.pid not in crashed and p.poll() is not None:
                crashed.add(p.pid)
                print(f"\n  \u26a0  A service (pid {p.pid}) exited unexpectedly.")


if __name__ == "__main__":
    main()
