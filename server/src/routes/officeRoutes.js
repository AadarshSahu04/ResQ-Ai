import express from 'express';
import {
  getOffices,
  getActiveOffice,
  setActiveOffice,
  updateOffice,
  resetSquadsToOffice,
} from '../controllers/officeController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { authorizeRoles, ROLES } from '../middleware/rbac.js';

const router = express.Router();

// Public / Authenticated read endpoints
router.get('/', authenticateJWT, getOffices);
router.get('/active', authenticateJWT, getActiveOffice);

// Admin-only management endpoints
router.post('/set-active', authenticateJWT, authorizeRoles(ROLES.ADMIN), setActiveOffice);
router.patch('/:id', authenticateJWT, authorizeRoles(ROLES.ADMIN), updateOffice);
router.post('/reset-squads', authenticateJWT, authorizeRoles(ROLES.ADMIN), resetSquadsToOffice);

export default router;
