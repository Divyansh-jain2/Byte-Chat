import express from 'express';
import { testConnection } from '../controllers/auth.controller.supabase.js';

const router = express.Router();

// Test Supabase connection
router.get('/test-connection', testConnection);

export default router;
