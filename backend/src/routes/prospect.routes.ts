import { Router } from 'express';
import { ProspectController } from '../controllers/prospect.controller';

const router = Router();
console.log('🚀 [ROUTER] Prospect Routes Module Loaded');

// 1. Static Routes (Must be first!)
router.post('/market-insight', ProspectController.analyzeMarket);
router.post('/scan', ProspectController.scan);

// 2. Generic Collection Routes
router.post('/', ProspectController.create);
router.get('/', ProspectController.getAll);

// 3. Instance Routes (with :id)
router.patch('/:id/status', ProspectController.updateStatus);
router.post('/:id/convert', ProspectController.convertToCustomer);
router.post('/:id/broadcast', ProspectController.broadcast);
router.delete('/:id', ProspectController.delete);

export default router;
