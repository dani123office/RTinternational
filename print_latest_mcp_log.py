import json

log_path = r"c:\Users\ahsan\Downloads\RTinternational\testsprite_tests\tmp\mcp.log"

print("--- RECENT MCP LOG ENTRIES ---")
started = False
with open(log_path, "r", errors="ignore") as f:
    for line in f:
        if "2026-05-25T06:47:13" in line:
            started = True
        if started:
            try:
                data = json.loads(line)
                print(f"[{data.get('level').upper()}] {data.get('message')} | {data.get('context', '')}")
            except Exception:
                print(line.strip())
