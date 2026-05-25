import os

search_paths = [
    r"C:\Users\ahsan\AppData\Roaming",
    r"C:\Users\ahsan\AppData\Local",
    r"C:\Users\ahsan\.gemini",
]

print("--- Searching for testsprite files ---")
for base in search_paths:
    if os.path.exists(base):
        for root, dirs, files in os.walk(base):
            # limit depth to avoid long searches
            depth = root[len(base):].count(os.sep)
            if depth > 4:
                continue
            for name in dirs + files:
                if "testsprite" in name.lower():
                    print(os.path.join(root, name))
