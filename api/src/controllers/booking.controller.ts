import type { Request, Response } from "express";
import { z } from "zod";
import prisma from "../utils/prisma";

const createBookingSchema = z.object({
	roomId: z.string(),
	startTime: z.string().datetime(),
	endTime: z.string().datetime(),
	title: z.string().min(1),
	description: z.string().optional(),
});

const updateBookingSchema = z.object({
	startTime: z.string().datetime().optional(),
	endTime: z.string().datetime().optional(),
	title: z.string().min(1).optional(),
	description: z.string().optional(),
	status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
});

// Check if a time slot is available
const isRoomAvailable = async (
	roomId: string,
	startTime: Date,
	endTime: Date,
	excludeBookingId?: string,
): Promise<boolean> => {
	const conflictingBooking = await prisma.booking.findFirst({
		where: {
			roomId,
			id: excludeBookingId ? { not: excludeBookingId } : undefined,
			status: { not: "CANCELLED" },
			OR: [
				{
					AND: [
						{ startTime: { lte: startTime } },
						{ endTime: { gt: startTime } },
					],
				},
				{
					AND: [{ startTime: { lt: endTime } }, { endTime: { gte: endTime } }],
				},
				{
					AND: [
						{ startTime: { gte: startTime } },
						{ endTime: { lte: endTime } },
					],
				},
			],
		},
	});

	return !conflictingBooking;
};

export const getAllBookings = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const { roomId, locationId, startDate, endDate } = req.query;

		// Build where clause based on user role
		const whereClause: any = {};

		// Regular users can only see their own bookings
		if (req.user?.role === "USER") {
			whereClause.userId = req.user.userId;
		}

		// Managers can see bookings for their managed locations
		if (req.user?.role === "MANAGER") {
			const managedLocations = await prisma.managerLocation.findMany({
				where: { userId: req.user.userId },
				select: { locationId: true },
			});

			const locationIds = managedLocations.map((ml) => ml.locationId);

			whereClause.room = {
				locationId: { in: locationIds },
			};
		}

		// Apply filters
		if (roomId) {
			whereClause.roomId = roomId as string;
		}

		if (locationId) {
			whereClause.room = {
				...whereClause.room,
				locationId: locationId as string,
			};
		}

		if (startDate || endDate) {
			const start = startDate ? new Date(startDate as string) : undefined;
			const end = endDate ? new Date(endDate as string) : undefined;

			whereClause.AND = [];

			if (start) {
				whereClause.AND.push({ endTime: { gte: start } });
			}

			if (end) {
				whereClause.AND.push({ startTime: { lte: end } });
			}
		}

		const bookings = await prisma.booking.findMany({
			where: whereClause,
			include: {
				room: {
					include: {
						location: {
							select: {
								id: true,
								name: true,
								city: true,
								timezone: true,
							},
						},
					},
				},
				user: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true,
					},
				},
			},
			orderBy: { startTime: "asc" },
		});

		res.json({ bookings });
	} catch (_error) {
		res.status(500).json({ error: "Failed to fetch bookings" });
	}
};

export const getBookingById = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;

		const booking = await prisma.booking.findUnique({
			where: { id },
			include: {
				room: {
					include: {
						location: true,
					},
				},
				user: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true,
					},
				},
			},
		});

		if (!booking) {
			res.status(404).json({ error: "Booking not found" });
			return;
		}

		// Check permissions
		if (req.user?.role === "USER" && booking.userId !== req.user.userId) {
			res.status(403).json({ error: "Not authorized to view this booking" });
			return;
		}

		if (req.user?.role === "MANAGER") {
			const managerLocation = await prisma.managerLocation.findUnique({
				where: {
					userId_locationId: {
						userId: req.user.userId,
						locationId: booking.room.locationId,
					},
				},
			});

			if (!managerLocation) {
				res.status(403).json({ error: "Not authorized to view this booking" });
				return;
			}
		}

		res.json({ booking });
	} catch (_error) {
		res.status(500).json({ error: "Failed to fetch booking" });
	}
};

