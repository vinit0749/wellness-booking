import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import appointmentRoutes from "./routes/appointments.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const configuredOrigins = process.env.CORS_ORIGIN?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = configuredOrigins?.map((origin) => {
  let parsedOrigin;

  try {
    parsedOrigin = new URL(origin);
  } catch {
    throw new Error("CORS_ORIGIN must contain valid HTTP or HTTPS origins.");
  }

  if (
    !["http:", "https:"].includes(parsedOrigin.protocol) ||
    parsedOrigin.username ||
    parsedOrigin.password ||
    !["", "/"].includes(parsedOrigin.pathname) ||
    parsedOrigin.search ||
    parsedOrigin.hash
  ) {
    throw new Error("CORS_ORIGIN must contain valid HTTP or HTTPS origins.");
  }

  return parsedOrigin.origin;
});
let connectionPromise;

export default app;

app.use(
  cors(
    allowedOrigins?.length
      ? { origin: [...new Set(allowedOrigins)] }
      : process.env.NODE_ENV === "production"
        ? { origin: false }
        : {},
  ),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    message: "Wellness Booking API is running",
  });
});

async function connectToDatabase(_req, _res, next) {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not configured.");
    }

    if (!connectionPromise || mongoose.connection.readyState === 0) {
      connectionPromise = mongoose
        .connect(process.env.MONGODB_URI)
        .catch((error) => {
          connectionPromise = undefined;
          throw error;
        });
    }

    await connectionPromise;
    return next();
  } catch (error) {
    return next(error);
  }
}

app.use("/api/appointments", connectToDatabase, appointmentRoutes);

app.use((error, _req, res, _next) => {
  console.error("API request failed:", error.message);
  res.status(500).json({ message: "The API could not complete this request." });
});

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not configured.");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start the API:", error.message);
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  startServer();
}
