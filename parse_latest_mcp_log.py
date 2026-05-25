log_path = r"c:\Users\ahsan\Downloads\RTinternational\testsprite_tests\tmp\mcp.log"

with open(log_path, "r", errors="ignore") as f:
    lines = f.readlines()
    for line in lines[-150:]:
        print(line.strip())
