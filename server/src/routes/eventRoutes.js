import { Router } from 'express';
import {
  createEvent,
  deleteEvent,
  getAllEvents,
  getEventById,
  linkKittenToEvent,
  unlinkKittenFromEvent,
  updateEvent,
  uploadEventImage,
} from '../controllers/eventController.js';
import { requirePermission } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.get('/', requirePermission('events.view'), getAllEvents);
router.post('/', requirePermission('events.manage'), createEvent);
router.post('/:eventId/link-kitten', requirePermission('events.manage'), linkKittenToEvent);
router.delete('/:eventId/unlink-kitten/:kittenId', requirePermission('events.manage'), unlinkKittenFromEvent);
router.get('/:id', requirePermission('events.view'), getEventById);
router.put('/:id', requirePermission('events.manage'), updateEvent);
router.patch('/:id/image', requirePermission('events.manage'), upload.single('image'), uploadEventImage);
router.delete('/:id', requirePermission('events.manage'), deleteEvent);

export default router;
