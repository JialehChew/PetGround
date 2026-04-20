const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
require("express-async-errors");
const app = express();

const mongoose = require("mongoose");
const cors = require("cors");
const { requestDebugMiddleware } = require("./middleware/requestDebugMiddleware");
const errorMiddleware = require("./middleware/errorMiddleware");

// ✅ CORS（必须在最前）
app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));

app.options('*', cors());

app.use(express.json());

// 👉 routes（确保你有 require routes）
const routes = require("./routes");
app.use("/api", routes);

// 👉 error middleware（最后）
app.use(errorMiddleware);
const isProduction = process.env.NODE_ENV === "production";

// Set up allowed origins from environment variables
const allowedOrigins = [
  process.env.SECONDARY_URL, // optional secondary URL
  process.env.CLIENT_URL, // primary client URL
  "http://localhost:5173", // local development (Vite default)
  "http://localhost:5174", // Vite fallback when 5173 is taken
  "http://localhost:3000", // if client runs on 3000
].filter(Boolean); // removes any undefined/null values

console.log("Allowed CORS origins:", allowedOrigins);
console.log("Environment CLIENT_URL:", process.env.CLIENT_URL);

const corsDebug = !isProduction && process.env.DEBUG_HTTP === "1";

const corsOptions = {
  origin: function (origin, callback) {
    if (corsDebug) {
      console.log("CORS check - Request origin:", origin);
      console.log("CORS check - Allowed origins:", allowedOrigins);
    }

    // allow requests with no origin - mobile apps, Postman, etc.
    if (!origin) {
      if (corsDebug) {
        console.log("CORS: Allowing request with no origin");
      }
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      if (corsDebug) {
        console.log("CORS: Origin allowed:", origin);
      }
      callback(null, true);
    } else {
      if (corsDebug) {
        console.log("CORS: Origin NOT allowed:", origin);
        console.log("CORS: Available origins:", allowedOrigins);
      }
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Origin", "Accept"],
  exposedHeaders: ["Authorization"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Apply CORS before any routes
app.use(cors(corsOptions));

// Enable pre-flight requests for all routes
app.options("*", cors(corsOptions));

app.use(express.json());

// One line per request: `[http] METHOD path status` (see requestDebugMiddleware). Optional: ENABLE_MORGAN=1 for morgan.
if (process.env.ENABLE_MORGAN === "1") {
  const logger = require("morgan");
  app.use(logger(isProduction ? "combined" : "dev"));
}

app.use(requestDebugMiddleware());

// MongoDB connection configuration
const constructMongoURI = () => {
  const username = encodeURIComponent(process.env.MONGODB_USERNAME);
  const password = encodeURIComponent(process.env.MONGODB_PASSWORD);
  const cluster = process.env.MONGODB_CLUSTER;
  const database = process.env.MONGODB_DATABASE;

  return `mongodb+srv://${username}:${password}@${cluster}.dys46.mongodb.net/${database}?retryWrites=true&w=majority`;
};

const mongoUri =
  process.env.MONGODB_URI?.trim() || constructMongoURI();

// MongoDB connection (catch so bad local .env does not crash the process)
mongoose
  .connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    console.error(
      "Set MONGODB_URI in server/.env (Atlas connection string) or valid MONGODB_USERNAME / MONGODB_PASSWORD / MONGODB_CLUSTER / MONGODB_DATABASE."
    );
  });

mongoose.connection.on("connected", () => {
  console.log(`Connected to MongoDB ${mongoose.connection.name}`);
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Routes
const authRouter = require("./routes/authRoutes");
const petRouter = require("./routes/petRoutes");
const groomerRouter = require("./routes/groomerRoutes");
const appointmentRouter = require("./routes/appointmentRoutes");
const adminRouter = require("./routes/adminRoutes");
const promotionRouter = require("./routes/promotionRoutes");

app.use("/api/auth", authRouter);
app.use("/api/pets", petRouter);
app.use("/api/groomers", groomerRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/admin", adminRouter);
app.use("/api/promotions", promotionRouter);

// Global error handler (must be last among middleware)
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
