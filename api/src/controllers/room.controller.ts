import type { Request, Response } from "express";
import { z } from "zod";
import prisma from "../utils/prisma";

const createRoomSchema = z.object({
	name: z.string().min(1),
	locationId: z.string(),
	capacity: z.number().int().positive(),
	description: z.string().optional(),
	amenities: z.array(z.string()).default([]),
});

const updateRoomSchema = z.object({
	name: z.string().min(1).optional(),
	capacity: z.number().int().positive().optional(),
	description: z.string().optional(),
	amenities: z.array(z.string()).optional(),
	isActive: z.boolean().optional(),
});

export const getAllRooms = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const { locationId } = req.query;

		const rooms = await prisma.room.findMany({
			where: locationId ? { locationId: locationId as string } : undefined,
			include: {
				location: {
					select: {
						id: true,
						name: true,
						city: true,
						country: true,
					},
				},
				_count: {
					select: { bookings: true },
				},
			},
			orderBy: { name: "asc" },
		});

		res.json({ rooms });
	} catch (_error) {
		res.status(500).json({ error: "Failed to fetch rooms" });
	}
};

export const getRoomById = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;

		const room = await prisma.room.findUnique({
			where: { id },
			include: {
				location: true,
			},
		});

		if (!room) {
			res.status(404).json({ error: "Room not found" });
			return;
		}

		res.json({ room });
	} catch (_error) {
		res.status(500).json({ error: "Failed to fetch room" });
	}
};

export const createRoom = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const data = createRoomSchema.parse(req.body);

		// Verify location exists
		const location = await prisma.location.findUnique({
			where: { id: data.locationId },
		});

		if (!location) {
			res.status(404).json({ error: "Location not found" });
			return;
		}

		// If user is a manager, verify they manage this location
		if (req.user?.role === "MANAGER") {
			const managerLocation = await prisma.managerLocation.findUnique({
				where: {
					userId_locationId: {
						userId: req.user.userId,
						locationId: data.locationId,
					},
				},
			});

			if (!managerLocation) {
				res
					.status(403)
					.json({ error: "Not authorized to create rooms in this location" });
				return;
			}
		}

		const room = await prisma.room.create({
			data,
			include: {
				location: true,
			},
		});

		res.status(201).json({
			message: "Room created successfully",
			room,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			res
				.status(400)
				.json({ error: "Validation error", details: error.errors });
			return;
		}
		res.status(500).json({ error: "Failed to create room" });
	}
};

export const updateRoom = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;
		const data = updateRoomSchema.parse(req.body);

		const room = await prisma.room.update({
			where: { id },
			data,
			include: {
				location: true,
			},
		});

		res.json({
			message: "Room updated successfully",
			room,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			res
				.status(400)
				.json({ error: "Validation error", details: error.errors });
			return;
		}
		res.status(500).json({ error: "Failed to update room" });
	}
};

export const deleteRoom = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;

		await prisma.room.delete({
			where: { id },
		});

		res.json({ message: "Room deleted successfully" });
	} catch (_error) {
		res.status(500).json({ error: "Failed to delete room" });
	}
};

export const getRoomAvailability = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;
		const { startDate, endDate } = req.query;

		if (!startDate || !endDate) {
			res.status(400).json({ error: "startDate and endDate are required" });
			return;
		}

		const start = new Date(startDate as string);
		const end = new Date(endDate as string);

		if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
			res.status(400).json({ error: "Invalid date format" });
			return;
		}

		const bookings = await prisma.booking.findMany({
			where: {
				roomId: id,
				status: { not: "CANCELLED" },
				OR: [
					{
						AND: [{ startTime: { lte: start } }, { endTime: { gt: start } }],
					},
					{
						AND: [{ startTime: { lt: end } }, { endTime: { gte: end } }],
					},
					{
						AND: [{ startTime: { gte: start } }, { endTime: { lte: end } }],
					},
				],
			},
			include: {
				user: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
					},
				},
			},
			orderBy: { startTime: "asc" },
		});

		res.json({ bookings });
	} catch (_error) {
		res.status(500).json({ error: "Failed to fetch room availability" });
	}
};
