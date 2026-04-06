import apiClient from '@/lib/apiClient';

export interface CreateGroupData {
  group_name: string;
  group_desc?: string;
  group_dp_url?: string;
  is_public: boolean;
  max_members?: number;
}

const GROUPS_PREFIX = '/api/groups';
export const groupService = {
  // Create a new group
  createGroup: async (groupData: CreateGroupData) => {
    const response = await apiClient.post(GROUPS_PREFIX, groupData);
    return response.data;
  },

  // Get all public groups
  getPublicGroups: async () => {
    const response = await apiClient.get(`${GROUPS_PREFIX}/public`);
    return response.data;
  },

  // Get user's groups
  getMyGroups: async () => {
    const response = await apiClient.get(`${GROUPS_PREFIX}/my-groups`);
    return response.data;
  },

  // Get group details
  getGroupDetails: async (groupId: string) => {
    const response = await apiClient.get(`${GROUPS_PREFIX}/${groupId}`);
    return response.data;
  },

  // Join a public group
  joinGroup: async (groupId: string, isAnonymous: boolean = false) => {
    const response = await apiClient.post(`${GROUPS_PREFIX}/${groupId}/join`, { is_anonymous: isAnonymous });
    return response.data;
  },

  // Get group members
  getGroupMembers: async (groupId: string) => {
    const response = await apiClient.get(`${GROUPS_PREFIX}/${groupId}/members`);
    return response.data;
  },

  // Add member to group (for admins)
  addMemberToGroup: async (groupId: string, userId: string, isAnonymous: boolean = false) => {
    const response = await apiClient.post(`${GROUPS_PREFIX}/${groupId}/members`, { user_id: userId, is_anonymous: isAnonymous });
    return response.data;
  },

  // Remove member from group (for admins)
  removeMemberFromGroup: async (groupId: string, memberId: string) => {
    const response = await apiClient.delete(`${GROUPS_PREFIX}/${groupId}/members/${memberId}`);
    return response.data;
  },

  // Leave a group
  leaveGroup: async (groupId: string) => {
    const response = await apiClient.post(`${GROUPS_PREFIX}/${groupId}/leave`);
    return response.data;
  },

  // Update group details (for admins)
  updateGroup: async (groupId: string, groupData: Partial<CreateGroupData>) => {
    const response = await apiClient.put(`${GROUPS_PREFIX}/${groupId}`, groupData);
    return response.data;
  },

  // Promote member to admin (for owners)
  promoteMemberToAdmin: async (groupId: string, memberId: string) => {
    const response = await apiClient.post(`${GROUPS_PREFIX}/${groupId}/members/${memberId}/promote`);
    return response.data;
  },

  // Get group messages
  getGroupMessages: async (groupId: string, limit: number = 50, before?: string, q?: string) => {
    const response = await apiClient.get(`${GROUPS_PREFIX}/${groupId}/messages`, {
      params: { limit, before, q }
    });
    return response.data;
  },

  // Send group message
  sendGroupMessage: async (groupId: string, data: {
    encryptedContent: string;
    contentIv: string;
    contentAuthTag: string;
    messageType?: string;
    mediaUrl?: string;
    mediaSize?: number;
    mediaMimeType?: string;
    thumbnailUrl?: string;
    keyId?: string;
    parentMessageId?: string;
  }) => {
    const response = await apiClient.post(`${GROUPS_PREFIX}/${groupId}/messages`, data);
    return response.data;
  },

  // Create a poll (admins only)
  createPoll: async (groupId: string, pollData: {
    poll_type: string;
    title: string;
    description?: string;
    target_user_id?: string;
    expires_in_hours?: number;
    options?: string[]; // For General polls
  }) => {
    const response = await apiClient.post(`${GROUPS_PREFIX}/${groupId}/polls`, pollData);
    return response.data;
  },

  // Get group polls
  getGroupPolls: async (groupId: string, status: string = 'active') => {
    const response = await apiClient.get(`${GROUPS_PREFIX}/${groupId}/polls`, {
      params: { status: status && status !== 'all' ? status : undefined }
    });
    return response.data;
  },

  // Vote on a poll
  voteOnPoll: async (groupId: string, pollId: string, voteValue?: boolean, optionId?: string) => {
    const body: { vote_value?: boolean; option_id?: string } = {};
    if (typeof voteValue === 'boolean') body.vote_value = voteValue;
    if (optionId) body.option_id = optionId;
    const response = await apiClient.post(`${GROUPS_PREFIX}/${groupId}/polls/${pollId}/vote`, body);
    return response.data;
  },

  // Get poll results (for General polls)
  getPollResults: async (groupId: string, pollId: string) => {
    const response = await apiClient.get(`${GROUPS_PREFIX}/${groupId}/polls/${pollId}/results`);
    return response.data;
  },

  // Cancel an active poll (creator or admin)
  cancelPoll: async (groupId: string, pollId: string, reason?: string) => {
    const response = await apiClient.delete(`${GROUPS_PREFIX}/${groupId}/polls/${pollId}`, {
      data: { reason }
    });
    return response.data;
  },

  // Manually execute a passed poll (admin only)
  executePoll: async (groupId: string, pollId: string) => {
    const response = await apiClient.post(`${GROUPS_PREFIX}/${groupId}/polls/${pollId}/execute`);
    return response.data;
  },

  // Upload group chat image
  uploadImage: async (groupId: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.post(`${GROUPS_PREFIX}/${groupId}/upload-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Get public keys of all participants in a group
  getGroupParticipantPublicKeys: async (groupId: string) => {
    const response = await apiClient.get(`${GROUPS_PREFIX}/${groupId}/participants/keys`);
    return response.data;
  },
};
