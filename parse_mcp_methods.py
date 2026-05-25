import re

log_path = r"c:\Users\ahsan\Downloads\RTinternational\testsprite_tests\tmp\mcp.log"

print("--- MCP Log Analysis ---")
with open(log_path, "r", errors="ignore") as f:
    for line in f:
        # Look for method names in log messages
        if "method" in line or "call" in line or "name" in line:
            # Print lines that look like tool registrations or schemas
            if any(term in line for term in ["tools/list", "tools/call", "tool", "register", "schema"]):
                print(line.strip()[:300])
