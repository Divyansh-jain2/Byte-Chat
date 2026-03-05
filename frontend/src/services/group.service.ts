const API_URL = 'http://localhost:3001/api/groups';

export interface CreateGroupData {
  group_name: string;
  group_desc?: string;
  group_dp_url?: string;
  is_public: boolean;
  max_members?: number;
}

export const groupService = {
  // Create a new group
  createGroup: async (groupData: CreateGroupData) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
      body: JSON.stringify(groupData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create group');
    }

    return response.json();
  },

  // Get all public groups
  getPublicGroups: async () => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/public`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch public groups');
    }

    return response.json();
  },

  // Get user's groups
  getMyGroups: async () => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/my-groups`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch your groups');
    }

    return response.json();
  },

  // Get group details
  getGroupDetails: async (groupId: string) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/${groupId}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch group details');
    }

    return response.json();
  },

  // Join a public group
  joinGroup: async (groupId: string, isAnonymous: boolean = false) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/${groupId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
      body: JSON.stringify({ is_anonymous: isAnonymous }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to join group');
    }

    return response.json();
  },

  // Get group members
  getGroupMembers: async (groupId: string) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/${groupId}/members`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch group members');
    }

    return response.json();
  },

  // Add member to group (for admins)
  addMemberToGroup: async (groupId: string, userId: string, isAnonymous: boolean = false) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/${groupId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
      body: JSON.stringify({ user_id: userId, is_anonymous: isAnonymous }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add member');
    }

    return response.json();
  },

  // Remove member from group (for admins)
  removeMemberFromGroup: async (groupId: string, memberId: string) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/${groupId}/members/${memberId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to remove member');
    }

    return response.json();
  },

  // Leave a group
  leaveGroup: async (groupId: string) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/${groupId}/leave`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to leave group');
    }

    return response.json();
  },

  // Update group details (for admins)
  updateGroup: async (groupId: string, groupData: Partial<CreateGroupData>) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/${groupId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
      body: JSON.stringify(groupData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update group');
    }

    return response.json();
  },

  // Promote member to admin (for owners)
  promoteMemberToAdmin: async (groupId: string, memberId: string) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/${groupId}/members/${memberId}/promote`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to promote member');
    }

    return response.json();
  },

  // Get group messages
  getGroupMessages: async (groupId: string, limit: number = 50, before?: string) => {
    const token = localStorage.getItem('accessToken');
    const url = new URL(`${API_URL}/${groupId}/messages`);
    url.searchParams.set('limit', String(limit));
    if (before) {
      url.searchParams.set('before', before);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch group messages');
    }

    return response.json();
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
  }) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/${groupId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send group message');
    }

    return response.json();
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
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/${groupId}/polls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
      body: JSON.stringify(pollData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create poll');
    }

    return response.json();
  },

  // Get group polls
  getGroupPolls: async (groupId: string, status: string = 'active') => {
    const token = localStorage.getItem('accessToken');
    const url = new URL(`${API_URL}/${groupId}/polls`);
    if (status && status !== 'all') {
      url.searchParams.set('status', status);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch polls');
    }

    return response.json();
  },

  // Vote on a poll
  voteOnPoll: async (groupId: string, pollId: string, voteValue?: boolean, optionId?: string) => {
    const token = localStorage.getItem('accessToken');
    // const body: any = {};
    const body: {vote_value?: boolean; option_id?: string} = {};
    if (typeof voteValue === 'boolean') body.vote_value = voteValue;
    if (optionId) body.option_id = optionId;
    const response = await fetch(`${API_URL}/${groupId}/polls/${pollId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to vote on poll');
    }

    return response.json();
  },
  // Get poll results (for General polls)
  getPollResults: async (groupId: string, pollId: string) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/${groupId}/polls/${pollId}/results`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch poll results');
    }
    return response.json();
  },

  // Cancel an active poll (creator or admin)
  cancelPoll: async (groupId: string, pollId: string, reason?: string) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/${groupId}/polls/${pollId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel poll');
    }

    return response.json();
  },

  // Manually execute a passed poll (admin only)
  executePoll: async (groupId: string, pollId: string) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/${groupId}/polls/${pollId}/execute`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to execute poll');
    }

    return response.json();
  },

  // Upload group chat image
  uploadImage: async (groupId: string, file: File) => {
    const token = localStorage.getItem('accessToken');
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_URL}/${groupId}/upload-image`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload image');
    }

    return response.json();
  },
};
