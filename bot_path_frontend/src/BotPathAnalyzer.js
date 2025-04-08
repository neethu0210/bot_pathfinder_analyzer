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
        return (
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <svg width="120" height="80">
              <circle cx="60" cy="40" r="30" fill="#4caf50" />
              <text
                x="60"
                y="45"
                textAnchor="middle"
                fill="#fff"
                fontSize="12"
                dominantBaseline="middle"
              >
                {entry.coordinate}
              </text>
            </svg>
            <p style={{ fontSize: "0.9rem" }}>Added Node</p>
          </div>
        );
      }
      return null;
    };
       

    const renderSrcDstGraph = () => {
      if (entry.event === "path_calculation_started") {
        return (
          <svg width="300" height="120" style={{ marginTop: "1rem" }}>
            <circle cx="60" cy="60" r="25" fill="#4caf50" />
            <text x="60" y="65" fill="#fff" textAnchor="middle" fontSize="12">
              Src
            </text>
            <text x="10" y="105" fontSize="10">
              {entry.source}
            </text>

            <circle cx="240" cy="60" r="25" fill="#f44336" />
            <text x="240" y="65" fill="#fff" textAnchor="middle" fontSize="12">
              Dst
            </text>
            <text x="190" y="105" fontSize="10">
              {entry.destination}
            </text>

            <line
              x1="85"
              y1="60"
              x2="215"
              y2="60"
              stroke="#000"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />

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
          </svg>
        );
      }
      return null;
    };

    return (
      <div style={{ marginTop: "2rem" }}>
        {renderAddedNode()}
        {renderSrcDstGraph()}

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
