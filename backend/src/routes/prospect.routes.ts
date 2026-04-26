import { Router } from 'express';
import { ProspectController } from '../controllers/prospect.controller';

const router = Router();

// Prospecting Management Routes
router.post('/', ProspectController.create);
router.get('/', ProspectController.getAll);
router.patch('/:id/status', ProspectController.updateStatus);
router.post('/scan', ProspectController.scan);
router.post('/:id/convert', ProspectController.convertToCustomer);
router.post('/:id/broadcast', ProspectController.broadcast);
router.post('/analyze', ProspectController.analyzeMarket);
router.delete('/:id', ProspectController.delete);

export default router;
