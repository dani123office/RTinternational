js_path = r"C:\Users\ahsan\AppData\Local\npm-cache\_npx\8ddf6bea01b2519d\node_modules\@testsprite\testsprite-mcp\dist\index.js"

with open(js_path, "r", errors="ignore") as f:
    content = f.read()

import re
# Find waitConfigCommited function definition and context
match = re.search(r'async\s+function\s+waitConfigCommited[\s\S]+?\}', content)
if match:
    print(match.group(0))
else:
    print("Function not found, searching for general occurrences of waitConfigCommited:")
    lines = content.splitlines()
    for i, line in enumerate(lines):
        if "waitConfigCommited" in line:
            for j in range(max(0, i-5), min(len(lines), i+15)):
                print(f"{j}: {lines[j]}")
