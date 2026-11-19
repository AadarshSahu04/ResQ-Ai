import express from 'express';
import { calculateRoute } from '../controllers/routeController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

router.post('/calculate', authenticateJWT, calculateRoute);

export default router;