export const createBooking = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const data = createBookingSchema.parse(req.body);
		const startTime = new Date(data.startTime);
		const endTime = new Date(data.endTime);

		// Validate times
		if (startTime >= endTime) {
			res.status(400).json({ error: "End time must be after start time" });
			return;
		}

		if (startTime < new Date()) {
			res.status(400).json({ error: "Cannot book in the past" });
			return;
		}

		// Verify room exists and is active
		const room = await prisma.room.findUnique({
			where: { id: data.roomId },
		});

		if (!room) {
			res.status(404).json({ error: "Room not found" });
			return;
		}

		if (!room.isActive) {
			res.status(400).json({ error: "Room is not available for booking" });
			return;
		}

		// Check availability
		const available = await isRoomAvailable(data.roomId, startTime, endTime);

		if (!available) {
			res
				.status(409)
				.json({ error: "Room is not available for the selected time slot" });
			return;
		}

		// Create booking
		const booking = await prisma.booking.create({
			data: {
				roomId: data.roomId,
				userId: req.user?.userId,
				startTime,
				endTime,
				title: data.title,
				description: data.description,
			},
			include: {
				room: {
					include: {
						location: true,
					},
				},
				user: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true,
					},
				},
			},
		});

		res.status(201).json({
			message: "Booking created successfully",
			booking,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			res
				.status(400)
				.json({ error: "Validation error", details: error.errors });
			return;
		}
		res.status(500).json({ error: "Failed to create booking" });
	}
};

export const updateBooking = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;
		const data = updateBookingSchema.parse(req.body);

		// Get existing booking
		const existingBooking = await prisma.booking.findUnique({
			where: { id },
			include: {
				room: true,
			},
		});

		if (!existingBooking) {
			res.status(404).json({ error: "Booking not found" });
			return;
		}

		// Check permissions - only owner, managers of the location, or admins can update
		if (
			req.user?.role === "USER" &&
			existingBooking.userId !== req.user.userId
		) {
			res.status(403).json({ error: "Not authorized to update this booking" });
			return;
		}

		if (req.user?.role === "MANAGER") {
			const managerLocation = await prisma.managerLocation.findUnique({
				where: {
					userId_locationId: {
						userId: req.user.userId,
						locationId: existingBooking.room.locationId,
					},
				},
			});

			if (!managerLocation) {
				res
					.status(403)
					.json({ error: "Not authorized to update this booking" });
				return;
			}
		}

		// If updating time, check availability
		if (data.startTime || data.endTime) {
			const startTime = data.startTime
				? new Date(data.startTime)
				: existingBooking.startTime;
			const endTime = data.endTime
				? new Date(data.endTime)
				: existingBooking.endTime;

			if (startTime >= endTime) {
				res.status(400).json({ error: "End time must be after start time" });
				return;
			}

			const available = await isRoomAvailable(
				existingBooking.roomId,
				startTime,
				endTime,
				id,
			);

			if (!available) {
				res
					.status(409)
					.json({ error: "Room is not available for the selected time slot" });
				return;
			}
		}

		// Update booking
		const booking = await prisma.booking.update({
			where: { id },
			data: {
				startTime: data.startTime ? new Date(data.startTime) : undefined,
				endTime: data.endTime ? new Date(data.endTime) : undefined,
				title: data.title,
				description: data.description,
				status: data.status,
			},
			include: {
				room: {
					include: {
						location: true,
					},
				},
				user: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true,
					},
				},
			},
		});

		res.json({
			message: "Booking updated successfully",
			booking,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			res
				.status(400)
				.json({ error: "Validation error", details: error.errors });
			return;
		}
		res.status(500).json({ error: "Failed to update booking" });
	}
};

export const deleteBooking = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;

		// Get existing booking
		const existingBooking = await prisma.booking.findUnique({
			where: { id },
			include: {
				room: true,
			},
		});

		if (!existingBooking) {
			res.status(404).json({ error: "Booking not found" });
			return;
		}

		// Check permissions
		if (
			req.user?.role === "USER" &&
			existingBooking.userId !== req.user.userId
		) {
			res.status(403).json({ error: "Not authorized to delete this booking" });
			return;
		}

		if (req.user?.role === "MANAGER") {
			const managerLocation = await prisma.managerLocation.findUnique({
				where: {
					userId_locationId: {
						userId: req.user.userId,
						locationId: existingBooking.room.locationId,
					},
				},
			});

			if (!managerLocation) {
				res
					.status(403)
					.json({ error: "Not authorized to delete this booking" });
				return;
			}
		}

		// Soft delete by setting status to CANCELLED
		await prisma.booking.update({
			where: { id },
			data: { status: "CANCELLED" },
		});

		res.json({ message: "Booking cancelled successfully" });
	} catch (_error) {
		res.status(500).json({ error: "Failed to cancel booking" });
	}
};
