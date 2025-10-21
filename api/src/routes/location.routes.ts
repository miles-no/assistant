import { Router } from "express";
import {
	assignManager,
	createLocation,
	deleteLocation,
	getAllLocations,
	getLocationById,
	removeManager,
	updateLocation,
} from "../controllers/location.controller";
import { authenticate } from "../middleware/auth";
import { authorize, authorizeLocationManager } from "../middleware/authorize";

const router = Router();

// Public routes
router.get("/", getAllLocations);
router.get("/:id", getLocationById);

// Admin-only routes
router.post("/", authenticate, authorize("ADMIN"), createLocation);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteLocation);

// Admin or Manager of location routes
router.patch("/:id", authenticate, authorizeLocationManager, updateLocation);

// Manager assignment (Admin only)
router.post("/:id/managers", authenticate, authorize("ADMIN"), assignManager);
router.delete(
	"/:id/managers/:userId",
	authenticate,
	authorize("ADMIN"),
	removeManager,
);

export default router;
