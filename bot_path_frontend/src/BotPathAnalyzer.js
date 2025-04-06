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

  return (
    <div style={{ padding: "2rem", maxWidth: "600px" }}>
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

      {uploadMessage && uploadMessage.includes("successfully") && (
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
        <div style={{ marginTop: "2rem" }}>
          <h4>Step Info:</h4>
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
      )}
    </div>
  );
}

export default App;