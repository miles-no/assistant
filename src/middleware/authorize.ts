import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import prisma from '../utils/prisma';

export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

// Check if user is a manager of a specific location
export const authorizeLocationManager = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Admins can access all locations
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    // Check if user is a manager of this location
    if (req.user.role === 'MANAGER') {
      const locationId = req.params.id || req.params.locationId || req.body.locationId;

      if (!locationId) {
        res.status(400).json({ error: 'Location ID required' });
        return;
      }

      const managerLocation = await prisma.managerLocation.findUnique({
        where: {
          userId_locationId: {
            userId: req.user.userId,
            locationId: locationId,
          },
        },
      });

      if (!managerLocation) {
        res.status(403).json({ error: 'Not authorized to manage this location' });
        return;
      }

      next();
      return;
    }

    res.status(403).json({ error: 'Insufficient permissions' });
  } catch (error) {
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

// Check if user is a manager of the location that owns a specific room
export const authorizeRoomManager = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Admins can access all rooms
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    // Check if user is a manager of the room's location
    if (req.user.role === 'MANAGER') {
      const roomId = req.params.id || req.params.roomId || req.body.roomId;

      if (!roomId) {
        res.status(400).json({ error: 'Room ID required' });
        return;
      }

      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { locationId: true },
      });

      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      const managerLocation = await prisma.managerLocation.findUnique({
        where: {
          userId_locationId: {
            userId: req.user.userId,
            locationId: room.locationId,
          },
        },
      });

      if (!managerLocation) {
        res.status(403).json({ error: 'Not authorized to manage this room' });
        return;
      }

      next();
      return;
    }

    res.status(403).json({ error: 'Insufficient permissions' });
  } catch (error) {
    res.status(500).json({ error: 'Authorization check failed' });
  }
};
