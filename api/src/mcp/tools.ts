import { z } from "zod";
import prisma from "../utils/prisma.js";
import { Role, BookingStatus, FeedbackStatus } from "@prisma/client";
import { sendFeedbackNotification, sendFeedbackStatusUpdate } from "../utils/email.js";

// Tool schemas
const createBookingSchema = z.object({
  userId: z.string(),
  roomId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  title: z.string(),
  description: z.string().optional(),
});

const updateBookingSchema = z.object({
  bookingId: z.string(),
  userId: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});

const cancelBookingSchema = z.object({
  bookingId: z.string(),
  userId: z.string(),
});

const createRoomSchema = z.object({
  userId: z.string(),
  name: z.string(),
  locationId: z.string(),
  capacity: z.number(),
  amenities: z.array(z.string()).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateRoomSchema = z.object({
  roomId: z.string(),
  userId: z.string(),
  name: z.string().optional(),
  capacity: z.number().optional(),
  amenities: z.array(z.string()).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

const findAvailableRoomsSchema = z.object({
  locationId: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  capacity: z.number().optional(),
  amenities: z.array(z.string()).optional(),
});

const suggestBookingTimeSchema = z.object({
  roomId: z.string(),
  duration: z.number(), // Duration in minutes
  preferredDate: z.string().optional(),
});

const createRoomFeedbackSchema = z.object({
  userId: z.string(),
  roomId: z.string(),
  message: z.string(),
});

const updateFeedbackStatusSchema = z.object({
  feedbackId: z.string(),
  userId: z.string(),
  status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]),
  comment: z.string().min(1, "Resolution comment is required"),
});

// Register all tools
export function registerTools() {
  return [
    {
      name: "create_booking",
      description:
        "Create a new room booking. Checks for conflicts and validates availability before creating the booking.",
      inputSchema: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "ID of the user making the booking",
          },
          roomId: {
            type: "string",
            description: "ID of the room to book",
          },
          startTime: {
            type: "string",
            description: "Start time of the booking (ISO 8601 format)",
          },
          endTime: {
            type: "string",
            description: "End time of the booking (ISO 8601 format)",
          },
          title: {
            type: "string",
            description: "Title of the booking",
          },
          description: {
            type: "string",
            description: "Description or notes about the booking (optional)",
          },
        },
        required: ["userId", "roomId", "startTime", "endTime", "title"],
      },
    },
    {
      name: "update_booking",
      description:
        "Update an existing booking. Only the booking owner, location manager, or admin can update.",
      inputSchema: {
        type: "object",
        properties: {
          bookingId: {
            type: "string",
            description: "ID of the booking to update",
          },
          userId: {
            type: "string",
            description: "ID of the user making the update",
          },
          startTime: {
            type: "string",
            description: "New start time (ISO 8601 format, optional)",
          },
          endTime: {
            type: "string",
            description: "New end time (ISO 8601 format, optional)",
          },
          title: {
            type: "string",
            description: "New title (optional)",
          },
          description: {
            type: "string",
            description: "New description (optional)",
          },
        },
        required: ["bookingId", "userId"],
      },
    },
    {
      name: "cancel_booking",
      description:
        "Cancel a booking by setting its status to CANCELLED. Only the booking owner, location manager, or admin can cancel.",
      inputSchema: {
        type: "object",
        properties: {
          bookingId: {
            type: "string",
            description: "ID of the booking to cancel",
          },
          userId: {
            type: "string",
            description: "ID of the user cancelling the booking",
          },
        },
        required: ["bookingId", "userId"],
      },
    },
    {
      name: "create_room",
      description:
        "Create a new room in a location. Requires ADMIN or MANAGER role.",
      inputSchema: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "ID of the user creating the room",
          },
          name: {
            type: "string",
            description: "Name of the room",
          },
          locationId: {
            type: "string",
            description: "ID of the location where the room will be created",
          },
          capacity: {
            type: "number",
            description: "Maximum capacity of the room",
          },
          amenities: {
            type: "array",
            items: { type: "string" },
            description: "List of amenities available in the room (optional)",
          },
          description: {
            type: "string",
            description: "Description of the room (optional)",
          },
          isActive: {
            type: "boolean",
            description: "Whether the room is active and bookable (optional)",
          },
        },
        required: ["userId", "name", "locationId", "capacity"],
      },
    },
    {
      name: "update_room",
      description:
        "Update an existing room. Requires ADMIN or room manager permissions.",
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "ID of the room to update",
          },
          userId: {
            type: "string",
            description: "ID of the user updating the room",
          },
          name: {
            type: "string",
            description: "New name for the room (optional)",
          },
          capacity: {
            type: "number",
            description: "New capacity for the room (optional)",
          },
          amenities: {
            type: "array",
            items: { type: "string" },
            description: "New list of amenities (optional)",
          },
          description: {
            type: "string",
            description: "New description (optional)",
          },
          isActive: {
            type: "boolean",
            description: "New active status (optional)",
          },
        },
        required: ["roomId", "userId"],
      },
    },
    {
      name: "find_available_rooms",
      description:
        "Find all available rooms for a given time period, optionally filtered by location, capacity, and amenities. This is a smart tool that checks for booking conflicts.",
      inputSchema: {
        type: "object",
        properties: {
          locationId: {
            type: "string",
            description: "Filter by location ID (optional)",
          },
          startTime: {
            type: "string",
            description: "Start time of the desired booking period (ISO 8601)",
          },
          endTime: {
            type: "string",
            description: "End time of the desired booking period (ISO 8601)",
          },
          capacity: {
            type: "number",
            description: "Minimum capacity required (optional)",
          },
          amenities: {
            type: "array",
            items: { type: "string" },
            description:
              "Required amenities - room must have all listed amenities (optional)",
          },
        },
        required: ["startTime", "endTime"],
      },
    },
    {
      name: "suggest_booking_time",
      description:
        "Smart tool that suggests the next available time slot for a room based on duration. Returns the earliest available slot.",
      inputSchema: {
        type: "object",
        properties: {
          roomId: {
            type: "string",
            description: "ID of the room to find available time for",
          },
          duration: {
            type: "number",
            description: "Duration of the booking in minutes",
          },
          preferredDate: {
            type: "string",
            description:
              "Preferred date to start searching from (ISO 8601, optional)",
          },
        },
        required: ["roomId", "duration"],
      },
    },
    {
      name: "create_room_feedback",
      description:
        "Submit feedback about a room (e.g., something broken, missing, needs fixing, or a suggestion). Any user can report feedback. Managers will be notified via email.",
      inputSchema: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "ID of the user submitting the feedback",
          },
          roomId: {
            type: "string",
            description: "ID of the room the feedback is about",
          },
          message: {
            type: "string",
            description: "Free-form feedback message describing the issue or suggestion",
          },
        },
        required: ["userId", "roomId", "message"],
      },
    },
    {
      name: "update_feedback_status",
      description:
        "Update the status of room feedback (OPEN, RESOLVED, DISMISSED). Anyone can update feedback status. A comment explaining the resolution is required.",
      inputSchema: {
        type: "object",
        properties: {
          feedbackId: {
            type: "string",
            description: "ID of the feedback to update",
          },
          userId: {
            type: "string",
            description: "ID of the user updating the status",
          },
          status: {
            type: "string",
            enum: ["OPEN", "RESOLVED", "DISMISSED"],
            description: "New status for the feedback",
          },
          comment: {
            type: "string",
            description:
              "Comment explaining the resolution or action taken (required)",
          },
        },
        required: ["feedbackId", "userId", "status", "comment"],
      },
    },
  ];
}

