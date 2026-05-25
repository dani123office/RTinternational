log_path = r"c:\Users\ahsan\Downloads\RTinternational\testsprite_tests\tmp\mcp.log"

with open(log_path, "r", errors="ignore") as f:
    for i in range(20):
        print(f.readline().strip())
