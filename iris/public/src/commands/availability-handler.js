import { BaseCommandHandler } from './base-handler';
export class AvailabilityCommandHandler extends BaseCommandHandler {
    constructor(apiClient, currentUser, userTimezone) {
        super(apiClient, currentUser, userTimezone);
    }
    async execute(params) {
        const roomId = params?.roomId;
        const roomName = params?.roomName;
        const startTime = params?.startTime;
        const endTime = params?.endTime;
        if (!roomId && !roomName) {
            this.addOutput('[ERROR] Room ID or name required for availability check', 'error');
            return;
        }
        try {
            let actualRoomId = roomId;
            if (roomName && !roomId) {
                const foundRoomId = await this.findRoomIdByName(roomName);
                if (!foundRoomId) {
                    this.addOutput(`[ERROR] Room not found: ${roomName}`, 'error');
                    return;
                }
                actualRoomId = foundRoomId;
            }
            if (!actualRoomId) {
                this.addOutput('[ERROR] Unable to determine room ID', 'error');
                return;
            }
            const now = new Date();
            const defaultStart = startTime ? new Date(startTime) : now;
            const defaultEnd = endTime ? new Date(endTime) : new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const result = await this.apiClient.getRoomAvailability({
                roomId: actualRoomId,
                startDate: defaultStart.toISOString(),
                endDate: defaultEnd.toISOString(),
            });
            const availabilitySlots = this.analyzeAvailability(result.bookings, defaultStart, defaultEnd);
            this.displayAvailability(availabilitySlots, roomName || roomId || 'Unknown Room', defaultStart, defaultEnd);
        }
        catch (error) {
            this.handleError(error, 'Availability check');
        }
    }
    async findRoomIdByName(roomName) {
        try {
            const data = await this.apiClient.getRooms();
            const rooms = data.rooms;
            if (!Array.isArray(rooms))
                return null;
            const exactMatch = rooms.find(room => room.name?.toLowerCase() === roomName.toLowerCase());
            if (exactMatch?.id)
                return exactMatch.id;
            const fuzzyMatch = rooms.find(room => room.name?.toLowerCase().includes(roomName.toLowerCase()) ||
                roomName.toLowerCase().includes(room.name?.toLowerCase() || ''));
            return fuzzyMatch?.id || null;
        }
        catch (error) {
            console.error('Error finding room by name:', error);
            return null;
        }
    }
    analyzeAvailability(bookings, startTime, endTime) {
        const slots = [];
        const sortedBookings = bookings
            .filter(booking => booking.startTime && booking.endTime)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        let currentTime = new Date(startTime);
        for (const booking of sortedBookings) {
            const bookingStart = new Date(booking.startTime);
            const bookingEnd = new Date(booking.endTime);
            if (bookingEnd <= startTime)
                continue;
            if (bookingStart >= endTime)
                break;
            if (currentTime < bookingStart) {
                slots.push({
                    startTime: new Date(currentTime),
                    endTime: new Date(bookingStart),
                    available: true,
                });
            }
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
        if (currentTime < endTime) {
            slots.push({
                startTime: new Date(currentTime),
                endTime: new Date(endTime),
                available: true,
            });
        }
        return slots;
    }
    displayAvailability(slots, roomName, windowStart, windowEnd) {
        const startFormatted = this.formatDateLocalized(windowStart.toISOString());
        const endFormatted = this.formatDateLocalized(windowEnd.toISOString());
        let markdown = `[OK] Room availability checked\n\n`;
        markdown += `**Room:** ${roomName}\n`;
        markdown += `**Time Window:** ${startFormatted} - ${endFormatted}\n\n`;
        if (slots.length === 0) {
            markdown += 'Room is fully available for the selected time period.\n';
        }
        else {
            markdown += '| STATUS | TIME SLOT | DETAILS |\n';
            markdown += '|---|---|---|\n';
            slots.forEach(slot => {
                const status = slot.available ? '✅ Available' : '❌ Booked';
                const startTime = this.formatDateLocalized(slot.startTime.toISOString());
                const endTime = this.formatDateLocalized(slot.endTime.toISOString());
                const timeSlot = `${startTime} - ${endTime}`;
                let details = '';
                if (!slot.available && slot.conflictingBooking) {
                    const booking = slot.conflictingBooking;
                    details = `${booking.title || 'Untitled'} (${booking.id})`;
                }
                else {
                    const duration = Math.round((slot.endTime.getTime() - slot.startTime.getTime()) / (1000 * 60));
                    details = `${duration} minutes`;
                }
                markdown += `| ${status} | ${timeSlot} | ${details} |\n`;
            });
        }
        this.addMarkdownOutput(markdown, 'system-output');
    }
}