// Tool execution
export async function callTool(name: string, args: any) {
  switch (name) {
    case "create_booking":
      return await createBooking(args);
    case "update_booking":
      return await updateBooking(args);
    case "cancel_booking":
      return await cancelBooking(args);
    case "create_room":
      return await createRoom(args);
    case "update_room":
      return await updateRoom(args);
    case "find_available_rooms":
      return await findAvailableRooms(args);
    case "suggest_booking_time":
      return await suggestBookingTime(args);
    case "create_room_feedback":
      return await createRoomFeedback(args);
    case "update_feedback_status":
      return await updateFeedbackStatus(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Tool implementations
async function createBooking(args: any) {
  const data = createBookingSchema.parse(args);

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
  });
  if (!user) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "User not found" }),
        },
      ],
    };
  }

  // Verify room exists
  const room = await prisma.room.findUnique({
    where: { id: data.roomId },
  });
  if (!room) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "Room not found" }),
        },
      ],
    };
  }

  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  // Check if booking is in the past
  if (startTime < new Date()) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "Cannot book in the past" }),
        },
      ],
    };
  }

  // Check for conflicts
  const conflict = await prisma.booking.findFirst({
    where: {
      roomId: data.roomId,
      status: { not: BookingStatus.CANCELLED },
      OR: [
        {
          AND: [
            { startTime: { lte: startTime } },
            { endTime: { gt: startTime } },
          ],
        },
        {
          AND: [{ startTime: { lt: endTime } }, { endTime: { gte: endTime } }],
        },
        {
          AND: [{ startTime: { gte: startTime } }, { endTime: { lte: endTime } }],
        },
      ],
    },
  });

  if (conflict) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: "Room is not available for the requested time period",
            conflict: {
              id: conflict.id,
              startTime: conflict.startTime,
              endTime: conflict.endTime,
            },
          }),
        },
      ],
    };
  }

  // Create booking
  const booking = await prisma.booking.create({
    data: {
      userId: data.userId,
      roomId: data.roomId,
      startTime,
      endTime,
      title: data.title,
      description: data.description,
      status: BookingStatus.CONFIRMED,
    },
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

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: true,
          booking,
        }),
      },
    ],
  };
}

