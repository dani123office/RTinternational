js_path = r"C:\Users\ahsan\AppData\Local\npm-cache\_npx\8ddf6bea01b2519d\node_modules\@testsprite\testsprite-mcp\dist\index.js"

with open(js_path, "r", errors="ignore") as f:
    content = f.read()

import re
# Find mentions of "status" or "commited" or "config.json"
for line in content.splitlines():
    if "status" in line.lower() or "commited" in line.lower() or "config.json" in line.lower():
        if len(line) < 300:
            print(line.strip())
