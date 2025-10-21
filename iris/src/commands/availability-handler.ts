import type { Booking } from "../services/api-client";
import { BaseCommandHandler } from "./base-handler";

/**
 * Handler for room availability checking commands
 */
export class AvailabilityCommandHandler extends BaseCommandHandler {
	async execute(params?: Record<string, unknown>): Promise<void> {
		const roomId = params?.roomId as string;
		const roomName = params?.roomName as string;
		const startTime = params?.startTime as string;
		const endTime = params?.endTime as string;

		if (!roomId && !roomName) {
			this.stopThinking();
			this.addOutput(
				"[ERROR] Room ID or name required for availability check",
				"error",
			);
			return;
		}

		try {
			// If room name provided, we need to find the room ID first
			let actualRoomId = roomId;
			if (roomName && !roomId) {
				const foundRoomId = await this.findRoomIdByName(roomName);
				if (!foundRoomId) {
					this.stopThinking();
					this.addOutput(`[ERROR] Room not found: ${roomName}`, "error");
					return;
				}
				actualRoomId = foundRoomId;
			}

			if (!actualRoomId) {
				this.stopThinking();
				this.addOutput("[ERROR] Unable to determine room ID", "error");
				return;
			}

			// Set default time range if not provided (next 24 hours)
			const now = new Date();
			const defaultStart = startTime ? new Date(startTime) : now;
			const defaultEnd = endTime
				? new Date(endTime)
				: new Date(now.getTime() + 24 * 60 * 60 * 1000);

			// Get existing bookings for the room
			const result = await this.apiClient.getRoomAvailability({
				roomId: actualRoomId,
				startDate: defaultStart.toISOString(),
				endDate: defaultEnd.toISOString(),
			});

			// Analyze availability
			const availabilitySlots = this.analyzeAvailability(
				result.bookings,
				defaultStart,
				defaultEnd,
			);

			// Display results
			this.stopThinking();
			this.displayAvailability(
				availabilitySlots,
				roomName || roomId || "Unknown Room",
				defaultStart,
				defaultEnd,
			);
		} catch (error) {
			this.handleError(error, "Availability check");
		}
	}

	private async findRoomIdByName(roomName: string): Promise<string | null> {
		try {
			const data = await this.apiClient.getRooms();
			const rooms = data.rooms;

			if (!Array.isArray(rooms)) return null;

			// Simple exact match first
			const exactMatch = rooms.find(
				(room) => room.name?.toLowerCase() === roomName.toLowerCase(),
			);

			if (exactMatch?.id) return exactMatch.id;

			// Fuzzy match - find closest match
			const fuzzyMatch = rooms.find(
				(room) =>
					room.name?.toLowerCase().includes(roomName.toLowerCase()) ||
					roomName.toLowerCase().includes(room.name?.toLowerCase() || ""),
			);

			return fuzzyMatch?.id || null;
		} catch (error) {
			console.error("Error finding room by name:", error);
			return null;
		}
	}

	private analyzeAvailability(
		bookings: Booking[],
		startTime: Date,
		endTime: Date,
	): Array<{
		startTime: Date;
		endTime: Date;
		available: boolean;
		conflictingBooking?: Booking;
	}> {
		const slots: Array<{
			startTime: Date;
			endTime: Date;
			available: boolean;
			conflictingBooking?: Booking;
		}> = [];

		// Sort bookings by start time (filter ensures startTime and endTime exist)
		const sortedBookings = bookings
			.filter(
				(
					booking,
				): booking is typeof booking & { startTime: string; endTime: string } =>
					Boolean(booking.startTime && booking.endTime),
			)
			.sort(
				(a, b) =>
					new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
			);

		let currentTime = new Date(startTime);

		for (const booking of sortedBookings) {
			const bookingStart = new Date(booking.startTime);
			const bookingEnd = new Date(booking.endTime);

			// Skip bookings that end before our window
			if (bookingEnd <= startTime) continue;

			// Skip bookings that start after our window
			if (bookingStart >= endTime) break;

			// Add available slot before this booking if there's a gap
			if (currentTime < bookingStart) {
				slots.push({
					startTime: new Date(currentTime),
					endTime: new Date(bookingStart),
					available: true,
				});
			}

			// Add the booked slot
			const slotStart = bookingStart > startTime ? bookingStart : startTime;
			const slotEnd = bookingEnd < endTime ? bookingEnd : endTime;

			if (slotStart < slotEnd) {
				slots.push({
					startTime: new Date(slotStart),
					endTime: new Date(slotEnd),
					available: false,
					conflictingBooking: booking,
				});
			}

			currentTime = bookingEnd > currentTime ? bookingEnd : currentTime;
		}

		// Add final available slot if there's time left
		if (currentTime < endTime) {
			slots.push({
				startTime: new Date(currentTime),
				endTime: new Date(endTime),
				available: true,
			});
		}

		return slots;
	}

	private displayAvailability(
		slots: Array<{
			startTime: Date;
			endTime: Date;
			available: boolean;
			conflictingBooking?: Booking;
		}>,
		roomName: string,
		windowStart: Date,
		windowEnd: Date,
	): void {
		const startFormatted = this.formatDateLocalized(windowStart.toISOString());
		const endFormatted = this.formatDateLocalized(windowEnd.toISOString());

		let markdown = `[OK] Room availability checked\n\n`;
		markdown += `**Room:** ${roomName}\n`;
		markdown += `**Time Window:** ${startFormatted} - ${endFormatted}\n\n`;

		if (slots.length === 0) {
			markdown += "Room is fully available for the selected time period.\n";
		} else {
			markdown += "| STATUS | TIME SLOT | DETAILS |\n";
			markdown += "|---|---|---|\n";

			slots.forEach((slot) => {
				const status = slot.available ? "✅ Available" : "❌ Booked";
				const startTime = this.formatDateLocalized(
					slot.startTime.toISOString(),
				);
				const endTime = this.formatDateLocalized(slot.endTime.toISOString());
				const timeSlot = `${startTime} - ${endTime}`;

				let details = "";
				if (!slot.available && slot.conflictingBooking) {
					const booking = slot.conflictingBooking;
					details = `${booking.title || "Untitled"} (${booking.id})`;
				} else {
					const duration = Math.round(
						(slot.endTime.getTime() - slot.startTime.getTime()) / (1000 * 60),
					);
					details = `${duration} minutes`;
				}

				markdown += `| ${status} | ${timeSlot} | ${details} |\n`;
			});
		}

		this.addMarkdownOutput(markdown, "system-output");
	}
}
