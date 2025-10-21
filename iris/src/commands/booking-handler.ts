import type { Booking, BookingInput } from "../services/api-client";
import { BaseCommandHandler } from "./base-handler";

/**
 * Handler for booking creation commands
 */
export class BookingCommandHandler extends BaseCommandHandler {
	async execute(params: BookingInput): Promise<void> {
		try {
			// Validate input
			this.validateBookingInput(params);

			// Check availability first
			await this.checkAvailability(params);

			// Create booking
			const result = await this.apiClient.createBooking(params);

			if (result.booking) {
				this.displaySuccess(result.booking, params);
			} else {
				throw new Error("Booking creation failed - no booking returned");
			}
		} catch (error) {
			this.handleError(error, "Booking creation");
		}
	}

	private validateBookingInput(params: BookingInput): void {
		if (!params.roomId) {
			throw new Error("Room ID or name required");
		}

		const startTime = new Date(params.startTime);
		const endTime = new Date(params.endTime);

		if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
			throw new Error("Invalid date format");
		}

		if (endTime <= startTime) {
			throw new Error("End time must be after start time");
		}
	}

	private async checkAvailability(params: BookingInput): Promise<void> {
		const startDate = new Date(params.startTime);
		const endDate = new Date(params.endTime);

		// Get bookings for the room in the date range
		const result = await this.apiClient.getRoomAvailability({
			roomId: params.roomId,
			startDate: startDate.toISOString(),
			endDate: endDate.toISOString(),
		});

		// Check if any existing booking conflicts with the requested time
		const hasConflict = result.bookings.some((booking) => {
			if (!booking.startTime || !booking.endTime) return false;

			const bookingStart = new Date(booking.startTime);
			const bookingEnd = new Date(booking.endTime);

			// Check for overlap: booking starts before requested end AND booking ends after requested start
			return bookingStart < endDate && bookingEnd > startDate;
		});

		if (hasConflict) {
			throw new Error("Room is not available for the selected time slot");
		}
	}

	private displaySuccess(booking: Booking, params: BookingInput): void {
		const startTime = booking.startTime || params.startTime;
		const endTime = booking.endTime || params.endTime;

		const duration = Math.round(
			(new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000,
		);

		const localStart = new Date(startTime).toLocaleString("en-US", {
			timeZone: this.userTimezone,
			dateStyle: "short",
			timeStyle: "short",
		});

		const localEnd = new Date(endTime).toLocaleString("en-US", {
			timeZone: this.userTimezone,
			timeStyle: "short",
		});

		const markdown = `[OK] Booking confirmed

**Booking ID:** ${booking.id || "Unknown"}
**Room:** ${booking.roomId || params.roomId}
**Time:** ${localStart} - ${localEnd}
**Duration:** ${duration} minutes
**Status:** ${booking.status || "Unknown"}

Booking operation complete.`;

		this.addMarkdownOutput(markdown, "system-output");
	}
}
