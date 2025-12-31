import 'dotenv/config';
import http from "http";
import app from "./app.js";
import { initSocket } from "./config/socket.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Connect DB and start server
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to start server:", err);
  });
