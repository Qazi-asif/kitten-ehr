import { Router } from 'express';
import {
  getSyndicationPreview,
  postProcessOutbox,
  postReconcile,
  postSyndicationRun,
} from '../controllers/syndicationController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/preview', requirePermission('kittens.view'), getSyndicationPreview);
router.post('/run', requirePermission('kittens.edit'), postSyndicationRun);
router.post('/outbox', requirePermission('kittens.edit'), postProcessOutbox);
router.post('/reconcile', requirePermission('kittens.edit'), postReconcile);

export default router;
