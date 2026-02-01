import { Router } from 'express';
import { anonymousController } from '../controllers/anonymous.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireVerification } from '../middleware/verification.middleware.js';

const router = Router();

// All routes require authentication and verification
router.use(authenticateToken);
router.use(requireVerification);

// Get all anonymous identities for current user
router.get('/my-identities', anonymousController.getMyAnonymousIdentities);

// Create anonymous identity
router.post('/create', anonymousController.createAnonymousIdentity);

// Get specific anonymous identity details
router.get('/:identityId', anonymousController.getAnonymousIdentity);

// Reveal identity (switch from anonymous to known)
router.put('/reveal/:identityId', anonymousController.revealIdentity);

export default router;
