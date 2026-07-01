import { Router } from 'express';
import { generateCaption } from '../controllers/aiController.js';

const router = Router();

router.post('/generate-caption', generateCaption);

export default router;
