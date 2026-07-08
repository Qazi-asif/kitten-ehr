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

const router = Router();

router.get('/', getAllEvents);
router.post('/', createEvent);
router.post('/:eventId/link-kitten', linkKittenToEvent);
router.delete('/:eventId/unlink-kitten/:kittenId', unlinkKittenFromEvent);
router.get('/:id', getEventById);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

export default router;
