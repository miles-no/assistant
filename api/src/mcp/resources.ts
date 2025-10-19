import prisma from "../utils/prisma.js";
import { BookingStatus, FeedbackStatus } from "@prisma/client";
import ical from "ics";

// List all resources
export async function listResources() {
  return [
    {
      uri: "miles://locations",
      name: "All Locations",
      description: "List of all office locations in the Miles Booking system",
      mimeType: "application/json",
    },
    {
      uri: "miles://locations/{locationId}",
      name: "Location Details",
      description:
        "Detailed information about a specific location including rooms and managers",
      mimeType: "application/json",
    },
    {
      uri: "miles://rooms",
      name: "All Rooms",
      description: "List of all available rooms across all locations",
      mimeType: "application/json",
    },
    {
      uri: "miles://rooms/{roomId}",
      name: "Room Details",
      description:
        "Detailed information about a specific room including location and current availability",
      mimeType: "application/json",
    },
    {
      uri: "miles://rooms/{roomId}/availability",
      name: "Room Availability",
      description:
        "Check availability of a room for a specific date range (query params: startTime, endTime)",
      mimeType: "application/json",
    },
    {
      uri: "miles://bookings",
      name: "All Bookings",
      description:
        "List of bookings (query params: userId, locationId, roomId, status)",
      mimeType: "application/json",
    },
    {
      uri: "miles://bookings/{bookingId}",
      name: "Booking Details",
      description: "Detailed information about a specific booking",
      mimeType: "application/json",
    },
    {
      uri: "miles://calendar/location/{locationId}",
      name: "Location Calendar",
      description: "iCalendar feed for all bookings in a location",
      mimeType: "text/calendar",
    },
    {
      uri: "miles://calendar/room/{roomId}",
      name: "Room Calendar",
      description: "iCalendar feed for a specific room's bookings",
      mimeType: "text/calendar",
    },
    {
      uri: "miles://calendar/user/{userId}",
      name: "User Calendar",
      description: "iCalendar feed for a user's bookings",
      mimeType: "text/calendar",
    },
    {
      uri: "miles://feedback",
      name: "All Feedback",
      description:
        "List of room feedback (query params: roomId, locationId, status, userId). Public: all users can view all feedback.",
      mimeType: "application/json",
    },
    {
      uri: "miles://rooms/{roomId}/feedback",
      name: "Room Feedback",
      description:
        "All feedback for a specific room. Public: all users can view.",
      mimeType: "application/json",
    },
  ];
}

// Read a specific resource
export async function readResource(uri: string) {
  const url = new URL(uri);
  // Get URI without query params for matching
  const baseUri = `${url.protocol}//${url.hostname}${url.pathname}`;

  // Handle different resource types
  if (baseUri === "miles://locations") {
    return await getAllLocations();
  }

  if (baseUri.match(/^miles:\/\/locations\/[^/]+$/)) {
    const locationId = baseUri.split("/").pop()!;
    return await getLocationDetails(locationId);
  }

  if (baseUri === "miles://rooms") {
    return await getAllRooms();
  }

  if (baseUri.match(/^miles:\/\/rooms\/[^/]+$/)) {
    const roomId = baseUri.split("/").pop()!;
    return await getRoomDetails(roomId);
  }

  if (baseUri.match(/^miles:\/\/rooms\/[^/]+\/availability$/)) {
    const parts = baseUri.split("/");
    const roomId = parts[parts.length - 2];
    // Parse query parameters from URI if present
    const startTime = url.searchParams.get("startTime");
    const endTime = url.searchParams.get("endTime");
    return await getRoomAvailability(roomId, startTime, endTime);
  }

  if (baseUri === "miles://bookings") {
    const userId = url.searchParams.get("userId");
    const locationId = url.searchParams.get("locationId");
    const roomId = url.searchParams.get("roomId");
    const status = url.searchParams.get("status");
    return await getBookings(userId, locationId, roomId, status);
  }

  if (baseUri.match(/^miles:\/\/bookings\/[^/]+$/)) {
    const bookingId = baseUri.split("/").pop()!;
    return await getBookingDetails(bookingId);
  }

  if (baseUri.match(/^miles:\/\/calendar\/location\/[^/]+$/)) {
    const locationId = baseUri.split("/").pop()!;
    return await getLocationCalendar(locationId);
  }

  if (baseUri.match(/^miles:\/\/calendar\/room\/[^/]+$/)) {
    const roomId = baseUri.split("/").pop()!;
    return await getRoomCalendar(roomId);
  }

  if (baseUri.match(/^miles:\/\/calendar\/user\/[^/]+$/)) {
    const userId = baseUri.split("/").pop()!;
    return await getUserCalendar(userId);
  }

  if (baseUri === "miles://feedback") {
    const roomId = url.searchParams.get("roomId");
    const locationId = url.searchParams.get("locationId");
    const status = url.searchParams.get("status");
    const userId = url.searchParams.get("userId");
    return await getAllFeedback(roomId, locationId, status, userId);
  }

  if (baseUri.match(/^miles:\/\/rooms\/[^/]+\/feedback$/)) {
    const parts = baseUri.split("/");
    const roomId = parts[parts.length - 2];
    return await getRoomFeedback(roomId);
  }

  throw new Error(`Unknown resource URI: ${uri}`);
}

