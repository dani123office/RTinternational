import json

log_path = r"c:\Users\ahsan\Downloads\RTinternational\testsprite_tests\tmp\mcp.log"

seen = set()
with open(log_path, "r", errors="ignore") as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get("level") in ["info", "error", "warn"]:
                msg = data.get("message")
                if msg not in seen:
                    print(f"[{data.get('level').upper()}] {msg}")
                    seen.add(msg)
        except Exception as e:
            pass
