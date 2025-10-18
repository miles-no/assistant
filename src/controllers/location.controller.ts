import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';

const createLocationSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  timezone: z.string().default('UTC'),
  description: z.string().optional(),
});

const updateLocationSchema = createLocationSchema.partial();

export const getAllLocations = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const locations = await prisma.location.findMany({
      include: {
        _count: {
          select: { rooms: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ locations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
};

export const getLocationById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        rooms: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
        managers: {
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

    if (!location) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }

    res.json({ location });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch location' });
  }
};

export const createLocation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = createLocationSchema.parse(req.body);

    const location = await prisma.location.create({
      data,
    });

    res.status(201).json({
      message: 'Location created successfully',
      location,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create location' });
  }
};

export const updateLocation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const data = updateLocationSchema.parse(req.body);

    const location = await prisma.location.update({
      where: { id },
      data,
    });

    res.json({
      message: 'Location updated successfully',
      location,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to update location' });
  }
};

export const deleteLocation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.location.delete({
      where: { id },
    });

    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete location' });
  }
};

export const assignManager = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId } = z.object({ userId: z.string() }).parse(req.body);

    // Verify user exists and is a manager
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      res.status(400).json({ error: 'User must have MANAGER or ADMIN role' });
      return;
    }

    // Create manager assignment
    const managerLocation = await prisma.managerLocation.create({
      data: {
        userId,
        locationId: id,
      },
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
    });

    res.status(201).json({
      message: 'Manager assigned successfully',
      managerLocation,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to assign manager' });
  }
};

export const removeManager = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id, userId } = req.params;

    await prisma.managerLocation.delete({
      where: {
        userId_locationId: {
          userId,
          locationId: id,
        },
      },
    });

    res.json({ message: 'Manager removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove manager' });
  }
};
