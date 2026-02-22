import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authMiddleware, adminOnly, AuthRequest } from "./auth";
import { doubtRoutes } from "./routes/doubts";
import { voiceRoutes } from "./routes/voice";
import { studentRoutes } from "./routes/student";
import { adminRoutes } from "./routes/admin";
import { authRoutes } from "./routes/auth-routes";

const app = express();
const PORT = process.env.PORT || 4000;

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:3000").split(",");

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
}));

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Public auth routes (no session required)
app.use("/api/auth", authRoutes);

// Protected student routes
app.use("/api/doubts", authMiddleware, doubtRoutes);
app.use("/api/voice", authMiddleware, voiceRoutes);
app.use("/api/student", authMiddleware, studentRoutes);

// Protected admin routes
app.use("/api/admin", authMiddleware, adminOnly, adminRoutes);

app.listen(PORT, () => {
  console.log(`Express API server running on port ${PORT}`);
  console.log(`CORS origins: ${ALLOWED_ORIGINS.join(", ")}`);
});

export default app;
