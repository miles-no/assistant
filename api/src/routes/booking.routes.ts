import { Router } from "express";
import {
	createBooking,
	deleteBooking,
	getAllBookings,
	getBookingById,
	updateBooking,
} from "../controllers/booking.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get("/", getAllBookings);
router.get("/:id", getBookingById);
router.post("/", createBooking);
router.patch("/:id", updateBooking);
router.delete("/:id", deleteBooking);

export default router;
