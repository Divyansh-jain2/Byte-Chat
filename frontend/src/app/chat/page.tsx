'use client';

import { useEffect, useState } from 'react';
// import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { chatService } from '@/services/chat.service';
import anonymousChatService from '@/services/anonymous-chat.service';
import type { Conversation, ChatRequest } from '@/types/chat.types';
import Image from 'next/image';

export default function ChatPage() {
  // const router = useRouter();
  // const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'conversations' | 'requests'>('conversations');

  useEffect(() => {
    fetchConversations();
    fetchChatRequests();
  }, []);

  const fetchConversations = async () => {
    try {
      // Fetch both regular and anonymous conversations
      const [regularData, anonymousData] = await Promise.all([
        chatService.getConversations(),
        anonymousChatService.getAnonymousConversations()
      ]);
      
      // Combine and sort by last_message_at
      const combined = [...regularData, ...anonymousData].sort((a, b) => {
        const dateA = new Date(a.last_message_at || a.created_at).getTime();
        const dateB = new Date(b.last_message_at || b.created_at).getTime();
        return dateB - dateA;
      });
      
      setConversations(combined);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatRequests = async () => {
    try {
      const data = await chatService.getChatRequests();
      setChatRequests(data);
    } catch (error) {
      console.error('Failed to fetch chat requests:', error);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await chatService.respondToChatRequest(requestId, 'accept');
      // Refresh both lists
      fetchChatRequests();
      fetchConversations();
    } catch (error) {
      console.error('Failed to accept request:', error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await chatService.respondToChatRequest(requestId, 'reject');
      fetchChatRequests();
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (hours < 48) return 'Yesterday';
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
            <div className="flex gap-2">
              <Link
                href="/my-identities"
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                🎭 Identities
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('conversations')}
              className={`flex-1 px-6 py-4 text-center font-medium transition ${
                activeTab === 'conversations'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Conversations ({conversations.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 px-6 py-4 text-center font-medium transition relative ${
                activeTab === 'requests'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Requests ({chatRequests.length})
              {chatRequests.length > 0 && (
                <span className="absolute top-2 right-4 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {chatRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Conversations List */}
        {activeTab === 'conversations' && (
          <div className="space-y-3">
            {conversations.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">No conversations yet</p>
                <Link
                  href="/dashboard"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Find People to Chat
                </Link>
              </div>
            ) : (
              conversations.map((conv) => (
                <Link
                  key={conv.conversation_id}
                  href={`/chat/${conv.conversation_id}`}
                  className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition p-4"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="shrink-0">
                      {conv.other_user_dp ? (
                        <Image
                          src={conv.other_user_dp}
                          alt={conv.other_user_name}
                          width={32}
                          height={32}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-linear-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                          {conv.other_user_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {conv.unread_count > 0 && (
                        <div className="absolute ml-10 -mt-3 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {conv.unread_count}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate flex items-center gap-2">
                          {conv.other_user_name}
                          {conv.is_anonymous && (
                            <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-2 py-1 rounded">
                              Anonymous
                            </span>
                          )}
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatTime(conv.last_message_time || conv.created_at)}
                        </span>
                      </div>
                      {conv.last_message_preview && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {conv.last_message_type === 'text' ? '🔒 Encrypted message' : '📎 Attachment'}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* Chat Requests */}
        {activeTab === 'requests' && (
          <div className="space-y-3">
            {chatRequests.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400 text-lg">No pending requests</p>
              </div>
            ) : (
              chatRequests.map((request) => (
                <div
                  key={request.request_id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="shrink-0">
                      {request.sender_dp_url ? (
                        <Image
                          src={request.sender_dp_url}
                          alt={request.sender_display_name}
                          width={32}
                          height={32}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-linear-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                          {request.sender_display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {request.sender_display_name}
                        </h3>
                        {request.request_type === 'anonymous' && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-2 py-1 rounded">
                            Anonymous
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {request.request_type === 'anonymous'
                          ? `Anonymous user wants to chat • ${request.sender_gender}`
                          : 'Wants to start a chat with you'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {formatTime(request.created_at)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request.request_id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.request_id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
