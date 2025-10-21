import { Router } from "express";
import {
	getOfficeCalendar,
	getRoomCalendar,
	getUserCalendar,
} from "../controllers/calendar.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// Calendar feeds - can be accessed with authentication
// (in production, you might want to use token-based auth in URL params for calendar apps)
router.get("/office/:locationId.ics", authenticate, getOfficeCalendar);
router.get("/room/:roomId.ics", authenticate, getRoomCalendar);
router.get("/user/:userId.ics", authenticate, getUserCalendar);

export default router;
