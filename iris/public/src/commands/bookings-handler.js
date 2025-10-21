import { BaseCommandHandler } from './base-handler';
export class BookingsCommandHandler extends BaseCommandHandler {
    constructor(apiClient, currentUser, userTimezone) {
        super(apiClient, currentUser, userTimezone);
    }
    async execute() {
        try {
            const data = await this.apiClient.getBookings();
            const bookings = data.bookings;
            const activeBookings = Array.isArray(bookings)
                ? bookings.filter((b) => b.status !== 'CANCELLED')
                : [];
            if (activeBookings.length === 0) {
                this.addOutput('[WARNING] No active bookings found', 'system-output');
                return;
            }
            let markdown = '[OK] Booking data retrieved\n\n';
            markdown += '| ID | TITLE | START | END | STATUS |\n';
            markdown += '|---|---|---|---|---|\n';
            activeBookings.forEach((booking) => {
                const id = booking.id || '';
                const title = booking.title || 'Untitled';
                const start = this.formatDate(booking.startTime || '');
                const end = this.formatDate(booking.endTime || '');
                const status = booking.status || 'N/A';
                markdown += `| ${id} | ${title} | ${start} | ${end} | ${status} |\n`;
            });
            markdown += `\n**Total:** ${activeBookings.length} bookings`;
            this.addMarkdownOutput(markdown, 'system-output');
        }
        catch (error) {
            this.handleError(error, 'Booking retrieval');
        }
    }
}
