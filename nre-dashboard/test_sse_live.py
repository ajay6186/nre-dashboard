"""
SSE Live Demo — test_sse_live.py
=================================
Connects directly to the FastAPI SSE stream and pretty-prints every event.
Use this in a terminal to prove SSE is working without the full browser stack.

Usage:
  # Default: connect to FastAPI directly on port 5001
  python test_sse_live.py

  # Connect to Django proxy on port 8000 (shows the full Django → FastAPI path)
  python test_sse_live.py --via-django

  # Limit to N events then exit
  python test_sse_live.py --max 5
"""
import argparse
import json
import sys
import urllib.request
from datetime import datetime

# ---- Colours (ANSI) --------------------------------------------------------
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"


def status_colour(s):
    return GREEN if s == "Up" else RED


def main():
    parser = argparse.ArgumentParser(description="SSE live demo")
    parser.add_argument("--via-django", action="store_true",
                        help="Connect via Django proxy (port 8000) instead of FastAPI (5001)")
    parser.add_argument("--max", type=int, default=0,
                        help="Stop after N events (0 = run forever)")
    args = parser.parse_args()

    port = 8000 if args.via_django else 5001
    url  = f"http://127.0.0.1:{port}/devices/stream"
    via  = "Django → FastAPI" if args.via_django else "FastAPI directly"

    print(f"\n{BOLD}{CYAN}NRE Dashboard — SSE Live Demo{RESET}")
    print(f"  Connecting to: {BOLD}{url}{RESET}  ({via})")
    print(f"  Press Ctrl+C to stop.\n")
    print("-" * 60)

    event_count = 0
    req = urllib.request.Request(url, headers={"Accept": "text/event-stream"})

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            buf = ""
            while True:
                chunk = resp.read(4096).decode("utf-8", errors="replace")
                if not chunk:
                    break
                buf += chunk
                while "\n\n" in buf:
                    event, buf = buf.split("\n\n", 1)
                    for line in event.splitlines():
                        if not line.startswith("data:"):
                            continue
                        payload = line[5:].strip()
                        try:
                            devices = json.loads(payload)
                        except json.JSONDecodeError:
                            continue

                        event_count += 1
                        now    = datetime.now().strftime("%H:%M:%S")
                        up     = sum(1 for d in devices if d["status"] == "Up")
                        down   = sum(1 for d in devices if d["status"] == "Down")

                        print(
                            f"{CYAN}{now}{RESET}  "
                            f"Event #{event_count:>3}  │  "
                            f"{BOLD}{len(devices)}{RESET} devices  │  "
                            f"{GREEN}Up: {up}{RESET}  "
                            f"{RED}Down: {down}{RESET}"
                        )

                        # Print any devices that are Down
                        for d in devices:
                            if d["status"] == "Down":
                                print(
                                    f"         {RED}↓ DOWN{RESET}  "
                                    f"{d['name']:20s}  "
                                    f"{d['ip_address']:15s}  "
                                    f"{d['location']}"
                                )

                        if args.max and event_count >= args.max:
                            print(f"\n{YELLOW}Reached --max {args.max}. Exiting.{RESET}")
                            sys.exit(0)

    except KeyboardInterrupt:
        print(f"\n{YELLOW}Stopped by user. Received {event_count} event(s).{RESET}\n")
    except OSError as e:
        print(f"\n{RED}Connection failed: {e}{RESET}")
        print("Make sure FastAPI is running:")
        print("  cd fastapi_service && uvicorn app:app --host 127.0.0.1 --port 5001\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
