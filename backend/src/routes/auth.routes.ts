import { Router } from 'express';
import {
  signup,
  verifyOTP,
  login,
  forgotPassword,
  resetPassword,
  logout
} from '../controllers/auth.controller.js';

const router = Router();

// Auth routes
router.post('/signup', signup);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
