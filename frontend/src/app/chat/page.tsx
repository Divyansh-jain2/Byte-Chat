'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { chatService } from '@/services/chat.service';
import anonymousChatService from '@/services/anonymous-chat.service';
import type { Conversation, ChatRequest } from '@/types/chat.types';
import Image from 'next/image';
import { usePresence } from '@/hooks/usePresence';
import { useSocket } from '@/contexts/SocketContext';

type RealtimeNotificationPayload = {
  notification?: {
    type?: string;
    conversationId?: string;
    conversation_id?: string;
    chatId?: string;
    chat_id?: string;
    timestamp?: number;
  };
};

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chatRequests, setChatRequests] = useState<ChatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'conversations' | 'requests'>('conversations');
  const { getSocket, isConnected } = useSocket();
  const conversationsRef = useRef<Conversation[]>([]);
  const pendingRealtimeUpdatesRef = useRef<Map<string, { incrementBy: number; timestamp?: number }>>(new Map());
  const flushTimerRef = useRef<number | null>(null);
  const flushDelayRef = useRef<number>(80);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Collect other-user IDs for presence tracking
  const otherUserIds = useMemo(
    () => conversations
      .filter(c => !c.is_anonymous && c.other_user_id)
      .map(c => c.other_user_id as string),
    [conversations]
  );
  const onlineUsers = usePresence(otherUserIds);

  useEffect(() => {
    fetchConversations();
    fetchChatRequests();
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    const socket = getSocket();
    if (!socket) return;
    const pendingMap = pendingRealtimeUpdatesRef.current;

    const flushRealtimeConversationUpdates = () => {
      const updates = Array.from(pendingMap.entries());
      if (updates.length === 0) return;

      const next = [...conversationsRef.current];
      let changed = false;
      let missingConversation = false;

      for (const [conversationId, update] of updates) {
        const index = next.findIndex((c) => c.conversation_id === conversationId);
        if (index === -1) {
          missingConversation = true;
          continue;
        }

        changed = true;
        const target = next[index];
        const updatedConversation: Conversation = {
          ...target,
          unread_count: (target.unread_count || 0) + update.incrementBy,
          last_message_time: update.timestamp ? new Date(update.timestamp) : target.last_message_time,
        };

        // Keep most recently active conversations at the top.
        next.splice(index, 1);
        next.unshift(updatedConversation);
      }

      pendingMap.clear();

      if (changed) {
        conversationsRef.current = next;
        setConversations(next);
      }

      if (missingConversation) {
        void fetchConversations();
      }
    };

    const scheduleRealtimeFlush = () => {
      const pendingCount = pendingMap.size;
      const targetDelay = pendingCount > 6 ? 150 : 80;

      if (flushTimerRef.current !== null) {
        if (targetDelay === flushDelayRef.current) return;
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }

      flushDelayRef.current = targetDelay;

      flushTimerRef.current = window.setTimeout(() => {
        flushTimerRef.current = null;
        flushRealtimeConversationUpdates();
      }, targetDelay);
    };

    const handleNewNotification = (payload: RealtimeNotificationPayload) => {
      const notification = payload.notification;
      if (!notification || notification.type !== 'new_message') return;

      const conversationId =
        notification.conversationId ||
        notification.conversation_id ||
        notification.chatId ||
        notification.chat_id;

      if (!conversationId) return;

      const existing = pendingMap.get(conversationId) || { incrementBy: 0 };
      const nextTimestamp =
        typeof notification.timestamp === 'number'
          ? Math.max(existing.timestamp || 0, notification.timestamp)
          : existing.timestamp;

      pendingMap.set(conversationId, {
        incrementBy: existing.incrementBy + 1,
        timestamp: nextTimestamp,
      });

      scheduleRealtimeFlush();
    };

    socket.on('new-notification', handleNewNotification);

    return () => {
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      pendingMap.clear();
      socket.off('new-notification', handleNewNotification);
    };
  }, [isConnected, getSocket]);

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

  const handleConversationOpen = (conversationId: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.conversation_id === conversationId
          ? { ...conv, unread_count: 0 }
          : conv
      )
    );
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
      <div className="min-h-screen bg-mesh-warm flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-14 h-14 rounded-full border-4 mx-auto mb-4 animate-spin" style={{ borderColor: 'var(--pink)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading messages…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh-warm antialiased">
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-linear-to-br from-pink-300/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-[-5%] left-[-3%] w-72 h-72 bg-linear-to-br from-purple-300/10 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <header className="glass-nav sticky top-0 z-40 px-5 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--grad-romance)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--heading)' }}>Messages</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/my-identities" className="px-4 py-2 rounded-xl text-sm font-semibold glass" style={{ color: 'var(--purple)' }}>🎭 Identities</Link>
            <Link href="/dashboard" className="px-4 py-2 rounded-xl text-sm font-semibold glass" style={{ color: 'var(--body)' }}>← Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6">
        {/* Pill tabs */}
        <div className="glass rounded-2xl p-1 flex gap-1 mb-6 w-fit">
          <button
            onClick={() => setActiveTab('conversations')}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'conversations' ? 'btn-romance shadow-md' : ''}`}
            style={activeTab !== 'conversations' ? { color: 'var(--body)' } : {}}
          >
            💬 Chats ({conversations.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${activeTab === 'requests' ? 'btn-romance shadow-md' : ''}`}
            style={activeTab !== 'requests' ? { color: 'var(--body)' } : {}}
          >
            📩 Requests ({chatRequests.length})
            {chatRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ background: 'var(--pink)' }}>
                {chatRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Conversations */}
        {activeTab === 'conversations' && (
          <div className="space-y-3">
            {conversations.length === 0 ? (
              <div className="glass-strong rounded-2xl p-12 text-center">
                <p className="text-5xl mb-4">💬</p>
                <p className="font-semibold mb-1" style={{ color: 'var(--heading)' }}>No conversations yet</p>
                <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>Start chatting with someone!</p>
                <Link href="/dashboard" className="btn-romance px-6 py-2.5 text-sm font-semibold inline-block">Find people →</Link>
              </div>
            ) : conversations.map((conv, index) => (
              <Link
                key={conv.conversation_id}
                href={`/chat/${conv.conversation_id}`}
                onClick={() => handleConversationOpen(conv.conversation_id)}
                className="glass-card rounded-2xl p-4 flex items-center gap-4 no-underline"
              >
                <div className="relative shrink-0">
                  {conv.other_user_dp ? (
                    <Image src={conv.other_user_dp} alt={conv.other_user_name} width={48} height={48} className="w-12 h-12 rounded-full object-cover ring-2 ring-white/50" priority={index < 5} />
                  ) : (
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: conv.is_anonymous ? 'var(--grad-mystery)' : 'var(--grad-romance)' }}>
                      {conv.is_anonymous ? '?' : conv.other_user_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Unread badge */}
                  {conv.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ background: 'var(--pink)' }}>{conv.unread_count}</span>
                  )}
                  {/* Online dot — only for non-anonymous, known user */}
                  {!conv.is_anonymous && conv.other_user_id && onlineUsers.has(conv.other_user_id) && (
                    <span
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white"
                      style={{ background: '#22C55E' }}
                      title="Online"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold truncate flex items-center gap-2" style={{ color: 'var(--heading)' }}>
                      {conv.other_user_name}
                      {conv.is_anonymous && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(168,85,247,.15)', color: 'var(--purple)' }}>Anon</span>}
                    </span>
                    <span className="text-xs shrink-0 ml-2" style={{ color: 'var(--muted)' }}>{formatTime(conv.last_message_time || conv.created_at)}</span>
                  </div>
                  {/* Online label OR last message preview */}
                  {!conv.is_anonymous && conv.other_user_id && onlineUsers.has(conv.other_user_id) ? (
                    <p className="text-xs font-medium" style={{ color: '#22C55E' }}>● Online</p>
                  ) : conv.last_message_preview ? (
                    <p className="text-sm truncate" style={{ color: 'var(--muted)' }}>
                      {conv.last_message_type === 'text' ? '🔒 Encrypted message' : '📎 Attachment'}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Chat Requests */}
        {activeTab === 'requests' && (
          <div className="space-y-3">
            {chatRequests.length === 0 ? (
              <div className="glass-strong rounded-2xl p-12 text-center">
                <p className="text-5xl mb-4">📩</p>
                <p className="font-semibold" style={{ color: 'var(--heading)' }}>No pending requests</p>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>You`re all caught up!</p>
              </div>
            ) : chatRequests.map((request, index) => (
              <div key={request.request_id} className="glass-card rounded-2xl p-4 flex items-center gap-4">
                <div className="shrink-0">
                  {request.sender_dp_url ? (
                    <Image src={request.sender_dp_url} alt={request.sender_display_name} width={48} height={48} className="w-12 h-12 rounded-full object-cover" priority={index < 3} />
                  ) : (
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: request.request_type === 'anonymous' ? 'var(--grad-mystery)' : 'var(--grad-romance)' }}>
                      {request.sender_display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold" style={{ color: 'var(--heading)' }}>{request.sender_display_name}</span>
                    {request.request_type === 'anonymous' && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(168,85,247,.15)', color: 'var(--purple)' }}>Anon</span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {request.request_type === 'anonymous' ? `Anonymous · ${request.sender_gender}` : 'Wants to chat'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{formatTime(request.created_at)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleAcceptRequest(request.request_id)} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#22C55E' }}>Accept</button>
                  <button onClick={() => handleRejectRequest(request.request_id)} className="px-4 py-2 rounded-xl text-sm font-semibold glass" style={{ color: '#EF4444' }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

