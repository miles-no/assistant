import { BaseCommandHandler } from './base-handler';
import type { MilesApiClient, User } from '../services/api-client';

/**
 * Handler for booking cancellation commands
 */
export class CancelCommandHandler extends BaseCommandHandler {
  constructor(
    apiClient: MilesApiClient,
    currentUser: User,
    userTimezone: string
  ) {
    super(apiClient, currentUser, userTimezone);
  }

  async execute(params?: Record<string, unknown>): Promise<void> {
    const bookingId = params?.bookingId as string;

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
    } catch (error) {
      this.handleError(error, 'Booking cancellation');
    }
  }
}