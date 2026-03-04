import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api/anonymous-chat`,
  withCredentials: true,
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * ANONYMOUS CHAT SERVICE
 * Handles all anonymous chat operations
 * Separated from regular chat for better modularity
 */

// Create anonymous conversation
export const createAnonymousConversation = async (otherUserId: string) => {
  const response = await api.post('/conversation', { otherUserId });
  return response.data.data;
};

// Get all anonymous conversations
export const getAnonymousConversations = async () => {
  const response = await api.get('/conversations');
  return response.data.data;
};

// Get messages for anonymous conversation
export const getAnonymousMessages = async (conversationId: string, limit?: number, before?: string) => {
  const response = await api.get(`/conversation/${conversationId}/messages`, {
    params: { limit, before },
  });
  return response.data.data;
};

// Send anonymous message
export const sendAnonymousMessage = async (data: {
  conversationId: string;
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
  const response = await api.post('/send', data);
  return response.data.data;
};

// Reveal anonymous identity
export const revealAnonymousIdentity = async (conversationId: string) => {
  const response = await api.post(`/reveal/${conversationId}`);
  return response.data.data;
};

// Report anonymous user (uses main chat endpoint)
export const reportAnonymousUser = async (data: {
  reportedUserId: string;
  conversationId?: string;
  messageId?: string;
  reportType: 'spam' | 'harassment' | 'inappropriate_content' | 'impersonating' | 'fake_profile' | 'other';
  description: string;
  evidenceUrls?: string[];
}) => {
  // Use the main chat report endpoint (works for both regular and anonymous)
  const chatApi = axios.create({
    baseURL: `${API_URL}/api/chat`,
    withCredentials: true,
  });

  // Add auth token
  const token = localStorage.getItem('accessToken');
  if (token) {
    chatApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  const response = await chatApi.post('/report', data);
  return response.data;
};

// Upload chat image for anonymous chat
export const uploadAnonymousImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await api.post('/upload-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Update anonymous identity name (receiver can customize)
export const updateAnonymousName = async (identityId: string, customName: string) => {
  const response = await api.put(`/identity/${identityId}/custom-name`, { customName });
  return response.data;
};

const anonymousChatService = {
  createAnonymousConversation,
  getAnonymousConversations,
  getAnonymousMessages,
  sendAnonymousMessage,
  revealAnonymousIdentity,
  reportAnonymousUser,
  uploadAnonymousImage,
  updateAnonymousName
};

export default anonymousChatService;
