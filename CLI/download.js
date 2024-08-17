const ytdlp = require("yt-dlp-exec");
const path = require("path");
const readline = require("readline");
const fs = require("fs");
const ProgressBar = require("cli-progress");
const axios = require("axios");
const stream = require("stream");
const util = require("util");
const cron = require("node-cron"); // For scheduling

// Promisify stream.pipeline for easier usage
const pipeline = util.promisify(stream.pipeline);

// Create an interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Variable to store video URL
let videoUrl = "";
let outputDirectory = path.join(__dirname, "downloads"); // Default download directory

// Function to get available video formats
const getVideoFormats = async (url) => {
  try {
    const result = await ytdlp(url, { dumpJson: true });
    return result.formats;
  } catch (error) {
    console.error("Error fetching video formats:", error.message);
    return [];
  }
};

// Function to get video metadata
const getVideoMetadata = async (url) => {
  try {
    const result = await ytdlp(url, { dumpJson: true });
    return {
      title: result.title,
      uploader: result.uploader,
      uploadDate: result.upload_date,
    };
  } catch (error) {
    console.error("Error fetching video metadata:", error.message);
    return {};
  }
};

// Function to download a YouTube video
const downloadVideo = async (url, quality, outputFilename) => {
  try {
    const response = await ytdlp(url, { dumpJson: true, format: quality });
    const videoUrl = response.url;

    // Create a new progress bar instance
    const bar = new ProgressBar.SingleBar(
      {
        format: "Downloading: [{bar}] {percentage}% | {eta}s remaining",
        clearOnComplete: true,
      },
      ProgressBar.Presets.shades_classic
    );

    // Record the start time
    const startTime = Date.now();

    // Show progress bar
    bar.start(100, 0);

    // Setup the file stream
    const fileStream = fs.createWriteStream(
      path.join(outputDirectory, outputFilename)
    );

    // Download the video using Axios and stream
    const responseStream = await axios({
      url: videoUrl,
      method: "GET",
      responseType: "stream",
    });

    responseStream.data.on("data", (chunk) => {
      // Update progress bar
      bar.update(
        (chunk.length / responseStream.headers["content-length"]) * 100
      );
    });

    await pipeline(responseStream.data, fileStream);

    // Record the end time
    const endTime = Date.now();

    // Calculate time spent
    const timeSpent = ((endTime - startTime) / 1000).toFixed(2); // in seconds

    bar.stop(); // Stop the progress bar

    console.log(
      `Video downloaded successfully to ${path.join(
        outputDirectory,
        outputFilename
      )}`
    );
    console.log(`Time spent on download: ${timeSpent} seconds`);
  } catch (error) {
    console.error("Error downloading video:", error.message);
  }
};

// Function to prompt user for video quality
const promptUserForQuality = (formats) => {
  console.log("\nAvailable video qualities:");
  formats.forEach((format, index) => {
    if (format.width && format.height) {
      console.log(
        `${index + 1}: ${format.width}x${format.height} (${format.ext})`
      );
    }
  });

  rl.question(
    "\nSelect the number corresponding to the desired video quality: ",
    async (index) => {
      const selectedFormat = formats[parseInt(index) - 1];
      if (selectedFormat) {
        const formatCode =
          selectedFormat.format_id || selectedFormat.itag || "best";
        rl.question(
          "Enter the output filename (e.g., video.mp4): ",
          (filename) => {
            // Ensure filename has the correct extension
            if (!filename.endsWith(".mp4")) {
              filename += ".mp4";
            }

            // Download video with user inputs
            downloadVideo(videoUrl, formatCode, filename);

            // Close the readline interface
            rl.close();
          }
        );
      } else {
        console.log("Invalid selection.");
        rl.close();
      }
    }
  );
};

// Function to prompt user for output directory
const promptUserForDirectory = () => {
  rl.question(
    'Enter the directory where you want to save the video (default is "downloads"): ',
    (dir) => {
      if (dir) {
        outputDirectory = dir;
        if (!fs.existsSync(outputDirectory)) {
          fs.mkdirSync(outputDirectory, { recursive: true });
        }
      }
      promptUserForMetadata();
    }
  );
};

// Function to prompt user for video metadata
const promptUserForMetadata = async () => {
  rl.question("Enter the YouTube video URL: ", async (url) => {
    videoUrl = url;
    const formats = await getVideoFormats(url);

    if (formats.length > 0) {
      promptUserForQuality(formats);
    } else {
      console.log("No formats available for this video.");
      rl.close();
    }
  });
};

// Function to prompt user for scheduling
const promptUserForScheduling = () => {
  rl.question(
    "Do you want to schedule the download? (y/n): ",
    async (response) => {
      if (response.toLowerCase() === "y") {
        rl.question(
          'Enter the cron schedule (e.g., "0 0 * * *" for daily at midnight): ',
          (schedule) => {
            cron.schedule(schedule, () => {
              console.log("Running scheduled download...");
              promptUserForMetadata();
            });
            console.log(`Download scheduled with cron expression: ${schedule}`);
          }
        );
      } else {
        promptUserForDirectory();
      }
    }
  );
};

// Start the process
promptUserForScheduling();
