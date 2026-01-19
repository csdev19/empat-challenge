import { cors } from "@elysiajs/cors";
import { createAuth } from "@empat-challenge/auth";
import { Elysia } from "elysia";
import { hiringProcessRoutes } from "./routes/hiring-processes";
import { companyDetailsRoutes } from "./routes/company-details";
import { interactionRoutes } from "./routes/interactions";
import { getEnv } from "./utils/env";

const env = getEnv();

// Configure CORS once at the app level
const corsConfig = {
  origin: env.CORS_ORIGIN,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  credentials: true,
  maxAge: 86400, // 24 hours
};

const authRoutes = new Elysia().use(cors(corsConfig)).mount(createAuth(env.CORS_ORIGIN).handler);

const apiRoutes = new Elysia({
  prefix: "/api/v1",
})
  .use(cors(corsConfig))
  .use(hiringProcessRoutes)
  .use(companyDetailsRoutes)
  .use(interactionRoutes)
  .get("/health", () => ({
    status: "healthy",
    timestamp: new Date().toISOString(),
  }));

const app = new Elysia().use(authRoutes).use(apiRoutes);

export type App = typeof app;

// Listen on the port provided by Railway (or default to 3000 for development)
const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
});
