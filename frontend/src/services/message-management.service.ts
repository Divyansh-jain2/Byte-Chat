import axios from 'axios';

const API_URL = 'http://localhost:3001/api/messages';

export const messageManagementService = {
  // ========== REACTIONS ==========
  async addReaction(messageId: string, emoji: string, token: string) {
    const response = await axios.post(
      `${API_URL}/message/${messageId}/reaction`,
      { emoji },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async removeReaction(messageId: string, emoji: string, token: string) {
    const response = await axios.delete(
      `${API_URL}/message/${messageId}/reaction`,
      {
        data: { emoji },
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  },

  async getReactions(messageId: string, token: string) {
    const response = await axios.get(
      `${API_URL}/message/${messageId}/reactions`,
      { headers: { Authorization: `Bearer ${token}` } }
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
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async getEditHistory(messageId: string, token: string) {
    const response = await axios.get(
      `${API_URL}/message/${messageId}/history`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  // ========== DELETION ==========
  async deleteMessage(messageId: string, deleteForEveryone: boolean, token: string) {
    const response = await axios.delete(
      `${API_URL}/message/${messageId}/delete`,
      {
        data: { deleteForEveryone },
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  }
};
