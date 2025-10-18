import { Router } from 'express';
import {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomAvailability,
} from '../controllers/room.controller';
import { authenticate } from '../middleware/auth';
import { authorize, authorizeRoomManager } from '../middleware/authorize';

const router = Router();

// Public routes
router.get('/', getAllRooms);
router.get('/:id', getRoomById);
router.get('/:id/availability', getRoomAvailability);

// Admin or Manager routes
router.post('/', authenticate, authorize('ADMIN', 'MANAGER'), createRoom);
router.patch('/:id', authenticate, authorizeRoomManager, updateRoom);
router.delete('/:id', authenticate, authorizeRoomManager, deleteRoom);

export default router;
