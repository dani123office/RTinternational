js_path = r"C:\Users\ahsan\AppData\Local\npm-cache\_npx\8ddf6bea01b2519d\node_modules\@testsprite\testsprite-mcp\dist\index.js"

with open(js_path, "r", errors="ignore") as f:
    content = f.read()

import re
# Find where waitConfigCommited is called
lines = content.splitlines()
for i, line in enumerate(lines):
    if "waitConfigCommited" in line and "function" not in line:
        print(f"--- Context around waitConfigCommited call at line {i} ---")
        for j in range(max(0, i-10), min(len(lines), i+40)):
            print(f"{j}: {lines[j]}")
