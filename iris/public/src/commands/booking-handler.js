import { BaseCommandHandler } from './base-handler';
export class BookingCommandHandler extends BaseCommandHandler {
    constructor(apiClient, currentUser, userTimezone) {
        super(apiClient, currentUser, userTimezone);
    }
    async execute(params) {
        try {
            this.validateBookingInput(params);
            await this.checkAvailability(params);
            const result = await this.apiClient.createBooking(params);
            if (result.booking) {
                this.displaySuccess(result.booking, params);
            }
            else {
                throw new Error('Booking creation failed - no booking returned');
            }
        }
        catch (error) {
            this.handleError(error, 'Booking creation');
        }
    }
    validateBookingInput(params) {
        if (!params.roomId) {
            throw new Error('Room ID or name required');
        }
        const startTime = new Date(params.startTime);
        const endTime = new Date(params.endTime);
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            throw new Error('Invalid date format');
        }
        if (endTime <= startTime) {
            throw new Error('End time must be after start time');
        }
    }
    async checkAvailability(params) {
        const startDate = new Date(params.startTime);
        const endDate = new Date(params.endTime);
        const result = await this.apiClient.getRoomAvailability({
            roomId: params.roomId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        });
        const hasConflict = result.bookings.some(booking => {
            if (!booking.startTime || !booking.endTime)
                return false;
            const bookingStart = new Date(booking.startTime);
            const bookingEnd = new Date(booking.endTime);
            return bookingStart < endDate && bookingEnd > startDate;
        });
        if (hasConflict) {
            throw new Error('Room is not available for the selected time slot');
        }
    }
    displaySuccess(booking, params) {
        const startTime = booking.startTime || params.startTime;
        const endTime = booking.endTime || params.endTime;
        const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000);
        const localStart = new Date(startTime).toLocaleString('en-US', {
            timeZone: this.userTimezone,
            dateStyle: 'short',
            timeStyle: 'short',
        });
        const localEnd = new Date(endTime).toLocaleString('en-US', {
            timeZone: this.userTimezone,
            timeStyle: 'short',
        });
        const markdown = `[OK] Booking confirmed

**Booking ID:** ${booking.id || 'Unknown'}
**Room:** ${booking.roomId || params.roomId}
**Time:** ${localStart} - ${localEnd}
**Duration:** ${duration} minutes
**Status:** ${booking.status || 'Unknown'}

Booking operation complete.`;
        this.addMarkdownOutput(markdown, 'system-output');
    }
}