async function updateBooking(args: any) {
  const data = updateBookingSchema.parse(args);

  // Get the booking
  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    include: {
      room: {
        include: {
          location: {
            include: {
              managers: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "Booking not found" }),
        },
      ],
    };
  }

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
  });

  if (!user) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "User not found" }),
        },
      ],
    };
  }

  // Check permissions
  const isOwner = booking.userId === data.userId;
  const isAdmin = user.role === Role.ADMIN;
  const isManager =
    user.role === Role.MANAGER &&
    booking.room.location.managers.some((m) => m.userId === data.userId);

  if (!isOwner && !isAdmin && !isManager) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: "Insufficient permissions to update this booking",
          }),
        },
      ],
    };
  }

  // If times are changing, check for conflicts
  if (data.startTime || data.endTime) {
    const startTime = data.startTime ? new Date(data.startTime) : booking.startTime;
    const endTime = data.endTime ? new Date(data.endTime) : booking.endTime;

    const conflict = await prisma.booking.findFirst({
      where: {
        id: { not: data.bookingId },
        roomId: booking.roomId,
        status: { not: BookingStatus.CANCELLED },
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });

    if (conflict) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Room is not available for the requested time period",
              conflict: {
                id: conflict.id,
                startTime: conflict.startTime,
                endTime: conflict.endTime,
              },
            }),
          },
        ],
      };
    }
  }

  // Update booking
  const updateData: any = {};
  if (data.startTime) updateData.startTime = new Date(data.startTime);
  if (data.endTime) updateData.endTime = new Date(data.endTime);
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;

  const updatedBooking = await prisma.booking.update({
    where: { id: data.bookingId },
    data: updateData,
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

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: true,
          booking: updatedBooking,
        }),
      },
    ],
  };
}

async function cancelBooking(args: any) {
  const data = cancelBookingSchema.parse(args);

  // Get the booking
  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    include: {
      room: {
        include: {
          location: {
            include: {
              managers: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "Booking not found" }),
        },
      ],
    };
  }

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
  });

  if (!user) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "User not found" }),
        },
      ],
    };
  }

  // Check permissions
  const isOwner = booking.userId === data.userId;
  const isAdmin = user.role === Role.ADMIN;
  const isManager =
    user.role === Role.MANAGER &&
    booking.room.location.managers.some((m) => m.userId === data.userId);

  if (!isOwner && !isAdmin && !isManager) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: "Insufficient permissions to cancel this booking",
          }),
        },
      ],
    };
  }

  // Cancel booking
  const cancelledBooking = await prisma.booking.update({
    where: { id: data.bookingId },
    data: { status: BookingStatus.CANCELLED },
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

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: true,
          booking: cancelledBooking,
        }),
      },
    ],
  };
}

async function createRoom(args: any) {
  const data = createRoomSchema.parse(args);

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    include: {
      managedLocations: true,
    },
  });

  if (!user) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "User not found" }),
        },
      ],
    };
  }

  // Check permissions
  const isAdmin = user.role === Role.ADMIN;
  const isManager =
    user.role === Role.MANAGER &&
    user.managedLocations.some((m) => m.locationId === data.locationId);

  if (!isAdmin && !isManager) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: "Insufficient permissions to create room in this location",
          }),
        },
      ],
    };
  }

  // Verify location exists
  const location = await prisma.location.findUnique({
    where: { id: data.locationId },
  });

  if (!location) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "Location not found" }),
        },
      ],
    };
  }

  // Create room
  const room = await prisma.room.create({
    data: {
      name: data.name,
      locationId: data.locationId,
      capacity: data.capacity,
      amenities: data.amenities || [],
      description: data.description,
      isActive: data.isActive ?? true,
    },
    include: {
      location: true,
    },
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: true,
          room,
        }),
      },
    ],
  };
}

