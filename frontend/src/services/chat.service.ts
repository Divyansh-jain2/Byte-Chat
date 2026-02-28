import axios from 'axios';
import type { ChatRequest, Conversation } from '@/types/chat.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api/chat`,
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

export const chatService = {
  // Send chat request (regular chat only)
  async sendChatRequest(receiverId: string) {
    // Redirect to conversation creation
    const response = await api.post('/conversation', {
      otherUserId: receiverId,
    });
    return response.data;
  },

  // Get pending chat requests
  async getChatRequests(): Promise<ChatRequest[]> {
    const response = await api.get('/requests');
    return response.data.data;
  },

  // Respond to chat request
  async respondToChatRequest(requestId: string, action: 'accept' | 'reject') {
    const response = await api.put(`/request/${requestId}`, { action });
    return response.data;
  },

  // Get all conversations
  async getConversations(): Promise<Conversation[]> {
    const response = await api.get('/conversations');
    return response.data.data;
  },

  // Get messages for a conversation
  async getMessages(conversationId: string, limit: number = 50, before?: string) {
    const response = await api.get(`/conversation/${conversationId}/messages`, {
      params: { limit, before },
    });
    return response.data.data;
  },

  // Send message
  async sendMessage(data: {
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
  }) {
    const response = await api.post('/send', data);
    return response.data;
  },

  // Update message status
  async updateMessageStatus(messageId: string, status: 'delivered' | 'read') {
    const response = await api.put(`/message/${messageId}/status`, { status });
    return response.data;
  },

  // Delete message
  async deleteMessage(messageId: string, deleteFor: 'me' | 'everyone' = 'me') {
    const response = await api.delete(`/message/${messageId}`, {
      data: { deleteFor },
    });
    return response.data;
  },

  // Block user in conversation
  async blockUser(conversationId: string) {
    const response = await api.post(`/block/${conversationId}`);
    return response.data;
  },

  // Unblock user in conversation
  async unblockUser(conversationId: string) {
    const response = await api.delete(`/unblock/${conversationId}`);
    return response.data;
  },

  // Report user (works for both regular and anonymous users)
  async reportUser(data: {
    reportedUserId: string;
    conversationId?: string;
    messageId?: string;
    reason?: string;          // Backwards compatibility
    reportType?: string;      // New format
    description?: string;
    evidenceUrls?: string[];
  }) {
    // Normalize data - ensure we send reportType
    const reportData = {
      ...data,
      reportType: data.reportType || data.reason,  // Use reportType if available, fallback to reason
      description: data.description || data.reason || 'No description provided'
    };
    
    const response = await api.post('/report', reportData);
    return response.data;
  },

  // Upload chat image
  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post('/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
