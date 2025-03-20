import http.server
import json
import socketserver
from urllib.parse import urlparse, parse_qs

PORT = 5000

# Global variables for A* search state
graph = {}
start_node = None
destination_node = None
priority_queue = []
visited_set = set()
reject_set = set()
path_steps = []
current_step = -1
   