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
};
