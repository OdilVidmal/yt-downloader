const express = require("express");
const cors = require("cors");
const ytdlp = require("yt-dlp-exec");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

app.post("/download", async (req, res) => {
  const { videoUrl, quality, filename } = req.body;

  if (!videoUrl || !quality || !filename) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const outputDirectory = path.join(__dirname, "downloads");

  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }

  const outputPath = path.join(outputDirectory, filename);

  try {
    const ytdlpOptions = {
      output: outputPath,
      format:
        quality === "best"
          ? "bestvideo+bestaudio"
          : `bestvideo[height<=${quality}]+bestaudio/best`,
      mergeOutputFormat: path.extname(filename).slice(1) || "mp4",
      progress: (info) => {
        // You may need to handle progress updates in a different way
        console.log(`Download progress: ${info.percent}%`);
      },
    };

    await ytdlp(videoUrl, ytdlpOptions);

    res.status(200).json({ message: "Download completed" });
  } catch (error) {
    console.error("Error downloading video:", error);
    res.status(500).json({ error: "Error downloading video" });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