// Resource implementations
async function getAllLocations() {
  const locations = await prisma.location.findMany({
    include: {
      _count: {
        select: {
          rooms: true,
          managers: true,
        },
      },
    },
  });

  return {
    contents: [
      {
        uri: "miles://locations",
        mimeType: "application/json",
        text: JSON.stringify(
          {
            success: true,
            count: locations.length,
            locations: locations.map((loc) => ({
              id: loc.id,
              name: loc.name,
              address: loc.address,
              city: loc.city,
              country: loc.country,
              timezone: loc.timezone,
              roomCount: loc._count.rooms,
              managerCount: loc._count.managers,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}

async function getLocationDetails(locationId: string) {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    include: {
      rooms: {
        include: {
          _count: {
            select: {
              bookings: {
                where: {
                  status: { not: BookingStatus.CANCELLED },
                },
              },
            },
          },
        },
      },
      managers: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!location) {
    return {
      contents: [
        {
          uri: `miles://locations/${locationId}`,
          mimeType: "application/json",
          text: JSON.stringify({ error: "Location not found" }),
        },
      ],
    };
  }

  return {
    contents: [
      {
        uri: `miles://locations/${locationId}`,
        mimeType: "application/json",
        text: JSON.stringify(
          {
            success: true,
            location: {
              id: location.id,
              name: location.name,
              address: location.address,
              city: location.city,
              country: location.country,
              timezone: location.timezone,
              rooms: location.rooms.map((room) => ({
                id: room.id,
                name: room.name,
                capacity: room.capacity,
                amenities: room.amenities,
                description: room.description,
                isActive: room.isActive,
                activeBookingsCount: room._count.bookings,
              })),
              managers: location.managers.map((m) => m.user),
            },
          },
          null,
          2
        ),
      },
    ],
  };
}

async function getAllRooms() {
  const rooms = await prisma.room.findMany({
    include: {
      location: {
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
        },
      },
      _count: {
        select: {
          bookings: {
            where: {
              status: { not: BookingStatus.CANCELLED },
              endTime: { gte: new Date() },
            },
          },
        },
      },
    },
  });

  return {
    contents: [
      {
        uri: "miles://rooms",
        mimeType: "application/json",
        text: JSON.stringify(
          {
            success: true,
            count: rooms.length,
            rooms: rooms.map((room) => ({
              id: room.id,
              name: room.name,
              capacity: room.capacity,
              amenities: room.amenities,
              description: room.description,
              isActive: room.isActive,
              location: room.location,
              upcomingBookingsCount: room._count.bookings,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}

async function getRoomDetails(roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      location: true,
      bookings: {
        where: {
          status: { not: BookingStatus.CANCELLED },
          endTime: { gte: new Date() },
        },
        orderBy: {
          startTime: "asc",
        },
        take: 10,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  if (!room) {
    return {
      contents: [
        {
          uri: `miles://rooms/${roomId}`,
          mimeType: "application/json",
          text: JSON.stringify({ error: "Room not found" }),
        },
      ],
    };
  }

  return {
    contents: [
      {
        uri: `miles://rooms/${roomId}`,
        mimeType: "application/json",
        text: JSON.stringify(
          {
            success: true,
            room: {
              id: room.id,
              name: room.name,
              capacity: room.capacity,
              amenities: room.amenities,
              description: room.description,
              isActive: room.isActive,
              location: room.location,
              upcomingBookings: room.bookings,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}

async function getRoomAvailability(
  roomId: string,
  startTime: string | null,
  endTime: string | null
) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
  });

  if (!room) {
    return {
      contents: [
        {
          uri: `miles://rooms/${roomId}/availability`,
          mimeType: "application/json",
          text: JSON.stringify({ error: "Room not found" }),
        },
      ],
    };
  }

  if (!startTime || !endTime) {
    return {
      contents: [
        {
          uri: `miles://rooms/${roomId}/availability`,
          mimeType: "application/json",
          text: JSON.stringify({
            error: "startTime and endTime query parameters are required",
          }),
        },
      ],
    };
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  const conflicts = await prisma.booking.findMany({
    where: {
      roomId,
      status: { not: BookingStatus.CANCELLED },
      OR: [
        {
          AND: [{ startTime: { lte: start } }, { endTime: { gt: start } }],
        },
        {
          AND: [{ startTime: { lt: end } }, { endTime: { gte: end } }],
        },
        {
          AND: [{ startTime: { gte: start } }, { endTime: { lte: end } }],
        },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return {
    contents: [
      {
        uri: `miles://rooms/${roomId}/availability`,
        mimeType: "application/json",
        text: JSON.stringify(
          {
            success: true,
            room: {
              id: room.id,
              name: room.name,
            },
            timeRange: {
              startTime,
              endTime,
            },
            available: conflicts.length === 0,
            conflicts,
          },
          null,
          2
        ),
      },
    ],
  };
}

async function getBookings(
  userId: string | null,
  locationId: string | null,
  roomId: string | null,
  status: string | null
) {
  const where: any = {};

  if (userId) {
    where.userId = userId;
  }

  if (roomId) {
    where.roomId = roomId;
  } else if (locationId) {
    where.room = {
      locationId,
    };
  }

  if (status) {
    where.status = status as BookingStatus;
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      room: {
        include: {
          location: {
            select: {
              id: true,
              name: true,
              city: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      startTime: "desc",
    },
    take: 100,
  });

  return {
    contents: [
      {
        uri: "miles://bookings",
        mimeType: "application/json",
        text: JSON.stringify(
          {
            success: true,
            count: bookings.length,
            filters: {
              userId,
              locationId,
              roomId,
              status,
            },
            bookings,
          },
          null,
          2
        ),
      },
    ],
  };
}

async function getBookingDetails(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      room: {
        include: {
          location: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!booking) {
    return {
      contents: [
        {
          uri: `miles://bookings/${bookingId}`,
          mimeType: "application/json",
          text: JSON.stringify({ error: "Booking not found" }),
        },
      ],
    };
  }

  return {
    contents: [
      {
        uri: `miles://bookings/${bookingId}`,
        mimeType: "application/json",
        text: JSON.stringify(
          {
            success: true,
            booking,
          },
          null,
          2
        ),
      },
    ],
  };
}

async function getLocationCalendar(locationId: string) {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    include: {
      rooms: {
        include: {
          bookings: {
            where: {
              status: { not: BookingStatus.CANCELLED },
            },
            include: {
              user: true,
              room: true,
            },
          },
        },
      },
    },
  });

  if (!location) {
    return {
      contents: [
        {
          uri: `miles://calendar/location/${locationId}`,
          mimeType: "text/calendar",
          text: "ERROR: Location not found",
        },
      ],
    };
  }

  const events = location.rooms.flatMap((room) =>
    room.bookings.map((booking) => ({
      start: [
        booking.startTime.getFullYear(),
        booking.startTime.getMonth() + 1,
        booking.startTime.getDate(),
        booking.startTime.getHours(),
        booking.startTime.getMinutes(),
      ] as [number, number, number, number, number],
      end: [
        booking.endTime.getFullYear(),
        booking.endTime.getMonth() + 1,
        booking.endTime.getDate(),
        booking.endTime.getHours(),
        booking.endTime.getMinutes(),
      ] as [number, number, number, number, number],
      title: booking.title || `${room.name} Booking`,
      description: booking.description || "No description provided",
      location: `${room.name}, ${location.name}`,
      status: "CONFIRMED" as const,
      busyStatus: "BUSY" as const,
      uid: booking.id,
    }))
  );

  const { error, value } = ical.createEvents(events);

  if (error) {
    return {
      contents: [
        {
          uri: `miles://calendar/location/${locationId}`,
          mimeType: "text/calendar",
          text: `ERROR: Failed to generate calendar: ${error.message}`,
        },
      ],
    };
  }

  return {
    contents: [
      {
        uri: `miles://calendar/location/${locationId}`,
        mimeType: "text/calendar",
        text: value || "",
      },
    ],
  };
}

async function getRoomCalendar(roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      location: true,
      bookings: {
        where: {
          status: { not: BookingStatus.CANCELLED },
        },
        include: {
          user: true,
        },
      },
    },
  });

  if (!room) {
    return {
      contents: [
        {
          uri: `miles://calendar/room/${roomId}`,
          mimeType: "text/calendar",
          text: "ERROR: Room not found",
        },
      ],
    };
  }

  const events = room.bookings.map((booking) => ({
    start: [
      booking.startTime.getFullYear(),
      booking.startTime.getMonth() + 1,
      booking.startTime.getDate(),
      booking.startTime.getHours(),
      booking.startTime.getMinutes(),
    ] as [number, number, number, number, number],
    end: [
      booking.endTime.getFullYear(),
      booking.endTime.getMonth() + 1,
      booking.endTime.getDate(),
      booking.endTime.getHours(),
      booking.endTime.getMinutes(),
    ] as [number, number, number, number, number],
    title: booking.title || `${room.name} Booking`,
    description: booking.description || "No description provided",
    location: `${room.name}, ${room.location.name}`,
    status: "CONFIRMED" as const,
    busyStatus: "BUSY" as const,
    uid: booking.id,
  }));

  const { error, value } = ical.createEvents(events);

  if (error) {
    return {
      contents: [
        {
          uri: `miles://calendar/room/${roomId}`,
          mimeType: "text/calendar",
          text: `ERROR: Failed to generate calendar: ${error.message}`,
        },
      ],
    };
  }

  return {
    contents: [
      {
        uri: `miles://calendar/room/${roomId}`,
        mimeType: "text/calendar",
        text: value || "",
      },
    ],
  };
}

async function getUserCalendar(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      bookings: {
        where: {
          status: { not: BookingStatus.CANCELLED },
        },
        include: {
          room: {
            include: {
              location: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return {
      contents: [
        {
          uri: `miles://calendar/user/${userId}`,
          mimeType: "text/calendar",
          text: "ERROR: User not found",
        },
      ],
    };
  }

  const events = user.bookings.map((booking) => ({
    start: [
      booking.startTime.getFullYear(),
      booking.startTime.getMonth() + 1,
      booking.startTime.getDate(),
      booking.startTime.getHours(),
      booking.startTime.getMinutes(),
    ] as [number, number, number, number, number],
    end: [
      booking.endTime.getFullYear(),
      booking.endTime.getMonth() + 1,
      booking.endTime.getDate(),
      booking.endTime.getHours(),
      booking.endTime.getMinutes(),
    ] as [number, number, number, number, number],
    title: booking.title || `${booking.room.name} Booking`,
    description: booking.description || "No description provided",
    location: `${booking.room.name}, ${booking.room.location.name}`,
    status: "CONFIRMED" as const,
    busyStatus: "BUSY" as const,
    uid: booking.id,
  }));

  const { error, value } = ical.createEvents(events);

  if (error) {
    return {
      contents: [
        {
          uri: `miles://calendar/user/${userId}`,
          mimeType: "text/calendar",
          text: `ERROR: Failed to generate calendar: ${error.message}`,
        },
      ],
    };
  }

  return {
    contents: [
      {
        uri: `miles://calendar/user/${userId}`,
        mimeType: "text/calendar",
        text: value || "",
      },
    ],
  };
}

async function getAllFeedback(
  roomId: string | null,
  locationId: string | null,
  status: string | null,
  userId: string | null
) {
  const where: any = {};

  if (roomId) {
    where.roomId = roomId;
  } else if (locationId) {
    where.room = {
      locationId,
    };
  }

  if (status) {
    where.status = status as FeedbackStatus;
  }

  if (userId) {
    where.userId = userId;
  }

  const feedback = await prisma.roomFeedback.findMany({
    where,
    include: {
      room: {
        include: {
          location: {
            select: {
              id: true,
              name: true,
              city: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      resolver: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    contents: [
      {
        uri: "miles://feedback",
        mimeType: "application/json",
        text: JSON.stringify(
          {
            success: true,
            count: feedback.length,
            filters: {
              roomId,
              locationId,
              status,
              userId,
            },
            feedback: feedback.map((f) => ({
              id: f.id,
              message: f.message,
              status: f.status,
              createdAt: f.createdAt,
              updatedAt: f.updatedAt,
              room: {
                id: f.room.id,
                name: f.room.name,
                location: f.room.location,
              },
              submittedBy: {
                id: f.user.id,
                name: `${f.user.firstName} ${f.user.lastName}`,
                email: f.user.email,
              },
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}

async function getRoomFeedback(roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      location: true,
    },
  });

  if (!room) {
    return {
      contents: [
        {
          uri: `miles://rooms/${roomId}/feedback`,
          mimeType: "application/json",
          text: JSON.stringify({ error: "Room not found" }),
        },
      ],
    };
  }

  const feedback = await prisma.roomFeedback.findMany({
    where: { roomId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      resolver: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    contents: [
      {
        uri: `miles://rooms/${roomId}/feedback`,
        mimeType: "application/json",
        text: JSON.stringify(
          {
            success: true,
            room: {
              id: room.id,
              name: room.name,
              location: room.location,
            },
            feedbackCount: feedback.length,
            feedback: feedback.map((f) => ({
              id: f.id,
              message: f.message,
              status: f.status,
              createdAt: f.createdAt,
              updatedAt: f.updatedAt,
              submittedBy: {
                id: f.user.id,
                name: `${f.user.firstName} ${f.user.lastName}`,
                email: f.user.email,
              },
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}
