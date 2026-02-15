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
  sendGroupMessage,
  createPoll,
  getGroupPolls,
  voteOnPoll,
  uploadGroupPicture,
  deleteGroupPicture,
  selectGroupPresetAvatar,
  uploadGroup,
  uploadGroupChatImage
} from '../controllers/group.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { uploadImage, handleMulterError } from '../middleware/upload.middleware.js';
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

// Upload/delete group picture (for admins)
router.post('/:groupId/upload-picture', uploadGroup.single('image'), asyncHandler(uploadGroupPicture));
router.post('/:groupId/select-avatar', asyncHandler(selectGroupPresetAvatar));
router.delete('/:groupId/delete-picture', asyncHandler(deleteGroupPicture));

// Join a public group
router.post('/:groupId/join', asyncHandler(joinGroup));

// Leave a group
router.post('/:groupId/leave', asyncHandler(leaveGroup));

// Group messages
router.get('/:groupId/messages', asyncHandler(getGroupMessages));
router.post('/:groupId/messages', asyncHandler(sendGroupMessage));

// Group chat image upload
router.post('/:groupId/upload-image', uploadImage.single('image'), asyncHandler(uploadGroupChatImage), handleMulterError);

// Get group members
router.get('/:groupId/members', asyncHandler(getGroupMembers));

// Add member to group (for private groups or admin invites)
router.post('/:groupId/members', asyncHandler(addMemberToGroup));

// Remove member from group (private groups only)
router.delete('/:groupId/members/:memberId', asyncHandler(removeMemberFromGroup));

// Promote member to admin (for owners)
router.post('/:groupId/members/:memberId/promote', asyncHandler(promoteMemberToAdmin));

// Polls
router.post('/:groupId/polls', asyncHandler(createPoll));
router.get('/:groupId/polls', asyncHandler(getGroupPolls));
router.post('/:groupId/polls/:pollId/vote', asyncHandler(voteOnPoll));

export default router;
