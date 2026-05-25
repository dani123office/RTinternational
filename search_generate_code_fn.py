js_path = r"C:\Users\ahsan\AppData\Local\npm-cache\_npx\8ddf6bea01b2519d\node_modules\@testsprite\testsprite-mcp\dist\index.js"

with open(js_path, "r", errors="ignore") as f:
    content = f.read()

import re
matches = re.finditer(r'async\s+function\s+_generateCodeAndExecute\b', content)
for m in matches:
    print("Match:", m.group(0), "at position:", m.start())
    # print context
    start_pos = max(0, m.start() - 100)
    end_pos = min(len(content), m.end() + 6000)
    print(content[start_pos:end_pos])
    print("="*40)
