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
}) => {
  const response = await api.post('/send', data);
  return response.data.data;
};

// Reveal anonymous identity
export const revealAnonymousIdentity = async (conversationId: string) => {
  const response = await api.post(`/reveal/${conversationId}`);
  return response.data.data;
};

const anonymousChatService = {
  createAnonymousConversation,
  getAnonymousConversations,
  getAnonymousMessages,
  sendAnonymousMessage,
  revealAnonymousIdentity
};

export default anonymousChatService;
