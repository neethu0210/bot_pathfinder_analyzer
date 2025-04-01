from flask import Flask, request, jsonify
import heapq
import re
import json
from collections import deque

app = Flask(__name__)

priority_queue = []
visited_set = set()
reject_set = set()
log_data = []
current_index = -1

def parse_log(file_content):
    log_entries = []
    lines = file_content.split('\n')

    for line in lines:
        if "#path_calculation_started" in line:
            match = re.search(r"SRC = (\{\{[-\d]+,[-\d]+\},\w+,\w+\}), DEST = (\{\{[-\d]+,[-\d]+\},\w+\})", line)
            if match:
                log_entries.append({
                    "event": "path_calculation_started",
                    "source": match.group(1),
                    "destination": match.group(2)
                })

        elif "#added_node" in line:
            match = re.search(r"Coor = (\{[-\d]+,[-\d]+\}),.*?GCost = (\d+), HCost = (\d+), FScore = (\d+)", line)
            if match:
                log_entries.append({
                    "event": "added_node",
                    "coordinate": match.group(1),
                    "G-cost": int(match.group(2)),
                    "H-cost": int(match.group(3)),
                    "F-Score": int(match.group(4))
                })

        elif "#chosen_node" in line:
            match = re.search(r"#chosen_node\s*\{\{([-?\d]+,[-?\d]+)\},.*?GCost = (\d+), HCost = (\d+), FScore = (\d+)", line)
            if match:
                log_entries.append({
                    "event": "chosen_node",
                    "coordinate": f"{{{match.group(1)}}}",
                    "G-cost": int(match.group(2)),
                    "H-cost": int(match.group(3)),
                    "F-Score": int(match.group(4))
                })

        elif "#neighbour_nodes" in line:
            matches = re.findall(r"\{\{(\d+),(\d+)\},(\w+),(\w+),(\w+),(\w+)\}", line)
            nodes = []
            if not matches:
                print(f"Warning: No neighbours found in line: {line.strip()}")
            for match in matches:
                x, y, dir1, dir2, rotation, cost = match
                node = {
                    "coordinate": f"{{{x}, {y}}}",
                    "dir1": dir1,
                    "dir2": dir2,
                    "rotation": rotation,
                    "cost": int(cost) if cost.isdigit() else cost,
                }
                nodes.append(node)
            log_entries.append({"event": "neighbours", "nodes": nodes})

        elif "#exploring_node" in line:
            match = re.search(r"#exploring_node = (\{\{[-\d]+,[-\d]+\},\s*\w+,\s*\w+,\s*\w+\})", line)
            if match:
                log_entries.append({
                    "event": "exploring_node",
                    "data": match.group(1)
                })

        elif "#processing_node" in line:
            match = re.search(r"#processing_node = (\{\{[-\d]+,[-\d]+\},\s*\{\{?[-\d]+,[-\d]+\}?\},\s*\w+,\s*\w+,\s*\w+,\s*\w+,\s*\w+\})", line)
            if match:
                log_entries.append({
                    "event": "processing_node",
                    "data": match.group(1)
                })

        elif "#conflict_check" in line:
            match = re.search(r"AnchorCoord = \{(-?\d+),(-?\d+)\}, Span Coords = (\[.*?\]), ResStartTime = (\d+), ResEndTime = (\d+), group bots = (\[.*?\])", line)
            if match:
                log_entries.append({
                    "event": "conflict_check",
                    "type": "anchor_coord",
                    "anchor_coord": f"{{{match.group(1)}, {match.group(2)}}}",
                    "span_coords": parse_list_of_curly_braces(match.group(3)),
                    "res_start_time": int(match.group(4)),
                    "res_end_time": int(match.group(5)),
                    "group_bots": parse_list_of_strings(match.group(6))
                })
                continue

            match = re.search(r"span coordinate = \{(-?\d+),(-?\d+)\}, IdleData = (\{.*?\})", line)
            if match:
                log_entries.append({
                    "event": "conflict_check",
                    "type": "idle_plan",
                    "span_coordinate": f"{{{match.group(1)}, {match.group(2)}}}",
                    "idle_data": match.group(3)
                })
                continue

            match = re.search(r"coordinate = \{(-?\d+),(-?\d+)\}, No other bot .*? MovableIdleBots = (\[.*?\])", line)
            if match:
                log_entries.append({
                    "event": "conflict_check",
                    "type": "time_conflict",
                    "coordinate": f"{{{match.group(1)}, {match.group(2)}}}",
                    "movable_idle_bots": parse_list_of_strings(match.group(3))
                })
                continue

            match = re.search(r"coordinate = \{(-?\d+),(-?\d+)\}, ButlerResMap = #(\{.*?\}), TimeConflictList = (\[.*?\])", line)
            if match:
                log_entries.append({
                    "event": "conflict_check",
                    "type": "summary",
                    "coordinate": f"{{{match.group(1)}, {match.group(2)}}}",
                    "butler_res_map": parse_butler_res_map(match.group(3)),
                    "time_conflict_list": parse_list_of_strings(match.group(4))
                })
                continue

        elif "not included" in line:
            match = re.search(r"Node = (\{.*?\}),.*?reason = (.*?)$", line)
            if match:
                log_entries.append({
                    "event": "rejected",
                    "coordinate": match.group(1),
                    "reason": match.group(2)
                })

    return log_entries