async function updateRoom(args: any) {
  const data = updateRoomSchema.parse(args);

  // Get room
  const room = await prisma.room.findUnique({
    where: { id: data.roomId },
    include: {
      location: {
        include: {
          managers: true,
        },
      },
    },
  });

  if (!room) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "Room not found" }),
        },
      ],
    };
  }

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
  });

  if (!user) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "User not found" }),
        },
      ],
    };
  }

  // Check permissions
  const isAdmin = user.role === Role.ADMIN;
  const isManager =
    user.role === Role.MANAGER &&
    room.location.managers.some((m) => m.userId === data.userId);

  if (!isAdmin && !isManager) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: "Insufficient permissions to update this room",
          }),
        },
      ],
    };
  }

  // Update room
  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.capacity) updateData.capacity = data.capacity;
  if (data.amenities) updateData.amenities = data.amenities;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updatedRoom = await prisma.room.update({
    where: { id: data.roomId },
    data: updateData,
    include: {
      location: true,
    },
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: true,
          room: updatedRoom,
        }),
      },
    ],
  };
}

async function findAvailableRooms(args: any) {
  const data = findAvailableRoomsSchema.parse(args);

  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  // Build room filter
  const roomFilter: any = {
    isActive: true,
  };

  if (data.locationId) {
    roomFilter.locationId = data.locationId;
  }

  if (data.capacity) {
    roomFilter.capacity = { gte: data.capacity };
  }

  if (data.amenities && data.amenities.length > 0) {
    roomFilter.amenities = { hasEvery: data.amenities };
  }

  // Get all rooms matching criteria
  const rooms = await prisma.room.findMany({
    where: roomFilter,
    include: {
      location: true,
      bookings: {
        where: {
          status: { not: BookingStatus.CANCELLED },
          OR: [
            {
              AND: [
                { startTime: { lte: startTime } },
                { endTime: { gt: startTime } },
              ],
            },
            {
              AND: [{ startTime: { lt: endTime } }, { endTime: { gte: endTime } }],
            },
            {
              AND: [
                { startTime: { gte: startTime } },
                { endTime: { lte: endTime } },
              ],
            },
          ],
        },
      },
    },
  });

  // Filter out rooms with conflicts
  const availableRooms = rooms.filter((room) => room.bookings.length === 0);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: true,
          count: availableRooms.length,
          searchCriteria: {
            startTime: data.startTime,
            endTime: data.endTime,
            locationId: data.locationId,
            capacity: data.capacity,
            amenities: data.amenities,
          },
          rooms: availableRooms.map((room) => ({
            id: room.id,
            name: room.name,
            capacity: room.capacity,
            amenities: room.amenities,
            description: room.description,
            location: {
              id: room.location.id,
              name: room.location.name,
              address: room.location.address,
              city: room.location.city,
            },
          })),
        }),
      },
    ],
  };
}

async function suggestBookingTime(args: any) {
  const data = suggestBookingTimeSchema.parse(args);

  // Verify room exists
  const room = await prisma.room.findUnique({
    where: { id: data.roomId },
    include: {
      location: true,
    },
  });

  if (!room) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "Room not found" }),
        },
      ],
    };
  }

  const startSearchDate = data.preferredDate
    ? new Date(data.preferredDate)
    : new Date();

  // Get all future bookings for this room
  const bookings = await prisma.booking.findMany({
    where: {
      roomId: data.roomId,
      status: { not: BookingStatus.CANCELLED },
      endTime: { gte: startSearchDate },
    },
    orderBy: {
      startTime: "asc",
    },
  });

  const durationMs = data.duration * 60 * 1000;

  // Try to find a slot starting now
  let suggestedStart = new Date(Math.max(startSearchDate.getTime(), Date.now()));

  // Round up to next 15-minute interval
  const minutes = suggestedStart.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 15) * 15;
  suggestedStart.setMinutes(roundedMinutes, 0, 0);

  // Check if this time works
  for (let attempt = 0; attempt < 100; attempt++) {
    const suggestedEnd = new Date(suggestedStart.getTime() + durationMs);

    // Check for conflicts
    const hasConflict = bookings.some((booking) => {
      return (
        (booking.startTime <= suggestedStart && booking.endTime > suggestedStart) ||
        (booking.startTime < suggestedEnd && booking.endTime >= suggestedEnd) ||
        (booking.startTime >= suggestedStart && booking.endTime <= suggestedEnd)
      );
    });

    if (!hasConflict) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              suggestion: {
                roomId: room.id,
                roomName: room.name,
                location: {
                  id: room.location.id,
                  name: room.location.name,
                },
                startTime: suggestedStart.toISOString(),
                endTime: suggestedEnd.toISOString(),
                duration: data.duration,
              },
            }),
          },
        ],
      };
    }

    // Try next 15-minute slot after the conflicting booking
    const conflictingBooking = bookings.find((booking) => {
      return (
        (booking.startTime <= suggestedStart && booking.endTime > suggestedStart) ||
        (booking.startTime < suggestedEnd && booking.endTime >= suggestedEnd) ||
        (booking.startTime >= suggestedStart && booking.endTime <= suggestedEnd)
      );
    });

    if (conflictingBooking) {
      suggestedStart = new Date(conflictingBooking.endTime);
      // Round up to next 15-minute interval
      const mins = suggestedStart.getMinutes();
      const rounded = Math.ceil(mins / 15) * 15;
      suggestedStart.setMinutes(rounded, 0, 0);
    } else {
      // Move forward by 15 minutes
      suggestedStart = new Date(suggestedStart.getTime() + 15 * 60 * 1000);
    }
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          error:
            "Could not find an available time slot within the next 100 time windows",
        }),
      },
    ],
  };
}

