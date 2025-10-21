import type { Request, Response } from "express";
import { z } from "zod";
import prisma from "../utils/prisma";

const createFeedbackSchema = z.object({
	roomId: z.string().min(1),
	message: z.string().min(1),
});

const updateFeedbackStatusSchema = z.object({
	status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]),
	comment: z.string().min(1),
});

export const getAllFeedback = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const { roomId, status, userId } = req.query;

		const feedback = await prisma.roomFeedback.findMany({
			where: {
				...(roomId ? { roomId: roomId as string } : {}),
				...(status
					? { status: status as "OPEN" | "RESOLVED" | "DISMISSED" }
					: {}),
				...(userId ? { userId: userId as string } : {}),
			},
			include: {
				room: {
					select: {
						id: true,
						name: true,
						locationId: true,
					},
				},
				user: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
					},
				},
				resolver: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
		});

		res.json({ feedback });
	} catch (_error) {
		res.status(500).json({ error: "Failed to fetch feedback" });
	}
};

export const getRoomFeedback = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const { roomId } = req.params;

		const feedback = await prisma.roomFeedback.findMany({
			where: { roomId },
			include: {
				room: {
					select: {
						id: true,
						name: true,
						locationId: true,
					},
				},
				user: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
					},
				},
				resolver: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
		});

		res.json({ feedback });
	} catch (_error) {
		res.status(500).json({ error: "Failed to fetch feedback" });
	}
};

export const createFeedback = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		if (!req.user) {
			res.status(401).json({ error: "Authentication required" });
			return;
		}

		const validatedData = createFeedbackSchema.parse(req.body);

		// Verify room exists
		const room = await prisma.room.findUnique({
			where: { id: validatedData.roomId },
		});

		if (!room) {
			res.status(404).json({ error: "Room not found" });
			return;
		}

		const feedback = await prisma.roomFeedback.create({
			data: {
				roomId: validatedData.roomId,
				userId: req.user.userId,
				message: validatedData.message,
			},
			include: {
				room: {
					select: {
						id: true,
						name: true,
						locationId: true,
					},
				},
				user: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
					},
				},
			},
		});

		res.status(201).json({
			message: "Feedback submitted successfully",
			feedback,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			res.status(400).json({ error: "Invalid input", details: error.errors });
			return;
		}
		res.status(500).json({ error: "Failed to create feedback" });
	}
};

export const updateFeedbackStatus = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		if (!req.user) {
			res.status(401).json({ error: "Authentication required" });
			return;
		}

		const { id } = req.params;
		const validatedData = updateFeedbackStatusSchema.parse(req.body);

		// Verify feedback exists
		const existingFeedback = await prisma.roomFeedback.findUnique({
			where: { id },
		});

		if (!existingFeedback) {
			res.status(404).json({ error: "Feedback not found" });
			return;
		}

		const feedback = await prisma.roomFeedback.update({
			where: { id },
			data: {
				status: validatedData.status,
				resolvedBy: req.user.userId,
				resolutionComment: validatedData.comment,
			},
			include: {
				room: {
					select: {
						id: true,
						name: true,
						locationId: true,
					},
				},
				user: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
					},
				},
				resolver: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
					},
				},
			},
		});

		res.json({
			message: "Feedback status updated successfully",
			feedback,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			res.status(400).json({ error: "Invalid input", details: error.errors });
			return;
		}
		res.status(500).json({ error: "Failed to update feedback status" });
	}
};
