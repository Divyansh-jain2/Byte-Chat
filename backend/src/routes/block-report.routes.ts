import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import * as blockReportController from '../controllers/block-report.controller.js';

/**
 * BLOCK & REPORT ROUTES
 * All routes for blocking users and reporting content
 */

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// ========== BLOCK ROUTES ==========
router.post('/block', blockReportController.blockUser);
router.post('/unblock', blockReportController.unblockUser);
router.get('/blocked-users', blockReportController.getBlockedUsers);
router.get('/check-blocked/:otherUserId', blockReportController.checkIfBlocked);

// ========== REPORT ROUTES ==========
router.post('/report/user', blockReportController.reportUser);
router.post('/report/group', blockReportController.reportGroup);
router.get('/reports/my', blockReportController.getMyReports);
router.get('/reports/all', blockReportController.getAllReports); // Admin endpoint - comprehensive review
router.delete('/report/:reportId', blockReportController.deleteReport);

export default router;
