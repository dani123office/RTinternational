import re

log_path = r"c:\Users\ahsan\Downloads\RTinternational\testsprite_tests\tmp\mcp.log"

print("--- SEARCHING FOR JSON-RPC AND TOOL NAMES ---")
with open(log_path, "r", errors="ignore") as f:
    for line in f:
        # Match methods in JSON-RPC format or tool registrations
        match = re.search(r'"(method|name)"\s*:\s*"([^"]+)"', line)
        if match:
            # print unique matches
            val = match.group(0)
            print(val)
