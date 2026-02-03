'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { chatService } from '@/services/chat.service';
import anonymousChatService from '@/services/anonymous-chat.service';
import { useSocket } from '@/contexts/SocketContext';
import type { Message } from '@/types/chat.types';

export default function ChatWindowPage() {
  const router = useRouter();
  const params = useParams();
  const { socket, isConnected, joinConversation, leaveConversation } = useSocket();
  const conversationId = params.conversationId as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false); // Prevent duplicate fetches
  const lastFetchRef = useRef(0); // Track last fetch time

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
      
      // Set loading timeout (10 seconds)
      const timeoutId = setTimeout(() => {
        if (loading) {
          setLoadingTimeout(true);
        }
      }, 10000);
      
      // Join conversation room via socket
      if (isConnected) {
        joinConversation(conversationId);
      }
      
      return () => {
        clearTimeout(timeoutId);
        if (isConnected) {
          leaveConversation(conversationId);
        }
      };
    }
  }, [conversationId, isConnected]);

  // Listen for new messages via socket
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      // Add is_my_message flag
      const userStr = localStorage.getItem('user');
      const currentUserId = userStr ? JSON.parse(userStr).user_id : null;
      
      setMessages((prev) => [...prev, {
        ...message,
        is_my_message: message.sender_id === currentUserId,
      }]);
    };

    const handleTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      // Handle typing indicator (optional)
      console.log(`User ${userId} is ${isTyping ? 'typing' : 'not typing'}`);
    };

    const handleIdentityRevealed = () => {
      // Refresh messages when identity is revealed
      setIsAnonymous(false);
      fetchMessages();
    };

    const handleUserBlocked = () => {
      setIsBlocked(true);
      alert('This conversation has been blocked');
    };

    socket.on('new-message', handleNewMessage);
    socket.on('user-typing', handleTyping);
    socket.on('identity-revealed', handleIdentityRevealed);
    socket.on('user-blocked', handleUserBlocked);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('user-typing', handleTyping);
      socket.off('identity-revealed', handleIdentityRevealed);
      socket.off('user-blocked', handleUserBlocked);
    };
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    // Prevent duplicate fetches (debounce 500ms)
    const now = Date.now();
    if (fetchingRef.current || now - lastFetchRef.current < 500) {
      return;
    }
    
    fetchingRef.current = true;
    lastFetchRef.current = now;
    
    try {
      // First, try to fetch from regular chat
      let response;
      let conversationType: 'regular' | 'anonymous' = 'regular';
      
      try {
        response = await chatService.getMessages(conversationId);
      } catch (regularError: any) {
        // If 403/404, try anonymous chat
        if (regularError?.response?.status === 403 || regularError?.response?.status === 404) {
          try {
            response = await anonymousChatService.getAnonymousMessages(conversationId);
            conversationType = 'anonymous';
          } catch (anonError: any) {
            // If both fail, throw the original error
            throw regularError;
          }
        } else {
          throw regularError;
        }
      }
      
      setMessages(response.messages || []);
      
      // Use otherUser from API response
      if (response.otherUser) {
        setOtherUser(response.otherUser);
      }
      
      // Set isAnonymous based on conversation type (not otherUser.is_anonymous)
      // because sender sees real profile but conversation is still anonymous
      setIsAnonymous(conversationType === 'anonymous');
      
      // Check if conversation is blocked from conversation data
      if (response.conversation) {
        setIsBlocked(response.conversation.is_blocked || false);
      }
      
      console.log(`📱 Loaded ${conversationType} conversation:`, conversationId);
    } catch (error: any) {
      // Only log errors that aren't rate limiting (429)
      if (error?.response?.status !== 429) {
        console.error('Failed to fetch messages:', error);
        
        // Handle specific errors
        if (error?.response?.status === 403) {
          alert('You do not have access to this conversation.');
          router.push('/chat');
        } else if (error?.response?.status === 404) {
          alert('Conversation not found.');
          router.push('/chat');
        }
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      
      const messageData = {
        conversationId: conversationId,
        encryptedContent: newMessage,
        contentIv: 'dummy_iv',
        contentAuthTag: 'dummy_tag',
        messageType: 'text',
      };
      
      // Use the correct service based on conversation type
      if (isAnonymous) {
        await anonymousChatService.sendAnonymousMessage(messageData);
      } else {
        await chatService.sendMessage(messageData);
      }

      setNewMessage('');
      fetchMessages(); // Refresh messages
    } catch (error: any) {
      console.error('Failed to send message:', error);
      alert(error.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleRevealIdentity = async () => {
    if (!confirm('Are you sure you want to reveal your identity? This cannot be undone.')) {
      return;
    }

    try {
      await anonymousChatService.revealAnonymousIdentity(conversationId);
      setIsAnonymous(false);
      alert('Your identity has been revealed!');
      fetchMessages();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reveal identity');
    }
  };

  const handleBlockUser = async () => {
    if (!confirm('Are you sure you want to block this user? You will not be able to send or receive messages.')) {
      return;
    }

    try {
      await chatService.blockUser(conversationId);
      setIsBlocked(true);
      setShowMenu(false);
      alert('User blocked successfully');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to block user');
    }
  };

  const handleReportUser = async () => {
    if (!reportReason.trim()) {
      alert('Please provide a reason for reporting');
      return;
    }

    try {
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      
      // Get the other user's ID
      const otherUserId = messages.length > 0 
        ? messages.find(m => m.sender_id !== currentUser?.user_id)?.sender_id
        : null;

      if (!otherUserId) {
        alert('Unable to identify user to report');
        return;
      }

      await chatService.reportUser({
        reportedUserId: otherUserId,
        conversationId,
        reason: reportReason,
        description: reportDescription || undefined,
      });

      setShowReportDialog(false);
      setShowMenu(false);
      setReportReason('');
      setReportDescription('');
      alert('Report submitted successfully. Our team will review it.');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to submit report');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading chat...</p>
          {loadingTimeout && (
            <div className="mt-4">
              <p className="text-orange-600 dark:text-orange-400 mb-3">
                Taking longer than expected...
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setLoading(true);
                    setLoadingTimeout(false);
                    fetchMessages();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push('/chat')}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Back to Chats
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/chat')}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex items-center gap-3 flex-1">
            {/* Profile Picture or Anonymous Icon */}
            {isAnonymous || !otherUser?.dp_url ? (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-semibold">
                {isAnonymous ? '?' : (otherUser?.name?.[0]?.toUpperCase() || 'U')}
              </div>
            ) : (
              <img
                src={otherUser.dp_url}
                alt={otherUser.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {otherUser?.name || 'Unknown User'}
                {isAnonymous && (
                  <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-2 py-1 rounded">
                    Anonymous
                  </span>
                )}
              </h2>
              {!isAnonymous && otherUser?.roll_no && (
                <p className="text-sm text-gray-500">{otherUser.roll_no}</p>
              )}
              {isAnonymous && otherUser?.gender && (
                <p className="text-sm text-gray-500">{otherUser.gender}</p>
              )}
            </div>
          </div>

          {/* Action Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                {isAnonymous && (
                  <button
                    onClick={handleRevealIdentity}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Reveal Identity
                  </button>
                )}
                <button
                  onClick={handleBlockUser}
                  disabled={isBlocked}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  {isBlocked ? 'Blocked' : 'Block User'}
                </button>
                <button
                  onClick={() => {
                    setShowReportDialog(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Report User
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Dialog */}
      {showReportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Report User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason *
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a reason</option>
                  <option value="spam">Spam</option>
                  <option value="harassment">Harassment</option>
                  <option value="inappropriate_content">Inappropriate Content</option>
                  <option value="fake_profile">Fake Profile</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Details (optional)
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Provide more details about the issue..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowReportDialog(false);
                  setReportReason('');
                  setReportDescription('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleReportUser}
                disabled={!reportReason}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-600 mb-2">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isMyMessage = message.is_my_message;
              
              return (
                <div
                  key={message.message_id}
                  className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${isMyMessage ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isMyMessage
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {!isMyMessage && message.sender && (
                        <p className="text-xs font-semibold mb-1 opacity-75">
                          {message.sender.is_anonymous
                            ? `Anonymous (${message.sender.display_gender || 'Unknown'})`
                            : message.sender.name}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{message.encrypted_content}</p>
                      <p className={`text-xs mt-1 ${isMyMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                        {formatTime(message.created_at.toString())}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
