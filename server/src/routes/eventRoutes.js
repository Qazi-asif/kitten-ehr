import { Router } from 'express';
import {
  createEvent,
  deleteEvent,
  getAllEvents,
  getEventById,
  linkKittenToEvent,
  unlinkKittenFromEvent,
  updateEvent,
} from '../controllers/eventController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requirePermission('events.view'), getAllEvents);
router.post('/', requirePermission('events.manage'), createEvent);
router.post('/:eventId/link-kitten', requirePermission('events.manage'), linkKittenToEvent);
router.delete('/:eventId/unlink-kitten/:kittenId', requirePermission('events.manage'), unlinkKittenFromEvent);
router.get('/:id', requirePermission('events.view'), getEventById);
router.put('/:id', requirePermission('events.manage'), updateEvent);
router.delete('/:id', requirePermission('events.manage'), deleteEvent);

export default router;
