js_path = r"C:\Users\ahsan\AppData\Local\npm-cache\_npx\8ddf6bea01b2519d\node_modules\@testsprite\testsprite-mcp\dist\index.js"

with open(js_path, "r", errors="ignore") as f:
    content = f.read()

lines = content.splitlines()
for i in range(143940, min(len(lines), 144020)):
    print(f"{i}: {lines[i]}")
