import express from "express";
import cors from "cors";
import morgan from "morgan";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Health Check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Game server is running 🚀",
  });
});

export default app;
