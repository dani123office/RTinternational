import json

log_path = r"c:\Users\ahsan\Downloads\RTinternational\testsprite_tests\tmp\mcp.log"

print("--- MCP ERRORS ---")
with open(log_path, "r", errors="ignore") as f:
    for line in f:
        try:
            data = json.loads(line)
            # print lines that contain errors or exceptions
            msg = str(data.get("message", ""))
            ctx = str(data.get("context", ""))
            if "error" in line.lower() or "fail" in line.lower() or "exception" in line.lower():
                # skip Yamux benign logs to avoid noise
                if "yamux" in line.lower() or "benign" in line.lower():
                    continue
                print(f"[{data.get('level').upper()}] {msg} | Context: {ctx}")
        except Exception as e:
            pass
