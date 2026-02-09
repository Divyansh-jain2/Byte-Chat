'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { groupService } from '@/services/group.service';
import { useSocket } from '@/contexts/SocketContext';
import type { Message } from '@/types/chat.types';

interface GroupMessage extends Message {
  sender?: {
    user_id: string;
    name: string;
    display_gender?: string;
    dp_url?: string;
    is_anonymous: boolean;
  };
}

export default function GroupChatPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { socket, isConnected, joinGroup, leaveGroup } = useSocket();

  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (groupId) {
      fetchMessages();

      if (isConnected) {
        joinGroup(groupId);
      }

      return () => {
        if (isConnected) {
          leaveGroup(groupId);
        }
      };
    }
  }, [groupId, isConnected]);

  useEffect(() => {
    if (!socket) return;

    const handleNewGroupMessage = (message: GroupMessage) => {
      const userStr = localStorage.getItem('user');
      const currentUserId = userStr ? JSON.parse(userStr).user_id : null;

      setMessages((prev) => [...prev, {
        ...message,
        is_my_message: message.sender_id === currentUserId,
      }]);
    };

    socket.on('new-group-message', handleNewGroupMessage);

    return () => {
      socket.off('new-group-message', handleNewGroupMessage);
    };
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const response = await groupService.getGroupMessages(groupId);
      setMessages(response.data.messages || []);
    } catch (error: any) {
      console.error('Failed to fetch group messages:', error);
      if (error.message?.includes('Access denied')) {
        alert('You are not a member of this group.');
        router.push(`/groups/${groupId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      await groupService.sendGroupMessage(groupId, {
        encryptedContent: newMessage,
        contentIv: 'dummy_iv',
        contentAuthTag: 'dummy_tag',
        messageType: 'text'
      });
      setNewMessage('');
    } catch (error: any) {
      alert(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-neutral-100 rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400 font-mono">LOADING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
      <header className="border-b-4 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-black p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">[GROUP CHAT]</h1>
          <div className="flex gap-2">
            <Link
              href={`/groups/${groupId}`}
              className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
            >
              VIEW GROUP
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
            >
              BACK
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4">
        <div className="bg-white dark:bg-black border-4 border-neutral-900 dark:border-neutral-100 p-4 h-[70vh] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center text-neutral-500 dark:text-neutral-400 font-mono mt-10">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.message_id} className={`mb-4 ${msg.is_my_message ? 'text-right' : 'text-left'}`}>
                <div className="inline-block max-w-[80%]">
                  {!msg.is_my_message && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mb-1">
                      {msg.sender?.name || 'Unknown'}
                    </div>
                  )}
                  <div className={`px-4 py-2 border-2 border-neutral-900 dark:border-neutral-100 font-mono text-sm ${msg.is_my_message ? 'bg-neutral-900 text-neutral-100 dark:bg-neutral-100 dark:text-neutral-900' : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100'}`}>
                    {msg.encrypted_content}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 border-2 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending}
            className="px-6 py-3 bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors disabled:opacity-50"
          >
            {sending ? 'SENDING...' : 'SEND'}
          </button>
        </form>
      </main>
    </div>
  );
}
