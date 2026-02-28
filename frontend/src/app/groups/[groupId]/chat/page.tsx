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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

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

    return () => {
      socket.off('new-group-message', handleNewGroupMessage);
      socket.off('new-poll', handleNewPoll);
      socket.off('poll-updated', handlePollUpdated);
    };
  }, [socket]);

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


  const fetchPolls = useCallback ( async () => {
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
  const fetchMessages = useCallback ( async () => {
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
    });
    
    // Clear states AFTER successful send
    setNewMessage('');
    setSelectedImage(null);
    setImagePreview(null);
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
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setShowCreatePoll(!showCreatePoll)}
          className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-blue-700 transition-colors"
        >
          {showCreatePoll ? 'HIDE POLL' : '+ POLL'}
        </button>
      </div>

      {/* Create Poll Form */}
      {showCreatePoll && <QuickPollForm groupId={groupId} onSuccess={() => { setShowCreatePoll(false); fetchPolls(); }} />}

      {/* Active Polls Section */}
      <div className="bg-white dark:bg-black border-4 border-neutral-900 dark:border-neutral-100 p-4 mb-4">
        {polls.length > 0 && (
            <div className="mb-6 space-y-3">
              {polls.map((poll) => (
                <div key={poll.poll_id} className="bg-blue-50 dark:bg-blue-950 border-2 border-blue-600 dark:border-blue-400 p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg">📊</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-neutral-900 dark:text-neutral-100 font-mono text-sm">
                        {poll.title}
                      </h4>
                      {poll.description && (
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono mt-1">
                          {poll.description}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-mono font-bold border border-neutral-900 dark:border-neutral-100 ${
                      poll.status === 'active' ? 'bg-green-200 text-green-900' :
                      poll.status === 'passed' ? 'bg-blue-200 text-blue-900' :
                      'bg-red-200 text-red-900'
                    }`}>
                      {poll.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Vote Progress */}
                  <div className="my-2">
                    <div className="h-3 border border-neutral-900 dark:border-neutral-100 flex overflow-hidden">
                      <div 
                        className="bg-green-500"
                        style={{ width: `${(poll.votes_for / poll.total_voters) * 100}%` }}
                      />
                      <div 
                        className="bg-red-500"
                        style={{ width: `${(poll.votes_against / poll.total_voters) * 100}%` }}
                        />
                    </div>
              </div>

              <div className="flex justify-between text-xs font-mono mt-1">
                <span className="text-green-700 dark:text-green-300">FOR: {poll.votes_for}</span>
                <span className="text-neutral-600 dark:text-neutral-400">
                  {poll.votes_for + poll.votes_against}/{poll.total_voters}
                </span>
                <span className="text-red-700 dark:text-red-300">AGAINST: {poll.votes_against}</span>
              </div>
              
            {showCreatePoll && <QuickPollForm groupId={groupId} onSuccess={() => { setShowCreatePoll(false); fetchPolls(); }} />}

            {/* Vote Buttons */}
            {poll.status === 'active' && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleVote(poll.poll_id, true)}
                  disabled={poll.has_voted && poll.user_vote === true}
                  className={`flex-1 px-3 py-1 text-xs font-mono font-bold border border-neutral-900 dark:border-neutral-100 ${
                    poll.has_voted && poll.user_vote === true
                      ? 'bg-green-600 text-white cursor-default'
                      : 'bg-green-200 text-green-900 hover:bg-green-300'
                  }`}
                >
                  ✓ FOR
                </button>
                <button
                  onClick={() => handleVote(poll.poll_id, false)}
                  disabled={poll.has_voted && poll.user_vote === false}
                  className={`flex-1 px-3 py-1 text-xs font-mono font-bold border border-neutral-900 dark:border-neutral-100 ${
                    poll.has_voted && poll.user_vote === false
                      ? 'bg-red-600 text-white cursor-default'
                      : 'bg-red-200 text-red-900 hover:bg-red-300'
                  }`}
                >
                  ✗ AGAINST
                </button>
              </div>
            )}
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-1">
              Expires: {new Date(poll.expires_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>

  {/* Messages */}
  <div className="bg-white dark:bg-black border-4 border-neutral-900 dark:border-neutral-100 p-4 h-[70vh] overflow-y-auto mt-4">
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
                    {/* Display Image if message type is image */}
                    {msg.message_type === 'image' && msg.media_url && (
                      <div className="mb-2">
                        <Image
                          src={msg.media_url}
                          alt="Shared image"
                          width={400} // Adjust as needed or make dynamic
                          height={300} // Adjust as needed or make dynamic
                          className="max-w-full rounded cursor-pointer hover:opacity-90"
                          onClick={() => window.open(msg.media_url, '_blank')}
                          style={{ objectFit: 'contain', cursor: 'pointer' }}
                        />
                      </div>
                    )}
                    {msg.encrypted_content}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="mt-4 flex gap-2 relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          
          {imagePreview && (
            <div className="absolute bottom-20 left-4 bg-white dark:bg-black border-2 border-neutral-900 dark:border-neutral-100 p-2">
              <Image
                src={imagePreview}
                alt="Preview"
                width={256} 
                height={128}
                className="max-w-xs max-h-32"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="mt-1 px-2 py-1 bg-red-600 text-white font-mono text-xs hover:bg-red-700"
              >
                REMOVE
              </button>
            </div>
          )}

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-20 left-20 z-50">
              <EmojiPicker
                onEmojiClick={handleEmojiSelect}
                autoFocusSearch={false}
                theme={typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? Theme.DARK : Theme.LIGHT}
              />
            </div>
          )}
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || uploadingImage}
            className="px-4 py-3 border-2 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 font-mono hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-50"
            title="Upload image"
          >
            📎
          </button>

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={sending || uploadingImage}
            className="px-4 py-3 border-2 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 font-mono hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-50"
            title="Add emoji"
          >
            😊
          </button>
          
          <input
            ref={messageInputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 border-2 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || uploadingImage}
            className="px-6 py-3 bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors disabled:opacity-50"
          >
            {uploadingImage ? 'UPLOADING...' : sending ? 'SENDING...' : 'SEND'}
          </button>
        </form>
      </main>
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
    } 
    catch (err: unknown) {
      let errorMsg = 'Failed to create poll';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        errorMsg = (err as { message: string }).message;
      }
      // setError(errorMsg);
      toast.error(errorMsg);
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50 dark:bg-blue-950 border-2 border-blue-600 dark:border-blue-400 p-3 mb-4">
      <h3 className="font-bold text-neutral-900 dark:text-neutral-100 font-mono text-sm mb-3">CREATE POLL</h3>
      <div className="space-y-2">
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Poll question..."
          className="w-full px-3 py-2 border border-neutral-900 dark:border-neutral-100 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 font-mono text-sm focus:outline-none"
        />
        <div className="flex gap-2">
          <select
            value={formData.poll_type}
            onChange={(e) => setFormData({ ...formData, poll_type: e.target.value })}
            className="flex-1 px-3 py-2 border border-neutral-900 dark:border-neutral-100 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 font-mono text-sm"
          >
            <option value="kick_member">Kick Member</option>
            <option value="make_admin">Make Admin</option>
            <option value="remove_admin">Remove Admin</option>
            <option value="change_group_name">Change Name</option>
          </select>
          <input
            type="number"
            min={1}
            max={168}
            value={formData.expires_in_hours}
            onChange={(e) => setFormData({ ...formData, expires_in_hours: parseInt(e.target.value) })}
            className="w-20 px-3 py-2 border border-neutral-900 dark:border-neutral-100 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 font-mono text-sm"
            placeholder="hrs"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white font-mono font-bold border border-neutral-900 dark:border-neutral-100 hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {loading ? '...' : 'POST'}
          </button>
        </div>
      </div>
    </form>
  );
}
