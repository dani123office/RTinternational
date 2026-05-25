import re

log_path = r"c:\Users\ahsan\Downloads\RTinternational\testsprite_tests\tmp\mcp.log"

ports = set()
with open(log_path, "r", errors="ignore") as f:
    for line in f:
        matches = re.findall(r'localhost:(\d+)', line)
        for m in matches:
            ports.add(m)

print("Unique ports found in mcp.log:", ports)
