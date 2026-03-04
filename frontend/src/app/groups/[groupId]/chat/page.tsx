'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { groupService } from '@/services/group.service';
import { useSocket } from '@/contexts/SocketContext';
import { useToast } from '@/contexts/ToastContext';
import type { Message, Poll } from '@/types/chat.types';
import { Theme } from 'emoji-picker-react';
import Image from 'next/image';
import MessageBubble from '@/components/MessageBubble';
import { messageManagementService } from '@/services/message-management.service';

// Dynamic import for emoji picker (client-side only)
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });
type EmojiData = { emoji: string };

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
  const { getSocket, isConnected, joinGroup, leaveGroup } = useSocket();
  const toast = useToast();
  const socket = getSocket();

  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await groupService.getGroupMessages(groupId);
      setMessages(response.data.messages || []);
    }
    catch (error: unknown) {
      console.error('Failed to fetch group messages:', error);
      let message = '';
      if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: string }).message === 'string'
      ) {
        message = (error as { message: string }).message;
        if (message.includes('Access denied')) {
          toast.error('You are not a member of this group.');
          router.push(`/groups/${groupId}`);
        }
      }
    }
    finally {
      setLoading(false);
    }
  }, [groupId, toast, router]);

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
    const handleNewPoll = (poll: Poll) => {
      setPolls((prev) => [poll, ...prev]);
    };

    const handlePollUpdated = (poll: Poll) => {
      setPolls((prev) => prev.map(p => p.poll_id === poll.poll_id ? poll : p));
    };

    socket.on('new-poll', handleNewPoll);
    socket.on('poll-updated', handlePollUpdated);

    // Message management events
    const handleMessageReaction = () => fetchMessages();
    const handleMessageEdited = (data: { messageId: string; newContent: string }) => {
      setMessages(prev => prev.map(msg =>
        msg.message_id === data.messageId
          ? { ...msg, encrypted_content: data.newContent, is_edited: true, edited_at: new Date() }
          : msg
      ));
    };
    const handleMessageDeleted = (data: { messageId: string; deleteForEveryone: boolean; deletedForUserId?: string }) => {
      if (data.deleteForEveryone) {
        setMessages(prev => prev.filter(msg => msg.message_id !== data.messageId));
      } else if (data.deletedForUserId) {
        const userStr = localStorage.getItem('user');
        const currentUserId = userStr ? JSON.parse(userStr).user_id : null;
        if (currentUserId === data.deletedForUserId) {
          setMessages(prev => prev.filter(msg => msg.message_id !== data.messageId));
        }
      }
    };

    socket.on('message:reaction', handleMessageReaction);
    socket.on('message:edited', handleMessageEdited);
    socket.on('message:deleted', handleMessageDeleted);

    return () => {
      socket.off('new-group-message', handleNewGroupMessage);
      socket.off('new-poll', handleNewPoll);
      socket.off('poll-updated', handlePollUpdated);
      socket.off('message:reaction', handleMessageReaction);
      socket.off('message:edited', handleMessageEdited);
      socket.off('message:deleted', handleMessageDeleted);
    };
  }, [socket, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };


  const fetchPolls = useCallback(async () => {
    try {
      const response = await groupService.getGroupPolls(groupId, 'active');
      if (response.success && response.data) {
        setPolls(response.data);
      }
    }
    catch (err: unknown) {
      let errorMsg = 'Failed to load anonymous identities';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        errorMsg = (err as { message: string }).message;
      }
      console.error('Failed to fetch polls:', errorMsg);
    }
  }, [groupId]);

  const handleVote = async (pollId: string, voteValue: boolean) => {
    try {
      await groupService.voteOnPoll(groupId, pollId, voteValue);
      fetchPolls();
    }
    catch (err: unknown) {
      let errorMsg = 'Failed to fetch vote';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        errorMsg = (err as { message: string }).message;
      }
      // setError(errorMsg);
      // toast.error(errorMsg);
      console.error('Failed to fetch polls:', errorMsg);
    }
  };

  useEffect(() => {
    fetchPolls();
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
  }, [groupId, isConnected, fetchMessages, fetchPolls, joinGroup, leaveGroup]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || sending) return;

    try {
      setSending(true);

      let mediaUrl = '';
      let mediaSize = 0;
      let mediaMimeType = '';

      // Upload image if selected
      if (selectedImage) {
        setUploadingImage(true);
        try {
          const uploadResult = await groupService.uploadImage(groupId, selectedImage);
          mediaUrl = uploadResult.data.url;
          mediaSize = uploadResult.data.size;
          mediaMimeType = uploadResult.data.mimeType;
        }
        catch (uploadError: unknown) {
          let errorMsg = 'Failed to upload image';
          if (
            typeof uploadError === 'object' &&
            uploadError !== null &&
            'message' in uploadError &&
            typeof (uploadError as { message?: string }).message === 'string'
          ) {
            errorMsg = (uploadError as { message: string }).message;
          }
          console.error('[ERROR] Failed to upload image:', uploadError);
          toast.error(errorMsg);
          setUploadingImage(false);
          setSending(false);
          return;
        }
        finally {
          setUploadingImage(false);
        }
      }

      await groupService.sendGroupMessage(groupId, {
        encryptedContent: newMessage.trim() || 'Image',
        contentIv: 'dummy_iv',
        contentAuthTag: 'dummy_tag',
        messageType: selectedImage ? 'image' : 'text',
        ...(mediaUrl && {
          mediaUrl,
          mediaSize,
          mediaMimeType,
        }),
        ...(replyingTo && {
          parentMessageId: replyingTo.message_id,
        }),
      });

      // Clear states AFTER successful send
      setNewMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      setReplyingTo(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    catch (err: unknown) {
      let errorMsg = 'Failed to send message';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        errorMsg = (err as { message: string }).message;
      }
      // setError(errorMsg);
      toast.error(errorMsg);
      // console.error('Failed to fetch polls:', errorMsg);
    }
    finally {
      setSending(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEmojiSelect = (emojiData: EmojiData) => {
    const emoji = emojiData.emoji;
    const input = messageInputRef.current;

    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const currentMessage = newMessage;

      // Insert emoji at cursor position
      const newText = currentMessage.substring(0, start) + emoji + currentMessage.substring(end);
      setNewMessage(newText);

      // Set cursor position after emoji
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      // If no cursor position, append to end
      setNewMessage(prev => prev + emoji);
    }

    setShowEmojiPicker(false);
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

  const handleReply = useCallback((message: Message | { message_id: string; encrypted_content?: string; sender?: { name: string } }) => {
    // Convert to replyable message
    const replyMessage: Message = message as Message;
    setReplyingTo(replyMessage);
    messageInputRef.current?.focus();
  }, []);

  const handleEdit = useCallback(async (messageId: string, newContent: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      await messageManagementService.editMessage(
        messageId,
        newContent,
        'dummy_iv',
        'dummy_tag',
        token
      );
      toast.success('Message edited');
      fetchMessages();
    } catch (error: unknown) {
      console.error('Failed to edit message:', error);
      toast.error('Failed to edit message');
    }
  }, [fetchMessages, toast]);

  const handleDelete = useCallback(async (messageId: string, deleteForEveryone: boolean) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      await messageManagementService.deleteMessage(messageId, deleteForEveryone, token);
      toast.success(deleteForEveryone ? 'Message deleted for everyone' : 'Message deleted for you');
      fetchMessages();
    } catch (error: unknown) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
    }
  }, [fetchMessages, toast]);

  if (loading) {
    return (
      <div className="h-screen bg-mesh-warm flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full border-4 border-transparent mx-auto mb-4 animate-spin"
            style={{ borderTopColor: 'var(--pink)', borderRightColor: 'var(--coral)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Loading chat…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-mesh-warm antialiased flex flex-col">
      {/* Fixed blob */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-80 h-80 bg-linear-to-br from-cyan-300/10 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Chat Header */}
      <header className="glass-nav shrink-0 px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <Link href={`/groups/${groupId}`} className="btn-ghost w-9 h-9 rounded-full flex items-center justify-center text-lg">←</Link>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
            style={{ background: 'var(--grad-ocean)' }}>
            👥
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--heading)' }}>Group Chat</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {messages.length > 0 ? `${messages.length} messages` : 'No messages yet'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreatePoll(!showCreatePoll)}
            className={`btn-ghost px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 ${showCreatePoll ? 'text-blue-400' : ''}`}
          >
            📊 {showCreatePoll ? 'Hide Poll' : 'Poll'}
          </button>
          <Link href="/dashboard" className="btn-ghost px-3 py-1.5 text-xs">Dashboard</Link>
        </div>
      </header>

      {/* Poll Panel (collapsible) */}
      {showCreatePoll && (
        <div className="shrink-0 px-4 pt-3">
          <QuickPollForm groupId={groupId} onSuccess={() => { setShowCreatePoll(false); fetchPolls(); }} />
        </div>
      )}

      {/* Active Polls */}
      {polls.length > 0 && (
        <div className="shrink-0 px-4 pt-2 space-y-2 max-h-48 overflow-y-auto">
          {polls.map((poll) => (
            <div key={poll.poll_id} className="glass rounded-2xl p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">📊</span>
                  <p className="text-sm font-semibold" style={{ color: 'var(--heading)' }}>{poll.title}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${poll.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' :
                  poll.status === 'passed' ? 'bg-blue-500/15 text-blue-400' :
                    'bg-red-500/15 text-red-400'
                  }`}>{poll.status}</span>
              </div>
              {/* Progress bar */}
              <div className="h-2 rounded-full overflow-hidden my-2" style={{ background: 'var(--glass-bg)' }}>
                <div className="h-full bg-linear-to-r from-emerald-500 to-emerald-400 rounded-full"
                  style={{ width: `${(poll.votes_for / Math.max(poll.total_voters, 1)) * 100}%` }} />
              </div>
              <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--muted)' }}>
                <span className="text-emerald-400">{poll.votes_for} for</span>
                <span>{poll.votes_for + poll.votes_against}/{poll.total_voters}</span>
                <span className="text-red-400">{poll.votes_against} against</span>
              </div>
              {poll.status === 'active' && (
                <div className="flex gap-2">
                  <button onClick={() => handleVote(poll.poll_id, true)} disabled={poll.has_voted && poll.user_vote === true}
                    className={`flex-1 py-1 rounded-xl text-xs font-semibold transition-all ${poll.has_voted && poll.user_vote === true ? 'bg-emerald-500 text-white' : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                      }`}>✓ For</button>
                  <button onClick={() => handleVote(poll.poll_id, false)} disabled={poll.has_voted && poll.user_vote === false}
                    className={`flex-1 py-1 rounded-xl text-xs font-semibold transition-all ${poll.has_voted && poll.user_vote === false ? 'bg-red-500 text-white' : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                      }`}>✗ Against</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center animate-fade-in">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No messages yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMyMessage = !!msg.is_my_message;
            return (
              <MessageBubble
                key={msg.message_id}
                message={msg as any}
                isMyMessage={isMyMessage}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                formatTime={formatTime}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      {replyingTo && (
        <div className="shrink-0 px-4 pt-2">
          <div className="flex items-start gap-2 p-3 rounded-xl glass" style={{ borderLeft: '3px solid var(--coral)' }}>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--coral)' }}>
                Replying to {replyingTo.sender?.name || 'Unknown'}
              </p>
              <p className="text-sm truncate" style={{ color: 'var(--muted)' }}>
                {replyingTo.encrypted_content || 'Image'}
              </p>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="w-6 h-6 rounded-full glass flex items-center justify-center shrink-0 hover:opacity-70"
              style={{ color: 'var(--muted)' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Image preview */}
      {imagePreview && (
        <div className="shrink-0 px-4 pb-2">
          <div className="glass rounded-2xl p-3 flex items-center gap-3">
            <Image src={imagePreview} alt="Preview" width={80} height={60}
              className="rounded-xl object-contain shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Image ready to send</p>
            </div>
            <button onClick={handleRemoveImage} className="btn-ghost w-8 h-8 rounded-full flex items-center justify-center text-red-400">✕</button>
          </div>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="absolute bottom-20 left-4 z-50">
          <EmojiPicker onEmojiClick={handleEmojiSelect} autoFocusSearch={false}
            theme={typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? Theme.DARK : Theme.LIGHT} />
        </div>
      )}

      {/* Input Bar */}
      <div className="glass-nav shrink-0 px-4 py-3 z-10">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending || uploadingImage}
            className="btn-ghost w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0" title="Upload image">
            📎
          </button>
          <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} disabled={sending || uploadingImage}
            className="btn-ghost w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0" title="Emoji">
            😊
          </button>
          <input ref={messageInputRef} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message…" className="input-romance flex-1 py-2.5" />
          <button type="submit" disabled={sending || uploadingImage} className="btn-romance shrink-0 px-5 py-2.5">
            {uploadingImage ? '↑' : sending ? '…' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Quick Poll Form Component
function QuickPollForm({ groupId, onSuccess }: { groupId: string; onSuccess: () => void }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    poll_type: 'kick_member',
    title: '',
    expires_in_hours: 24
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await groupService.createPoll(groupId, formData);
      onSuccess();
      setFormData({ poll_type: 'kick_member', title: '', expires_in_hours: 24 });
    } catch (err: unknown) {
      let errorMsg = 'Failed to create poll';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        errorMsg = (err as { message: string }).message;
      }
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-4 mb-2">
      <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--heading)' }}>Create Poll</h3>
      <div className="space-y-2">
        <input type="text" required value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Poll question…" className="input-romance w-full text-sm" />
        <div className="flex gap-2">
          <select value={formData.poll_type} onChange={(e) => setFormData({ ...formData, poll_type: e.target.value })}
            className="select-romance flex-1 text-sm">
            <option value="kick_member">Kick Member</option>
            <option value="make_admin">Make Admin</option>
            <option value="remove_admin">Remove Admin</option>
            <option value="change_group_name">Change Name</option>
          </select>
          <input type="number" min={1} max={168} value={formData.expires_in_hours}
            onChange={(e) => setFormData({ ...formData, expires_in_hours: parseInt(e.target.value) })}
            className="input-romance w-20 text-sm" placeholder="hrs" />
          <button type="submit" disabled={loading} className="btn-romance px-4 py-2 text-sm">
            {loading ? '…' : 'Post'}
          </button>
        </div>
      </div>
    </form>
  );
}
