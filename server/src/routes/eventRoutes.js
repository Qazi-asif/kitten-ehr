import { Router } from 'express';
import {
  createEvent,
  deleteEvent,
  getAllEvents,
  getEventById,
  updateEvent,
} from '../controllers/eventController.js';

const router = Router();

router.get('/', getAllEvents);
router.get('/:id', getEventById);
router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

export default router;
