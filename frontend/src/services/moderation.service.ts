// Block and Report Service for Frontend
// Add this to: frontend/src/services/moderation.service.ts

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// ==================== BLOCK SERVICES ====================

export const blockUser = async (blockedUserId: string, reason?: string) => {
  const response = await fetch(`${API_BASE}/api/moderation/block`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ blockedUserId, reason }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to block user');
  }

  return response.json();
};

export const unblockUser = async (blockedUserId: string) => {
  const response = await fetch(`${API_BASE}/api/moderation/unblock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ blockedUserId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to unblock user');
  }

  return response.json();
};

export const getBlockedUsers = async () => {
  const response = await fetch(`${API_BASE}/api/moderation/blocked-users`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch blocked users');
  }

  return response.json();
};

export const checkIfBlocked = async (otherUserId: string) => {
  const response = await fetch(`${API_BASE}/api/moderation/check-blocked/${otherUserId}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to check block status');
  }

  return response.json();
};

// ==================== REPORT SERVICES ====================

export interface ReportUserData {
  reportedUserId: string;
  reportType: 'spam' | 'harassment' | 'inappropriate_content' | 'impersonating' | 'fake_profile' | 'other';
  description: string;
  evidenceUrls?: string[];
  messageId?: string;
}

export interface ReportGroupData {
  reportedGroupId: string;
  reportType: 'spam' | 'harassment' | 'inappropriate_content' | 'impersonating' | 'fake_profile' | 'other';
  description: string;
  evidenceUrls?: string[];
}

export const reportUser = async (data: ReportUserData) => {
  const response = await fetch(`${API_BASE}/api/moderation/report/user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit report');
  }

  return response.json();
};

export const reportGroup = async (data: ReportGroupData) => {
  // console.log('📤 SENDING GROUP REPORT:');
  // console.log('  - URL:', `${API_BASE}/api/moderation/report/group`);
  // console.log('  - Token:', token ? `${token.substring(0, 20)}...` : 'MISSING');
  // console.log('  - Data:', data);

  const response = await fetch(`${API_BASE}/api/moderation/report/group`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  // console.log('  - Response Status:', response.status, response.statusText);

  if (!response.ok) {
    const error = await response.json();
    console.log('[ERROR] Error:', error);
    throw new Error(error.message || 'Failed to submit report');
  }

  const result = await response.json();
  // console.log('  ✅ Success:', result);
  return result;
};

export const getMyReports = async () => {
  const response = await fetch(`${API_BASE}/api/moderation/reports/my`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch reports');
  }

  return response.json();
};

export const deleteReport = async (reportId: string) => {
  const response = await fetch(`${API_BASE}/api/moderation/report/${reportId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete report');
  }

  return response.json();
};

// ==================== ANONYMOUS CHAT SERVICES ====================

export const revealAnonymousIdentity = async (conversationId: string) => {
  const response = await fetch(`${API_BASE}/api/anonymous-chat/reveal/${conversationId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to reveal identity');
  }

  return response.json();
};
