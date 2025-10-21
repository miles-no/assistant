import { Router } from "express";
import {
	createFeedback,
	getAllFeedback,
	getRoomFeedback,
	updateFeedbackStatus,
} from "../controllers/feedback.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// All feedback routes require authentication
router.get("/", authenticate, getAllFeedback);
router.get("/room/:roomId", authenticate, getRoomFeedback);
router.post("/", authenticate, createFeedback);
router.patch("/:id/status", authenticate, updateFeedbackStatus);

export default router;
