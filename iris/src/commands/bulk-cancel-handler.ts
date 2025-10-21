import { BaseCommandHandler } from './base-handler';
import type { MilesApiClient, User, Booking } from '../services/api-client';

/**
 * Handler for bulk booking cancellation commands
 */
export class BulkCancelCommandHandler extends BaseCommandHandler {
  constructor(
    apiClient: MilesApiClient,
    currentUser: User,
    userTimezone: string
  ) {
    super(apiClient, currentUser, userTimezone);
  }

  async execute(params?: Record<string, unknown>): Promise<void> {
    const filter = params?.filter as string;

    if (!filter || !['all', 'today', 'tomorrow', 'week'].includes(filter)) {
      this.addOutput('[ERROR] Usage: bulk-cancel <filter> where filter is: all, today, tomorrow, week', 'error');
      return;
    }

    try {
      // Get bookings to cancel based on filter
      const bookingsToCancel = await this.getBookingsToCancel(filter);

      if (bookingsToCancel.length === 0) {
        this.addOutput(`[WARNING] No bookings found for filter: ${filter}`, 'system-output');
        return;
      }

      // Cancel each booking
      const cancelledBookings: Booking[] = [];
      const failedBookings: { id: string; error: string }[] = [];

      for (const booking of bookingsToCancel) {
        try {
          if (booking.id) {
            await this.apiClient.cancelBooking(booking.id);
            cancelledBookings.push(booking);
          }
        } catch (error) {
          failedBookings.push({
            id: booking.id || 'unknown',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Display results
      this.displayBulkCancelResults(cancelledBookings, failedBookings, filter);

    } catch (error) {
      this.handleError(error, 'Bulk booking cancellation');
    }
  }

  private async getBookingsToCancel(filter: string): Promise<Booking[]> {
    const data = await this.apiClient.getBookings();
    const bookings = data.bookings;

    if (!Array.isArray(bookings)) return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return bookings.filter(booking => {
      if (booking.status === 'CANCELLED') return false;

      const bookingDate = booking.startTime ? new Date(booking.startTime) : null;
      if (!bookingDate) return false;

      switch (filter) {
        case 'all':
          return true;
        case 'today':
          return bookingDate >= today && bookingDate < tomorrow;
        case 'tomorrow':
          return bookingDate >= tomorrow && bookingDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
        case 'week':
          return bookingDate >= today && bookingDate < nextWeek;
        default:
          return false;
      }
    });
  }

  private displayBulkCancelResults(
    cancelled: Booking[],
    failed: { id: string; error: string }[],
    filter: string
  ): void {
    let markdown = `[OK] Bulk cancellation completed for filter: ${filter}\n\n`;

    if (cancelled.length > 0) {
      markdown += `**Successfully cancelled:** ${cancelled.length} bookings\n\n`;
      markdown += '| ID | TITLE | START TIME |\n';
      markdown += '|---|---|---|\n';

      cancelled.forEach(booking => {
        const id = booking.id || '';
        const title = booking.title || 'Untitled';
        const startTime = this.formatDate(booking.startTime || '');
        markdown += `| ${id} | ${title} | ${startTime} |\n`;
      });

      if (failed.length > 0) {
        markdown += `\n**Failed to cancel:** ${failed.length} bookings\n\n`;
        failed.forEach(failure => {
          markdown += `- ${failure.id}: ${failure.error}\n`;
        });
      }
    } else {
      markdown += 'No bookings were cancelled.\n';
    }

    this.addMarkdownOutput(markdown, 'system-output');
  }
}