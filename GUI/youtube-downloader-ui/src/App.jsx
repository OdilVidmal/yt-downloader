import  { useState } from "react";
import axios from "axios";
import ProgressBar from "react-bootstrap/ProgressBar";
import "bootstrap/dist/css/bootstrap.min.css";

function App() {
  const [videoUrl, setVideoUrl] = useState("");
  const [quality, setQuality] = useState("best");
  const [outputFilename, setOutputFilename] = useState("");
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadVideo = async () => {
    try {
      setIsDownloading(true);
      const response = await axios.post(
        "/download",
        { videoUrl, quality, outputFilename },
        {
          onDownloadProgress: (progressEvent) => {
            const totalLength = progressEvent.lengthComputable
              ? progressEvent.total
              : progressEvent.target.getResponseHeader("content-length") ||
                progressEvent.target.getResponseHeader(
                  "x-decompressed-content-length"
                );
            if (totalLength !== null) {
              setProgress(
                Math.round((progressEvent.loaded * 100) / totalLength)
              );
            }
          },
        }
      );

      if (response.data.success) {
        alert("Download complete!");
      } else {
        alert("An error occurred while downloading the video.");
      }
    } catch (error) {
      console.error("Error downloading video:", error);
      alert(`An error occurred while downloading the video: ${error.message}`);
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">
          YouTube Video Downloader
        </h1>
        <div className="flex flex-col space-y-4">
          <input
            type="text"
            placeholder="Enter YouTube video URL"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="p-2 border border-gray-300 rounded"
          />
          <br></br>
          <br></br>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            className="p-2 border border-gray-300 rounded"
          >
            <option value="best">Best Quality</option>
            <option value="1080">1080p</option>
            <option value="720">720p</option>
            <option value="480">480p</option>
            <option value="360">360p</option>
          </select>
          <br></br>
          <br></br>
          <input
            type="text"
            placeholder="Enter output filename (e.g., video.mp4)"
            value={outputFilename}
            onChange={(e) => setOutputFilename(e.target.value)}
            className="p-2 border border-gray-300 rounded"
          />
          <br></br>
          <br></br>
          <button
            onClick={downloadVideo}
            disabled={isDownloading}
            className={`p-2 bg-blue-500 text-white rounded ${
              isDownloading
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-blue-600"
            }`}
          >
            {isDownloading ? "Downloading..." : "Download Video"}
          </button>
        </div>
        {isDownloading && (
          <div className="mt-6">
            <ProgressBar now={progress} label={`${progress}%`} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
