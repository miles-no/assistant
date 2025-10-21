import { BaseCommandHandler } from "./base-handler";

/**
 * Handler for booking cancellation commands
 */
export class CancelCommandHandler extends BaseCommandHandler {
	async execute(params?: Record<string, unknown>): Promise<void> {
		const bookingId = params?.bookingId as string;

		if (!bookingId) {
			this.stopThinking();
			this.addOutput("[ERROR] Usage: cancel <booking-id>", "error");
			return;
		}

		try {
			await this.apiClient.cancelBooking(bookingId);

			const markdown = `[OK] Booking cancelled

**Booking ID:** ${bookingId}

**Status:** CANCELLED`;

			this.stopThinking();
			this.addMarkdownOutput(markdown, "system-output");
		} catch (error) {
			this.handleError(error, "Booking cancellation");
		}
	}
}
