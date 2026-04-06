import apiClient from '@/lib/apiClient';
import type { ChatRequest, Conversation, Message } from '@/types/chat.types';
import { clearInFlightGetRequestDedupe, dedupedGet } from './request-dedupe.service';

const api = apiClient;
const CHAT_PREFIX = '/api/chat';
const CHAT_GET_DEDUPE_NAMESPACE = 'chat|';

export const chatService = {
  async sendChatRequest(receiverId: string) {
    const response = await api.post(`${CHAT_PREFIX}/conversation`, {
      otherUserId: receiverId,
    });
    clearInFlightGetRequestDedupe(CHAT_GET_DEDUPE_NAMESPACE);
    return response.data;
  },

  // Get pending chat requests
  async getChatRequests(): Promise<ChatRequest[]> {
    const response = await dedupedGet<{
      data: ChatRequest[];
    }>(api, `${CHAT_PREFIX}/requests`, undefined, { namespace: CHAT_GET_DEDUPE_NAMESPACE });
    return response.data.data;
  },

  // Respond to chat request
  async respondToChatRequest(requestId: string, action: 'accept' | 'reject') {
    const response = await api.put(`${CHAT_PREFIX}/request/${requestId}`, { action });
    clearInFlightGetRequestDedupe(CHAT_GET_DEDUPE_NAMESPACE);
    return response.data;
  },

  // Get all conversations
  async getConversations(): Promise<Conversation[]> {
    const response = await dedupedGet<{
      data: Conversation[];
    }>(api, `${CHAT_PREFIX}/conversations`, undefined, { namespace: CHAT_GET_DEDUPE_NAMESPACE });
    return response.data.data;
  },

  // Get messages for a conversation
  async getMessages( conversationId: string, limit: number = 50,
    before?: string, q?: string, prefetchNext: boolean = true, ): Promise<Message[]> {
    const response = await dedupedGet<{
      data: Message[];
    }>(api, `${CHAT_PREFIX}/conversation/${conversationId}/messages`, {
      params: { limit, before, q, prefetchNext },
    }, { namespace: CHAT_GET_DEDUPE_NAMESPACE });
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
    parentMessageId?: string;
  }) {
    const response = await api.post(`${CHAT_PREFIX}/send`, data);
    clearInFlightGetRequestDedupe(CHAT_GET_DEDUPE_NAMESPACE);
    return response.data;
  },

  // Update message status
  async updateMessageStatus(messageId: string, status: 'delivered' | 'read') {
    const response = await api.put(`${CHAT_PREFIX}/message/${messageId}/status`, { status });
    clearInFlightGetRequestDedupe(CHAT_GET_DEDUPE_NAMESPACE);
    return response.data;
  },

  // Delete message
  async deleteMessage(messageId: string, deleteFor: 'me' | 'everyone' = 'me') {
    const response = await api.delete(`${CHAT_PREFIX}/message/${messageId}`, {
      data: { deleteFor },
    });
    clearInFlightGetRequestDedupe(CHAT_GET_DEDUPE_NAMESPACE);
    return response.data;
  },

  // Block user in conversation
  async blockUser(conversationId: string) {
    const response = await api.post(`${CHAT_PREFIX}/block/${conversationId}`);
    clearInFlightGetRequestDedupe(CHAT_GET_DEDUPE_NAMESPACE);
    return response.data;
  },

  // Unblock user in conversation
  async unblockUser(conversationId: string) {
    const response = await api.delete(`${CHAT_PREFIX}/unblock/${conversationId}`);
    clearInFlightGetRequestDedupe(CHAT_GET_DEDUPE_NAMESPACE);
    return response.data;
  },

  // Report user (works for both regular and anonymous users)
  async reportUser(data: {
    reportedUserId: string;
    conversationId?: string;
    messageId?: string;
    reason?: string;
    reportType?: string;
    description?: string;
    evidenceUrls?: string[];
  }) {
    // Normalize data - ensure we send reportType
    const reportData = {
      ...data,
      reportType: data.reportType || data.reason,  // Use reportType if available, fallback to reason
      description: data.description || data.reason || 'No description provided'
    };

    const response = await api.post(`${CHAT_PREFIX}/report`, reportData);
    clearInFlightGetRequestDedupe(CHAT_GET_DEDUPE_NAMESPACE);
    return response.data;
  },

  // Upload chat image
  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post(`${CHAT_PREFIX}/upload-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get participant public keys for E2EE
  async getParticipantPublicKeys(conversationId: string) {
    const response = await dedupedGet<{
      data: {
        participants: Array<{
          user_id: string;
          public_key: string;
          name: string;
        }>;
        isAnonymous?: boolean;
      };
    }>(api, `${CHAT_PREFIX}/${conversationId}/participants/keys`, undefined, { namespace: CHAT_GET_DEDUPE_NAMESPACE });
    return response.data.data;
  },

  // Store encrypted session keys
  async storeSessionKeys(data: {
    conversationId?: string;
    groupId?: string;
    keys: Array<{ userId: string; encryptedKey: string; keyVersion: number }>;
  }) {
    const response = await api.post(`${CHAT_PREFIX}/keys`, data);
    clearInFlightGetRequestDedupe(CHAT_GET_DEDUPE_NAMESPACE);
    return response.data.data;
  },
};
