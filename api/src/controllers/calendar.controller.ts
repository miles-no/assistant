import { Request, Response } from 'express';
import { createEvents, EventAttributes } from 'ics';
import prisma from '../utils/prisma';

const convertBookingToICalEvent = (booking: any): EventAttributes => {
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);

  return {
    start: [
      start.getUTCFullYear(),
      start.getUTCMonth() + 1,
      start.getUTCDate(),
      start.getUTCHours(),
      start.getUTCMinutes(),
    ],
    end: [
      end.getUTCFullYear(),
      end.getUTCMonth() + 1,
      end.getUTCDate(),
      end.getUTCHours(),
      end.getUTCMinutes(),
    ],
    title: booking.title,
    description: booking.description || '',
    location: `${booking.room.name}, ${booking.room.location.name}`,
    status: booking.status === 'CONFIRMED' ? 'CONFIRMED' : 'TENTATIVE',
    uid: booking.id,
    organizer: {
      name: `${booking.user.firstName} ${booking.user.lastName}`,
      email: booking.user.email,
    },
  };
};

export const getOfficeCalendar = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { locationId } = req.params;

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }

    // Get all bookings for rooms in this location
    const bookings = await prisma.booking.findMany({
      where: {
        room: {
          locationId,
        },
        status: { not: 'CANCELLED' },
      },
      include: {
        room: {
          include: {
            location: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const events = bookings.map(convertBookingToICalEvent);

    const { error, value } = createEvents(events);

    if (error) {
      res.status(500).json({ error: 'Failed to generate calendar feed' });
      return;
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${location.name}-calendar.ics"`
    );
    res.send(value);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate calendar feed' });
  }
};

export const getRoomCalendar = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { roomId } = req.params;

    // Verify room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        location: true,
      },
    });

    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    // Get all bookings for this room
    const bookings = await prisma.booking.findMany({
      where: {
        roomId,
        status: { not: 'CANCELLED' },
      },
      include: {
        room: {
          include: {
            location: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const events = bookings.map(convertBookingToICalEvent);

    const { error, value } = createEvents(events);

    if (error) {
      res.status(500).json({ error: 'Failed to generate calendar feed' });
      return;
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${room.name}-calendar.ics"`
    );
    res.send(value);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate calendar feed' });
  }
};

export const getUserCalendar = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    // Check permissions - users can only access their own calendar
    // unless they are admin or manager
    if (
      req.user?.role === 'USER' &&
      req.user.userId !== userId
    ) {
      res.status(403).json({ error: 'Not authorized to access this calendar' });
      return;
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get all bookings for this user
    const bookings = await prisma.booking.findMany({
      where: {
        userId,
        status: { not: 'CANCELLED' },
      },
      include: {
        room: {
          include: {
            location: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const events = bookings.map(convertBookingToICalEvent);

    const { error, value } = createEvents(events);

    if (error) {
      res.status(500).json({ error: 'Failed to generate calendar feed' });
      return;
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${user.firstName}-${user.lastName}-calendar.ics"`
    );
    res.send(value);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate calendar feed' });
  }
};
