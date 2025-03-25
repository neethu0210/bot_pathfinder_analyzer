from flask import Flask, request, jsonify
import re
import json
from collections import deque

app = Flask(__name__)

priority_queue = deque()
visited_set = set()
reject_set = {}
log_data = []
current_index = -1

def parse_log(file_content):
    log_entries = []
    lines = file_content.split('\n')

    for line in lines:
        if "#path_calculation_started" in line:
            match = re.search(r"SRC = (\{\{.*?\}\}.*?), DEST = (\{\{.*?\}\}.*?)", line)
            if match:
                log_entries.append({"event": "path_calculation_started", "source": match.group(1), "destination": match.group(2)})
        elif "#window_start_node" in line:
            match = re.search(r"#window_start_node = (\{.*?\})", line)
            if match:
                log_entries.append({"event": "window_start_node", "data": match.group(1)})
        elif "#added_node" in line:
            match = re.search(r"Coor = (\{.*?\}),.*?FScore = (\d+)", line)
            if match:
                log_entries.append({"event": "added_node", "coordinate": match.group(1), "F-Score": int(match.group(2))})
        elif "#chosen_node" in line:
            match = re.search(r"(\{\{.*?\}\}),.*?FScore = (\d+)", line)
            if match:
                log_entries.append({"event": "chosen_node", "coordinate": match.group(1), "F-Score": int(match.group(2))})
        elif "#neighbour_nodes" in line:
            match = re.search(r"#neighbour_nodes = (\[.*?\])", line)
            if match:
                log_entries.append({"event": "neighbours", "nodes": json.loads(match.group(1).replace("'", "\""))})
        elif "#exploring_node" in line:
            match = re.search(r"#exploring_node = (\{.*?\})", line)
            if match:
                log_entries.append({"event": "exploring_node", "data": match.group(1)})
        elif "#processing_node" in line:
            match = re.search(r"#processing_node = (\{.*?\})", line)
            if match:
                log_entries.append({"event": "processing_node", "data": match.group(1)})
        elif "#conflict_check" in line:
            match = re.search(r"coordinate = (\{.*?\})", line)
            if match:
                log_entries.append({"event": "conflict_check", "coordinate": match.group(1)})
        elif "not included" in line:
            match = re.search(r"Node = (\{.*?\}),.*?reason = (.*?)$", line)
            if match:
                log_entries.append({"event": "rejected", "coordinate": match.group(1), "reason": match.group(2)})

    return log_entries

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

    file_content = file.read().decode('utf-8')
    log_data = parse_log(file_content)
    current_index = -1
    priority_queue.clear()
    visited_set.clear()
    reject_set.clear()

    return jsonify({"message": "File uploaded and parsed successfully", "total_steps": len(log_data)})

@app.route('/start', methods=['GET'])
def start():
    global current_index
    if not log_data:
        return jsonify({"error": "No log file uploaded"}), 400

    current_index = 0
    return jsonify({
        "entry": log_data[current_index],
        "priority_queue": list(priority_queue),
        "visited_set": list(visited_set),
        "reject_set": reject_set
    })

@app.route('/next', methods=['GET'])
def next_step():
    global current_index

    if current_index == -1 or current_index >= len(log_data) - 1:
        return jsonify({"error": "No more steps"}), 400

    current_index += 1
    entry = log_data[current_index]

    if entry["event"] == "chosen_node":
        priority_queue.append(entry["coordinate"])
    elif entry["event"] == "exploring_node":
        if priority_queue:
            visited_set.add(priority_queue.popleft())
    elif entry["event"] == "conflict_check":
        reject_set[entry["coordinate"]] = "Conflict detected"

    return jsonify({
        "entry": entry,
        "priority_queue": list(priority_queue),
        "visited_set": list(visited_set),
        "reject_set": reject_set
    })

@app.route('/prev', methods=['GET'])
def prev_step():
    global current_index

    if current_index <= 0:
        return jsonify({"error": "No previous steps"}), 400

    current_index -= 1
    return jsonify({
        "entry": log_data[current_index],
        "priority_queue": list(priority_queue),
        "visited_set": list(visited_set),
        "reject_set": reject_set
    })

@app.route('/reset', methods=['GET'])
def reset():
    global current_index, priority_queue, visited_set, reject_set

    current_index = -1
    priority_queue.clear()
    visited_set.clear()
    reject_set.clear()

    return jsonify({"message": "Analyzer reset"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)