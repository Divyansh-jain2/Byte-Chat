import axios from 'axios';

import { API_BASE_URL } from './apiBase';
const API_URL = `${API_BASE_URL}/api/messages`;

export const messageManagementService = {
  // ========== REACTIONS ==========
  async addReaction(messageId: string, emoji: string, token: string) {
    const response = await axios.post(
      `${API_URL}/message/${messageId}/reaction`,
      { emoji },
      { withCredentials: true }
    );
    return response.data;
  },

  async removeReaction(messageId: string, emoji: string, token: string) {
    const response = await axios.delete(
      `${API_URL}/message/${messageId}/reaction`,
      {
        data: { emoji },
        withCredentials: true
      }
    );
    return response.data;
  },

  async getReactions(messageId: string, token: string) {
    const response = await axios.get(
      `${API_URL}/message/${messageId}/reactions`,
      { withCredentials: true }
    );
    return response.data;
  },

  // ========== EDITING ==========
  async editMessage(
    messageId: string,
    encryptedContent: string,
    contentIv: string,
    contentAuthTag: string,
    token: string
  ) {
    const response = await axios.put(
      `${API_URL}/message/${messageId}/edit`,
      { encryptedContent, contentIv, contentAuthTag },
      { withCredentials: true }
    );
    return response.data;
  },

  async getEditHistory(messageId: string, token: string) {
    const response = await axios.get(
      `${API_URL}/message/${messageId}/history`,
      { withCredentials: true }
    );
    return response.data;
  },

  // ========== DELETION ==========
  async deleteMessage(messageId: string, deleteForEveryone: boolean, token: string) {
    const response = await axios.delete(
      `${API_URL}/message/${messageId}/delete`,
      {
        data: { deleteForEveryone },
        withCredentials: true
      }
    );
    return response.data;
  }
};
