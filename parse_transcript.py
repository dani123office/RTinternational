import json

log_path = r"C:\Users\ahsan\.gemini\antigravity\brain\d3e749c5-6883-4f0a-a3c3-b8c6b7f3b332\.system_generated\logs\transcript.jsonl"

with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get("source") == "MODEL" and "tool_calls" in data:
                for tc in data["tool_calls"]:
                    name = tc.get("name")
                    if name not in ["view_file", "list_dir", "grep_search", "write_to_file", "replace_file_content"]:
                        print(f"Step {data.get('step_index')}: {name} -> {tc.get('args')}")
        except Exception as e:
            pass
