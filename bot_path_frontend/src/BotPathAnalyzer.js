import React, { useState } from "react";
import axios from "axios";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [stepData, setStepData] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setUploadMessage("");
    setUploadProgress(0);
    setStepData(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setIsUploading(true);
      const res = await axios.post("http://127.0.0.1:5000/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percent);
          }
        },
      });

      if (res.status === 200) {
        setUploadMessage("✅ File uploaded successfully!");
      } else {
        setUploadMessage("❌ Upload failed.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadMessage("❌ Error uploading file.");
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1500);
    }
  };

  const handleStepAction = async (action) => {
    try {
      const res = await axios.get(`http://127.0.0.1:5000/${action}`);
      setStepData(res.data);
    } catch (err) {
      console.error(`${action} error:`, err);
      setStepData({ error: `❌ Failed to fetch ${action} data.` });
    }
  };

  const renderStepVisualization = (stepData) => {
    if (!stepData || !stepData.entry) return null;

    const { entry, priority_queue, visited_set, reject_set } = stepData;

    const renderQueueNode = (node, index) => {
      const [f, g, h, coord] = node;
      return (
        <div
          key={index}
          style={{
            border: "1px solid #333",
            padding: "0.5rem",
            marginRight: "0.5rem",
            borderRadius: "8px",
            backgroundColor: "#e0f7fa",
            textAlign: "center",
            minWidth: "120px",
          }}
        >
          <div style={{ fontWeight: "bold" }}>{coord}</div>
          <div style={{ fontSize: "0.8rem" }}>g-cost: {g} , h-cost: {h} , f-score: {f}</div>
        </div>
      );
    };

    const renderStackNode = (node, index, type) => {
      if (type === "visited") {
        const [coord, g, h, f] = node;
        return (
          <div
            key={index}
            style={{
              border: "1px solid #333",
              padding: "0.5rem",
              borderRadius: "8px",
              marginBottom: "0.5rem",
              backgroundColor: "#dcedc8",
              textAlign: "center",
              minWidth: "120px",
            }}
          >
            <div style={{ fontWeight: "bold" }}>{coord}</div>
            <div style={{ fontSize: "0.8rem" }}>g-cost: {g} , h-cost: {h} , f-score: {f}</div>
          </div>
        );
      } else if (type === "reject") {
        const [coord, reason] = node;
        return (
          <div
            key={index}
            style={{
              border: "1px solid #b71c1c",
              padding: "0.5rem",
              borderRadius: "8px",
              marginBottom: "0.5rem",
              backgroundColor: "#ffcdd2",
              textAlign: "center",
              minWidth: "120px",
            }}
          >
            <div style={{ fontWeight: "bold" }}>{coord}</div>
            <div style={{ fontSize: "0.8rem" }}>🚫 {reason}</div>
          </div>
        );
      }
      return null;
    };

    const renderAddedNode = () => {
      if (entry.event === "added_node" && entry.coordinate) {
        const nodeStr = entry.coordinate.toString();
        return (
          <div style={{ marginTop: "2rem", textAlign: "center" }}>
            <h4>Added Node</h4>
            <svg width="100%" height="150" viewBox="0 0 400 150">
              <g>
                <circle cx={200} cy={50} r="30" fill="#4caf50" />
                <text
                  x={200}
                  y={55}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="12"
                  fontWeight="bold"
                >
                  Added
                </text>
                <text
                  x={200}
                  y={110}
                  textAnchor="middle"
                  fontSize="14"
                  fill="#333"
                  fontWeight="500"
                >
                  {nodeStr}
                </text>
              </g>
            </svg>
          </div>
        );
      }
      return null;
    };          
       

    const renderSrcDstGraph = () => {
      if (entry.event === "path_calculation_started") {
        return (
          <div style={{ marginTop: "2rem", textAlign: "center" }}>
            <h4>Source to Destination</h4>
            <svg width="100%" height="180" viewBox="0 0 400 180">
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="10"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
                </marker>
              </defs>
              <circle cx="100" cy="60" r="30" fill="#4caf50" />
              <text
                x="100"
                y="65"
                textAnchor="middle"
                fill="#fff"
                fontSize="12"
                fontWeight="bold"
              >
                Src
              </text>
              <text
                x="100"
                y="120"
                textAnchor="middle"
                fontSize="13"
                fill="#333"
                fontWeight="500"
              >
                {entry.source}
              </text>
              <circle cx="300" cy="60" r="30" fill="#f44336" />
              <text
                x="300"
                y="65"
                textAnchor="middle"
                fill="#fff"
                fontSize="12"
                fontWeight="bold"
              >
                Dst
              </text>
              <text
                x="300"
                y="120"
                textAnchor="middle"
                fontSize="13"
                fill="#333"
                fontWeight="500"
              >
                {entry.destination}
              </text>
              <line
                x1="130"
                y1="60"
                x2="270"
                y2="60"
                stroke="#000"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
            </svg>
          </div>
        );
      }
      return null;
    };    

    const renderChosenNode = () => {
      if (
        entry.event === "chosen_node" &&
        entry.coordinate
      ) {
        const nodeStr = entry.coordinate.toString();
    
        return (
          <div style={{ marginTop: "2rem", textAlign: "center" }}>
            <h4>Chosen Node</h4>
            <svg width="100%" height="150" viewBox="0 0 400 150">
              <g>
                <circle cx={200} cy={50} r="30" fill="#ef5350" />
                <text
                  x={200}
                  y={55}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="12"
                  fontWeight="bold"
                >
                  Chosen
                </text>
                <text
                  x={200}
                  y={110}
                  textAnchor="middle"
                  fontSize="14"
                  fill="#333"
                  fontWeight="500"
                >
                  {nodeStr}
                </text>
              </g>
            </svg>
          </div>
        );
      }
      return null;
    };    

    const renderNeighbourConnections = () => {
      if (entry.event === "neighbours" && visited_set.length > 0 && entry.nodes) {
        const [parentCoord] = visited_set[visited_set.length - 1];
        const neighbors = entry.nodes;
        const svgHeight = 280;
        const nodeSpacing = 180;
        const baseX = 100;
        const totalWidth = baseX + nodeSpacing * (neighbors.length + 1);
        return (
          <div style={{ marginTop: "2rem", textAlign: "center" }}>
            <h4>Neighbour Connections</h4>
            <svg
              width={totalWidth}
              height={svgHeight}
              viewBox={`0 0 ${totalWidth} ${svgHeight}`}
              style={{ overflow: "visible" }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="10"
                  refY="3.5"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#333" />
                </marker>
              </defs>
              <circle cx={baseX} cy={svgHeight / 2} r="30" fill="#1976d2" />
              <text
                x={baseX}
                y={svgHeight / 2 + 5}
                textAnchor="middle"
                fill="#fff"
                fontSize="14"
                fontWeight="bold"
              >
                P
              </text>
              <text
                x={baseX}
                y={svgHeight / 2 + 55}
                textAnchor="middle"
                fontSize="13"
                fill="#333"
                fontWeight="500"
              >
                {parentCoord}
              </text>
              <text
                x={baseX}
                y={svgHeight / 2 - 40}
                textAnchor="middle"
                fontSize="12"
                fill="#0d47a1"
                fontWeight="bold"
              >
                Parent
              </text>
              {neighbors.map((neighborStr, i) => {
                const label = String.fromCharCode(65 + i); 
                const x = baseX + nodeSpacing * (i + 1);
                const y = svgHeight / 2 + (i % 2 === 0 ? -50 : 50);
                return (
                  <g key={i}>
                    <line
                      x1={baseX + 30}
                      y1={svgHeight / 2}
                      x2={x - 30}
                      y2={y}
                      stroke="#333"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                    />
                    <circle cx={x} cy={y} r="30" fill="#ff9800" />
                    <text
                      x={x}
                      y={y + 5}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize="14"
                      fontWeight="bold"
                    >
                      {label}
                    </text>
                    <text
                      x={x}
                      y={y + 50}
                      textAnchor="middle"
                      fontSize="13"
                      fill="#333"
                      fontWeight="500"
                    >
                      {neighborStr}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        );
      }
      return null;
    };    

    const renderExploringNodes = () => {
      if (
        entry.event === "exploring_node" &&
        (entry.nodes?.length > 0 || entry.data)
      ) {
        const node =
          Array.isArray(entry.nodes) && entry.nodes.length > 0
            ? entry.nodes[0]
            : entry.data;
        const nodeStr = node.toString();
        return (
          <div style={{ marginTop: "2rem", textAlign: "center" }}>
            <h4>Exploring Node</h4>
            <svg width="100%" height="150" viewBox="0 0 400 150">
              <g>
                <circle cx={200} cy={50} r="30" fill="#7e57c2" />
                <text
                  x={200}
                  y={55}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="12"
                  fontWeight="bold"
                >
                  Exploring
                </text>
                <text
                  x={200}
                  y={110}
                  textAnchor="middle"
                  fontSize="14"
                  fill="#333"
                  fontWeight="500"
                >
                  {nodeStr}
                </text>
              </g>
            </svg>
          </div>
        );
      }
      return null;
    };    
    
    const renderProcessingNode = () => {
      if (
        entry.event === "processing_node" &&
        entry.data
      ) {
        const nodeStr = entry.data.toString();
        return (
          <div style={{ marginTop: "2rem", textAlign: "center" }}>
            <h4>Processing Node</h4>
            <svg width="100%" height="150" viewBox="0 0 400 150">
              <g>
                <circle cx={200} cy={50} r="32" fill="#42a5f5" />
                <text
                  x={200}
                  y={55}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="12"
                  fontWeight="bold"
                >
                  Processing
                </text>
                <text
                  x={200}
                  y={110}
                  textAnchor="middle"
                  fontSize="14"
                  fill="#333"
                  fontWeight="500"
                >
                  {nodeStr}
                </text>
              </g>
            </svg>
          </div>
        );
      }
      return null;
    };  
    
    const renderAnchorCoord = () => {
      if (
        entry.event === "conflict_check" &&
        entry.type === "anchor_coord" &&
        entry.span_coords
      ) {
        const radius = 30;
        const spacing = 120;
        const numCoords = entry.span_coords.length;
        const totalWidth = spacing * (numCoords + 2); // some padding on the right
        const startX = (totalWidth - spacing * (numCoords + 1)) / 2;
        const anchorX = startX;
    
        return (
          <div style={{ marginTop: "2rem", textAlign: "center" }}>
            <h4>Conflict Check: Anchor Coordinate</h4>
            <svg width="100%" height="350" viewBox={`0 0 ${totalWidth} 300`}>
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="10"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
                </marker>
              </defs>
    
              {/* Anchor node */}
              <circle cx={anchorX} cy={120} r={radius} fill="#4caf50" />
              <text
                x={anchorX}
                y={120}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize="14"
                fontWeight="bold"
              >
                Anchor
              </text>
              <text
                x={anchorX}
                y={160}
                textAnchor="middle"
                fontSize="12"
                fill="#333"
                fontWeight="500"
              >
                {entry.anchor_coord}
              </text>
    
              {/* Span nodes */}
              {entry.span_coords.map((coord, index) => {
                const x = anchorX + spacing * (index + 1);
                return (
                  <g key={index}>
                    <line
                      x1={x - spacing + radius + 10}
                      y1={120}
                      x2={x - radius - 10}
                      y2={120}
                      stroke="#000"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                    />
                    <circle cx={x} cy={120} r={radius} fill="#ff9800" />
                    <text
                      x={x}
                      y={120}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#fff"
                      fontSize="14"
                      fontWeight="bold"
                    >
                      {String.fromCharCode(65 + index)}
                    </text>
                    <text
                      x={x}
                      y={160}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#333"
                      fontWeight="500"
                    >
                      {coord}
                    </text>
                  </g>
                );
              })}
    
              {/* Reservation time in a new line below all nodes */}
              {entry.res_start_time && entry.res_end_time && (
                <text
                  x={totalWidth / 2}
                  y={240}
                  textAnchor="middle"
                  fontSize="14"
                  fill="#ff5722"
                  fontWeight="bold"
                >
                  Reservation Start Time : {entry.res_start_time},  Reservation End TIme : {entry.res_end_time}
                </text>
              )}
            </svg>
          </div>
        );
      }
      return null;
    };     

    const renderIdlePlan = () => {
      if (
        entry.event === "conflict_check" &&
        entry.type === "idle_plan" &&
        entry.span_coordinate &&
        entry.idle_data
      ) {
        const centerX = 250;
        const centerY = 120;
        const radius = 30;
    
        return (
          <div style={{ marginTop: "2rem", textAlign: "center" }}>
            <h4>Conflict Check: Idle Plan</h4>
            <svg width="100%" height="300" viewBox="0 0 500 250">
              <circle cx={centerX} cy={centerY} r={radius} fill="#2196f3" />
              <text
                x={centerX}
                y={centerY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize="14"
                fontWeight="bold"
              >
                Idle Plan
              </text>
              <text
                x={centerX}
                y={centerY + 40}
                textAnchor="middle"
                fontSize="12"
                fill="#333"
                fontWeight="500"
              >
                {entry.span_coordinate}
              </text>
    
              <rect
                x={centerX - 150}
                y={centerY + 70}
                width="300"
                height="40"
                rx="8"
                ry="8"
                fill="#f5f5f5"
                stroke="#ccc"
              />
              <text
                x={centerX}
                y={centerY + 95}
                textAnchor="middle"
                fontSize="13"
                fill="#333"
                fontWeight="bold"
              >
                {entry.idle_data}
              </text>
            </svg>
          </div>
        );
      }
      return null;
    };   
    
    const renderTimeConflict = () => {
      if (
        entry.event === "conflict_check" &&
        entry.type === "time_conflict" &&
        entry.coordinate
      ) {
        const centerX = 250;
        const centerY = 120;
        const radius = 30;
    
        return (
          <div style={{ marginTop: "2rem", textAlign: "center" }}>
            <h4>Conflict Check: Time Conflict</h4>
            <svg width="100%" height="300" viewBox="0 0 500 250">
              {/* Conflict node */}
              <circle cx={centerX} cy={centerY} r={radius} fill="#e53935" />
              <text
                x={centerX}
                y={centerY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize="9"
                fontWeight="bold"
              >
                Time Conflict
              </text>
              <text
                x={centerX}
                y={centerY + 40}
                textAnchor="middle"
                fontSize="12"
                fill="#333"
                fontWeight="500"
              >
                {entry.coordinate}
              </text>
    
              {/* No idle bots message */}
              <text
                x={centerX}
                y={centerY + 75}
                textAnchor="middle"
                fontSize="13"
                fill="#555"
                fontWeight="bold"
              >
                No available idle bots to resolve conflict
              </text>
            </svg>
          </div>
        );
      }
      return null;
    };    

    const renderSummaryConflict = () => {
      if (
        entry.event === "conflict_check" &&
        entry.type === "summary" &&
        entry.coordinate
      ) {
        const centerX = 250;
        const centerY = 120;
        const radius = 30;
    
        return (
          <div style={{ marginTop: "2rem", textAlign: "center" }}>
            <h4>Conflict Check: Summary</h4>
            <svg width="100%" height="300" viewBox="0 0 500 250">
              {/* Summary node */}
              <circle cx={centerX} cy={centerY} r={radius} fill="#2196f3" />
              <text
                x={centerX}
                y={centerY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize="12"
                fontWeight="bold"
              >
                Summary
              </text>
              <text
                x={centerX}
                y={centerY + 40}
                textAnchor="middle"
                fontSize="12"
                fill="#333"
                fontWeight="500"
              >
                {entry.coordinate}
              </text>
    
              {/* No conflicts and no bot reservation message */}
              <text
                x={centerX}
                y={centerY + 75}
                textAnchor="middle"
                fontSize="13"
                fill="#555"
                fontWeight="bold"
              >
                No Time Conflicts & No Bots Reserved
              </text>
            </svg>
          </div>
        );
      }
      return null;
    };    
    
    return (
      <div style={{ marginTop: "2rem" }}>
        {renderSrcDstGraph()}
        {renderAddedNode()}
        {renderChosenNode()}
        {renderNeighbourConnections()}
        {renderExploringNodes()}
        {renderProcessingNode()}
        {renderAnchorCoord()}
        {renderIdlePlan()}
        {renderTimeConflict()}
        {renderSummaryConflict()}

        <div style={{ marginTop: "2rem" }}>
          <h4>Priority Queue</h4>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {priority_queue.length > 0 ? (
              priority_queue.map(renderQueueNode)
            ) : (
              <div style={{ fontStyle: "italic", color: "#666" }}>
                (Queue is empty)
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: "2rem", display: "flex", gap: "2rem" }}>
          <div>
            <h4>Visited Set</h4>
            <div>
              {visited_set.map((node, i) =>
                renderStackNode(node, i, "visited")
              )}
            </div>
          </div>
          <div>
            <h4>Reject Set</h4>
            <div>
              {reject_set.map((node, i) =>
                renderStackNode(node, i, "reject")
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "700px", margin: "0 auto" }}>
      <h2>Upload .log File</h2>
      <form onSubmit={handleUpload}>
        <input type="file" accept=".log" onChange={handleFileChange} />
        <br />
        <button
          type="submit"
          disabled={!selectedFile || isUploading}
          style={{ marginTop: "1rem" }}
        >
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      </form>

      {isUploading || uploadProgress > 0 ? (
        <div style={{ marginTop: "1rem" }}>
          <div
            style={{
              height: "10px",
              backgroundColor: "#ddd",
              width: "100%",
              borderRadius: "5px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${uploadProgress}%`,
                height: "100%",
                backgroundColor: "green",
                transition: "width 0.3s ease-in-out",
              }}
            />
          </div>
          <p>{uploadProgress}%</p>
        </div>
      ) : null}

      {uploadMessage && <p style={{ marginTop: "1rem" }}>{uploadMessage}</p>}

      {uploadMessage.includes("successfully") && (
        <div style={{ marginTop: "2rem" }}>
          <h3>Step Navigation</h3>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button onClick={() => handleStepAction("start")}>Start</button>
            <button onClick={() => handleStepAction("next")}>Next</button>
            <button onClick={() => handleStepAction("prev")}>Prev</button>
            <button onClick={() => handleStepAction("reset")}>Reset</button>
          </div>
        </div>
      )}

      {stepData && (
        <>
          <div style={{ marginTop: "2rem" }}>
            <h4>Step Info (Raw):</h4>
            <pre
              style={{
                background: "#f0f0f0",
                padding: "1rem",
                borderRadius: "5px",
                overflowX: "auto",
              }}
            >
              {JSON.stringify(stepData, null, 2)}
            </pre>
          </div>

          {renderStepVisualization(stepData)}
        </>
      )}
    </div>
  );
}

export default App;