def parse_list_of_curly_braces(raw_string):
    return [f"{{{x}, {y}}}" for x, y in re.findall(r"\{(-?\d+),(-?\d+)\}", raw_string)]

def parse_list_of_strings(raw_string):
    return re.findall(r"\w+", raw_string)

def parse_butler_res_map(raw_string):
    entries = re.findall(r"(\w+):(\d+)", raw_string)
    return {key: int(value) for key, value in entries}

@app.route('/')
def home():
    return jsonify({"message": "Bot Analyzer API is running!", "endpoints": ["/upload", "/start", "/next", "/prev", "/reset"]})

@app.route('/upload', methods=['POST'])
def upload_log():
    global log_data, current_index, priority_queue, visited_set, reject_set
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if not file.filename.endswith('.log'):
        return jsonify({"error": "Invalid file type. Please upload a .log file"}), 400
    try:
        file_content = file.read().decode('utf-8')
    except UnicodeDecodeError:
        return jsonify({"error": "Failed to decode file. Ensure it is a valid text-based log file"}), 400

    log_data = parse_log(file_content)
    current_index = -1
    priority_queue.clear()
    visited_set.clear()
    reject_set.clear()

    return jsonify({
        "message": "File uploaded and parsed successfully",
        "total_steps": len(log_data)
    })

@app.route('/start', methods=['GET'])
def start():
    global current_index
    if not log_data:
        return jsonify({"error": "No log file uploaded"}), 400

    current_index = 0
    return jsonify(get_current_state())

@app.route('/next', methods=['GET'])
def next_step():
    global current_index

    if current_index == -1 or current_index >= len(log_data) - 1:
        return jsonify({"error": "No more steps"}), 400

    current_index += 1
    entry = log_data[current_index]
    if entry["event"] == "added_node":
        heapq.heappush(priority_queue, (entry["F-Score"], entry["G-cost"], entry["H-cost"], entry["coordinate"]))
    elif entry["event"] == "chosen_node":
        if priority_queue:
            lowest_fscore, g_cost, h_cost, chosen_node = heapq.heappop(priority_queue)
            visited_set.add((chosen_node, g_cost, h_cost, lowest_fscore))
    elif entry["event"] == "rejected":
        reject_set.add((entry["coordinate"], entry["reason"]))

    return jsonify(get_current_state())

@app.route('/prev', methods=['GET'])
def prev_step():
    global current_index

    if current_index <= 0:
        return jsonify({"error": "No previous steps"}), 400

    current_index -= 1
    return jsonify(get_current_state())

@app.route('/reset', methods=['GET'])
def reset():
    global current_index, priority_queue, visited_set, reject_set

    current_index = -1
    priority_queue.clear()
    visited_set.clear()
    reject_set.clear()

    return jsonify({"message": "Analyzer reset"})

def get_current_state():
    if 0 <= current_index < len(log_data):
        return {
            "entry": log_data[current_index],
            "priority_queue": list(priority_queue),
            "visited_set": list(visited_set),
            "reject_set": list(reject_set)
        }
    return {"error": "Invalid state"}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
