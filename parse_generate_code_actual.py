js_path = r"C:\Users\ahsan\AppData\Local\npm-cache\_npx\8ddf6bea01b2519d\node_modules\@testsprite\testsprite-mcp\dist\index.js"

with open(js_path, "r", errors="ignore") as f:
    content = f.read()

import re
# Find function generateCodeAndExecute (not generateCodeAndExecuteMCP)
lines = content.splitlines()
for i, line in enumerate(lines):
    if "async function generateCodeAndExecute(" in line:
        print(f"--- Function definition at line {i} ---")
        for j in range(max(0, i-5), min(len(lines), i+60)):
            print(f"{j}: {lines[j]}")
        break
