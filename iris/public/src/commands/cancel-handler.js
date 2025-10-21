import { BaseCommandHandler } from './base-handler';
export class CancelCommandHandler extends BaseCommandHandler {
    constructor(apiClient, currentUser, userTimezone) {
        super(apiClient, currentUser, userTimezone);
    }
    async execute(params) {
        const bookingId = params?.bookingId;
        if (!bookingId) {
            this.addOutput('[ERROR] Usage: cancel <booking-id>', 'error');
            return;
        }
        try {
            await this.apiClient.cancelBooking(bookingId);
            const markdown = `[OK] Booking cancelled

**Booking ID:** ${bookingId}

**Status:** CANCELLED`;
            this.addMarkdownOutput(markdown, 'system-output');
        }
        catch (error) {
            this.handleError(error, 'Booking cancellation');
        }
    }
}
