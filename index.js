// server.js
import express from "express";
import { Server } from "socket.io";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import chatController from "./routes/chatController.js";
import {
  getLiveStreamDetails,
  getMusicRecommendations,
} from "./routes/youtubeController.js";

// Configure environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Initialize chat controller with io instance
chatController(io);

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.get("/", (req, res) => {
  res.json({ hello: "world" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// YouTube stream route
app.get("/api/live-stream-details/:videoId", async (req, res) => {
  try {
    console.log("Received request for videoId:", req.params.videoId);
    await getLiveStreamDetails(req, res);
  } catch (error) {
    console.error("Route handler error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// YouTube Recommendation route
app.get("/api/music-recommendations", async (req, res) => {
  try {
    await getMusicRecommendations(req, res);
  } catch (error) {
    console.error("Route handler error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// 404 handler - Must be before error handler
app.use((req, res) => {
  console.log("404 - Not Found:", req.url);
  res.status(404).json({ message: "Route not found" });
});

// Error handler - Must be last
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 3006;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Environment:", process.env.NODE_ENV);
  console.log("YouTube API Key present:", !!process.env.YOUTUBE_API_KEY);
});

export default app;
