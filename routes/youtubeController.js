// youtubeController.js
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

export async function getLiveStreamDetails(req, res) {
  console.log("getLiveStreamDetails called with videoId:", req.params.videoId);

  try {
    // Validate API key
    if (!process.env.YOUTUBE_API_KEY) {
      console.error("YouTube API key is missing");
      return res.status(500).json({
        message: "Server configuration error: Missing API key",
      });
    }

    // Validate video ID
    const { videoId } = req.params;
    if (!videoId) {
      console.error("Video ID is missing");
      return res.status(400).json({
        message: "Video ID is required",
      });
    }

    console.log("Fetching YouTube data for video:", videoId);

    // Fetch video details
    const { data } = await youtube.videos.list({
      part: ["liveStreamingDetails", "snippet"],
      id: videoId,
    });

    console.log(
      "YouTube API response received:",
      JSON.stringify(data, null, 2)
    );

    // Check if video exists
    if (!data.items || data.items.length === 0) {
      console.log("No video found for ID:", videoId);
      return res.status(404).json({
        message: "Stream not found",
      });
    }

    const streamData = data.items[0];
    const liveData = streamData.liveStreamingDetails;
    const snippet = streamData.snippet;

    // Prepare response data
    const responseData = {
      viewerCount: liveData?.concurrentViewers
        ? parseInt(liveData.concurrentViewers)
        : 0,
      title: snippet?.title || "Untitled Stream",
      isLive: Boolean(liveData && !liveData.actualEndTime),
      channelTitle: snippet?.channelTitle || "Unknown Channel",
    };

    // Add elapsed time if stream is live
    if (liveData?.actualStartTime) {
      const startTime = new Date(liveData.actualStartTime);
      const elapsedMs = Date.now() - startTime.getTime();
      const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));
      const elapsedMinutes = Math.floor(
        (elapsedMs % (1000 * 60 * 60)) / (1000 * 60)
      );
      responseData.elapsedTime = `${elapsedHours}h ${elapsedMinutes}m`;
    } else {
      responseData.elapsedTime = "0h 0m";
    }

    console.log("Sending response:", responseData);
    res.json(responseData);
  } catch (error) {
    console.error("Error in getLiveStreamDetails:", error);
    res.status(500).json({
      message: "Error fetching stream details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

export async function getMusicRecommendations(req, res) {
  try {
    if (!process.env.YOUTUBE_API_KEY) {
      console.error("YouTube API key is missing");
      return res.status(500).json({
        message: "Server configuration error: Missing API key",
      });
    }

    const response = await youtube.search.list({
      part: ["snippet"],
      type: "video",
      videoCategoryId: "10", // Music category ID
      chart: "mostPopular",
      maxResults: 4,
      regionCode: "US", // You can change this to your target region
      videoDuration: "medium", // Filters for medium length videos
      fields: "items(id(videoId),snippet(title,thumbnails/medium))",
    });

    const videos = response.data.items.map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
    }));

    res.json(videos);
  } catch (error) {
    console.error("Error fetching music recommendations:", error);
    res.status(500).json({
      message: "Error fetching music recommendations",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
