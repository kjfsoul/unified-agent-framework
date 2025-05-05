import { Router } from 'express';
import agentRoutes from './agent';
import brandRoutes from './brands';

const router = Router();

// Agent routes
router.use('/agent', agentRoutes);

// Brand routes
router.use('/brands', brandRoutes);

export default router;