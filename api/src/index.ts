import app from "./app";
import prisma from "./utils/prisma";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
	try {
		// Test database connection
		await prisma.$connect();
		console.log("✓ Database connected successfully");

		// Start server
		app.listen(PORT, () => {
			console.log(`✓ Server running on port ${PORT}`);
			console.log(`✓ Environment: ${process.env.NODE_ENV || "development"}`);
			console.log(`✓ Health check: http://localhost:${PORT}/health`);
		});
	} catch (error) {
		console.error("Failed to start server:", error);
		process.exit(1);
	}
};

// Handle graceful shutdown
process.on("SIGINT", async () => {
	console.log("\nShutting down gracefully...");
	await prisma.$disconnect();
	process.exit(0);
});

process.on("SIGTERM", async () => {
	console.log("\nShutting down gracefully...");
	await prisma.$disconnect();
	process.exit(0);
});

startServer();
