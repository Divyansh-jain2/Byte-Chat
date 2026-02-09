import { Router } from 'express';
import { 
  createGroup,
  getPublicGroups,
  getMyGroups,
  getGroupDetails,
  joinGroup,
  addMemberToGroup,
  getGroupMembers,
  removeMemberFromGroup,
  leaveGroup,
  updateGroup,
  promoteMemberToAdmin,
  getGroupMessages,
  sendGroupMessage
} from '../controllers/group.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/error.util.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Create a new group
router.post('/', asyncHandler(createGroup));

// Get all public groups
router.get('/public', asyncHandler(getPublicGroups));

// Get user's groups
router.get('/my-groups', asyncHandler(getMyGroups));

// Get group details
router.get('/:groupId', asyncHandler(getGroupDetails));

// Update group details (for admins)
router.put('/:groupId', asyncHandler(updateGroup));

// Join a public group
router.post('/:groupId/join', asyncHandler(joinGroup));

// Leave a group
router.post('/:groupId/leave', asyncHandler(leaveGroup));

// Group messages
router.get('/:groupId/messages', asyncHandler(getGroupMessages));
router.post('/:groupId/messages', asyncHandler(sendGroupMessage));

// Get group members
router.get('/:groupId/members', asyncHandler(getGroupMembers));

// Add member to group (for private groups or admin invites)
router.post('/:groupId/members', asyncHandler(addMemberToGroup));

// Remove member from group (private groups only)
router.delete('/:groupId/members/:memberId', asyncHandler(removeMemberFromGroup));

// Promote member to admin (for owners)
router.post('/:groupId/members/:memberId/promote', asyncHandler(promoteMemberToAdmin));

export default router;
