import re

js_path = r"C:\Users\ahsan\AppData\Local\npm-cache\_npx\8ddf6bea01b2519d\node_modules\@testsprite\testsprite-mcp\dist\index.js"

print("--- EXAMINING DIST/INDEX.JS ---")
seen = set()
with open(js_path, "r", errors="ignore") as f:
    content = f.read()
    # Find all MCP tool registration names or CLI commands
    matches = re.findall(r'name\s*:\s*["\']([^"\']+)["\']', content)
    for m in matches:
        if m not in seen:
            print("Tool/Property name:", m)
            seen.add(m)
