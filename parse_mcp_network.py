import re

log_path = r"c:\Users\ahsan\Downloads\RTinternational\testsprite_tests\tmp\mcp.log"

print("--- NETWORK REQUESTS IN MCP.LOG ---")
seen = set()
with open(log_path, "r", errors="ignore") as f:
    for line in f:
        # Look for URLs or API requests
        urls = re.findall(r'https?://[^\s"\'}]+', line)
        for url in urls:
            if url not in seen:
                print(url)
                seen.add(url)
