import json
import os
from queue import PriorityQueue
from flask import Flask, request, jsonify

app = Flask(__name__)

graph = {}
start_node = None
goal_node = None
priority_queue = PriorityQueue()
g_costs = {}
visited_set = set()
reject_set = {}
bot_occupancy = {}
step_counter = 0
step_data = []

def heuristic(node, goal):
    return abs(ord(node[0]) - ord(goal[0])) + abs(int(node[1:]) - int(goal[1:]))

def load_graph(data):
    global graph, start_node, goal_node, priority_queue, visited_set, reject_set, bot_occupancy, step_counter, g_costs
    graph = data["nodes"]
    start_node = data["start"]
    goal_node = data["goal"]
    bot_occupancy = data.get("bot_occupancy", {})  
    priority_queue = PriorityQueue()
    visited_set = set()
    reject_set = {}
    g_costs = {start_node: 0}
    step_counter = 0
    step_data.clear()

    h = heuristic(start_node, goal_node)
    priority_queue.put((h, start_node)) 

    step_data.append({
        "step": "initial",
        "chosen_node": start_node,
        "priority_queue": [],
        "visited_set": list(visited_set),
        "reject_set": reject_set,
        "g_costs": g_costs,
        "current_time": step_counter,
    })
    return {"message": "Graph uploaded successfully", "step": step_data[-1]}

def astar_step():
    global step_counter
    step_counter += 1  

    nodes_to_release = [node for node, (_, release_time) in bot_occupancy.items() if release_time <= step_counter]
    for node in nodes_to_release:
        del bot_occupancy[node]

    if priority_queue.empty():
        priority_queue.put((heuristic(start_node, goal_node), start_node))

    if not priority_queue.empty():
        _, current_node = priority_queue.get()
        visited_set.add(current_node)

        if current_node == goal_node:
            return {"message": "Destination reached", "final_path": list(visited_set)}

        neighbors = graph.get(current_node, {})

        min_f_cost = float("inf")
        best_neighbors = []

        for neighbor, cost in neighbors.items():
            if neighbor in visited_set:
                continue

            if neighbor in bot_occupancy:
                bot_id, release_time = bot_occupancy[neighbor]
                if release_time > step_counter:
                    reject_set[neighbor] = f"Conflict: occupied by bot {bot_id} until time {release_time}"
                    continue

            new_g = g_costs[current_node] + cost
            h = heuristic(neighbor, goal_node)
            f = new_g + h

            if neighbor not in g_costs or new_g < g_costs[neighbor]:
                g_costs[neighbor] = new_g

                if f < min_f_cost:
                    min_f_cost = f
                    best_neighbors = [neighbor]
                elif f == min_f_cost:
                    best_neighbors.append(neighbor)
                    
        for best in best_neighbors:
            priority_queue.put((min_f_cost, best))

        step_data.append({
            "step": "processing",
            "chosen_node": current_node,
            "priority_queue": list(priority_queue.queue),
            "visited_set": list(visited_set),
            "reject_set": reject_set,
            "g_costs": g_costs,
            "current_time": step_counter,
        })
        return step_data[-1]

    return {"message": "No more steps", "final_path": list(visited_set)}

@app.route("/upload", methods=["POST"])
def upload():
    data = request.get_json()
    return load_graph(data)

@app.route("/next", methods=["GET"])
def next_step():
    return jsonify(astar_step())

@app.route("/prev", methods=["GET"])
def prev_step():
    if len(step_data) > 1:
        step_data.pop()
        return jsonify(step_data[-1])
    return jsonify({"message": "Already at the first step", "step": step_data[0]})

@app.route("/reset", methods=["GET"])
def reset():
    return jsonify(load_graph({"nodes": graph, "start": start_node, "goal": goal_node, "bot_occupancy": bot_occupancy}))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
