import { Router } from 'express';
import {signup, verifyOTP, login, forgotPassword, resetPassword, logout, 
  refreshTokenHandler, cancelAllSessionsHandler} from '../controllers/auth.controller.js';

const router = Router();

// Registration & Verification
router.post('/signup', signup);
router.post('/verify-otp', verifyOTP);

// Authentication
router.post('/login', login);
router.post('/logout', logout);

// Session Management & Security
router.post('/refresh', refreshTokenHandler);
router.post('/logout-all', cancelAllSessionsHandler);

// Password Management
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
