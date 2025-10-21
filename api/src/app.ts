import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import dotenv from "dotenv";
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import yaml from "js-yaml";
import swaggerUi from "swagger-ui-express";
import { errorHandler } from "./middleware/errorHandler";

// Import routes
import authRoutes from "./routes/auth.routes";
import bookingRoutes from "./routes/booking.routes";
import calendarRoutes from "./routes/calendar.routes";
import locationRoutes from "./routes/location.routes";
import mcpRoutes from "./routes/mcp.routes";
import roomRoutes from "./routes/room.routes";

// Load environment variables
dotenv.config();

// Load OpenAPI specification
const openApiPath = path.join(__dirname, "../openapi.yaml");
const openApiDocument = yaml.load(
	fs.readFileSync(openApiPath, "utf8"),
) as object;

const app: Application = express();

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
	"http://localhost:3000",
];
app.use(
	cors({
		origin: allowedOrigins,
		credentials: true,
	}),
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Documentation
app.use(
	"/api-docs",
	swaggerUi.serve,
	swaggerUi.setup(openApiDocument, {
		customCss: ".swagger-ui .topbar { display: none }",
		customSiteTitle: "Miles Booking API Documentation",
	}),
);

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
	res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/mcp", mcpRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
	res.status(404).json({ error: "Route not found" });
});

// Error handling middleware (should be last)
app.use(errorHandler);

export default app;