async function createRoomFeedback(args: any) {
  const data = createRoomFeedbackSchema.parse(args);

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
  });
  if (!user) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "User not found" }),
        },
      ],
    };
  }

  // Verify room exists and get location with managers
  const room = await prisma.room.findUnique({
    where: { id: data.roomId },
    include: {
      location: {
        include: {
          managers: {
            include: {
              user: {
                select: {
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!room) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "Room not found" }),
        },
      ],
    };
  }

  // Create feedback
  const feedback = await prisma.roomFeedback.create({
    data: {
      userId: data.userId,
      roomId: data.roomId,
      message: data.message,
      status: FeedbackStatus.OPEN,
    },
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

  // Send email notifications to location managers (async, don't block response)
  const managers = room.location.managers.map((m) => m.user);
  if (managers.length > 0) {
    // Fire and forget - don't await
    sendFeedbackNotification(feedback, managers).catch((err) => {
      console.error("Failed to send feedback notification:", err);
    });
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: true,
          feedback: {
            id: feedback.id,
            roomId: feedback.roomId,
            roomName: feedback.room.name,
            location: feedback.room.location.name,
            message: feedback.message,
            status: feedback.status,
            submittedBy: `${feedback.user.firstName} ${feedback.user.lastName}`,
            submittedAt: feedback.createdAt,
            managersNotified: managers.length,
          },
        }),
      },
    ],
  };
}

async function updateFeedbackStatus(args: any) {
  const data = updateFeedbackStatusSchema.parse(args);

  // Get feedback with all relations
  const feedback = await prisma.roomFeedback.findUnique({
    where: { id: data.feedbackId },
    include: {
      room: {
        include: {
          location: {
            include: {
              managers: true,
            },
          },
        },
      },
      user: true,
    },
  });

  if (!feedback) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "Feedback not found" }),
        },
      ],
    };
  }

  // Get user making the update
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
  });

  if (!user) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: "User not found" }),
        },
      ],
    };
  }

  // Store old status for notification
  const oldStatus = feedback.status;

  // Update feedback status with resolution info
  const updatedFeedback = await prisma.roomFeedback.update({
    where: { id: data.feedbackId },
    data: {
      status: data.status as FeedbackStatus,
      resolvedBy: data.userId,
      resolutionComment: data.comment,
    },
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
      resolver: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Send status update notification to original reporter (async, don't block)
  sendFeedbackStatusUpdate(
    updatedFeedback,
    feedback.user,
    user,
    oldStatus,
    data.status
  ).catch((err) => {
    console.error("Failed to send status update notification:", err);
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: true,
          feedback: {
            id: updatedFeedback.id,
            roomId: updatedFeedback.roomId,
            roomName: updatedFeedback.room.name,
            location: updatedFeedback.room.location.name,
            message: updatedFeedback.message,
            oldStatus,
            newStatus: updatedFeedback.status,
            resolutionComment: updatedFeedback.resolutionComment,
            resolvedBy: updatedFeedback.resolver
              ? `${updatedFeedback.resolver.firstName} ${updatedFeedback.resolver.lastName}`
              : null,
            updatedAt: updatedFeedback.updatedAt,
          },
        }),
      },
    ],
  };
}
