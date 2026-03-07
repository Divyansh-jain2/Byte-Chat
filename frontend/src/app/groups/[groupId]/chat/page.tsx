'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { groupService } from '@/services/group.service';
import { useSocket } from '@/contexts/SocketContext';
import { useToast } from '@/contexts/ToastContext';
import type { Message, Poll, Group, PollOption } from '@/types/chat.types';
import { Theme } from 'emoji-picker-react';
import Image from 'next/image';
import MessageBubble from '@/components/MessageBubble';
import { messageManagementService } from '@/services/message-management.service';
import {
  encryptMessageAES,
  decryptMessageAES,
  generateAESKey,
  encryptKeyWithPublicKey,
  decryptKeyWithPrivateKey,
  importPrivateKey,
  exportKeyToBase64,
  importKeyFromBase64
} from '@/utils/e2ee.utils';
import { chatService } from '@/services/chat.service';

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
  const [group, setGroup] = useState<Group | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [selectedPollType, setSelectedPollType] = useState<string | null>(null);
  const [showPollTypeMenu, setShowPollTypeMenu] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null);
  const [keyId, setKeyId] = useState<string | null>(null);
  const [isE2EEReady, setIsE2EEReady] = useState(false);
  const [userPrivateKey, setUserPrivateKey] = useState<CryptoKey | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const pollMenuRef = useRef<HTMLDivElement>(null);
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const currentUserId = currentUser?.user_id || currentUser?.userId;

  // E2EE: Initialize session key
  const fetchAndDecryptConversationKey = useCallback(async (msgs: GroupMessage[]) => {
    try {
      const storedUser = localStorage.getItem('user');
      const decryptedPrivateKeyB64 = sessionStorage.getItem('decryptedPrivateKey');

      if (!decryptedPrivateKeyB64 || !storedUser) {
        console.warn('[E2EE] Private key missing from session storage');
        return null;
      }

      // Import private key if not already done
      let privKey = userPrivateKey;
      if (!privKey && decryptedPrivateKeyB64) {
        privKey = await importPrivateKey(decryptedPrivateKeyB64);
        setUserPrivateKey(privKey);
      }

      if (!privKey) return null;

      // Find the most recent message with a session key we can use
      const msgWithKey = msgs.find(m => m.user_session_key && m.key_id);

      if (msgWithKey && msgWithKey.user_session_key && msgWithKey.key_id) {
        try {
          // console.log('[DEBUG] Decrypting session key for msg:', msgWithKey.message_id);
          const aesKeyB64 = await decryptKeyWithPrivateKey(privKey, msgWithKey.user_session_key);
          const aesKey = await importKeyFromBase64(aesKeyB64);
          // console.log('[DEBUG] Session key decrypted successfully');
          setSessionKey(aesKey);
          setKeyId(msgWithKey.key_id);
          setIsE2EEReady(true);
          return aesKey;
        } catch (err) {
          console.error('[E2EE] Failed to decrypt session key:', err);
        }
      }

      // If no key found in messages, or decryption failed, try to initialize a new one
      const info = await groupService.getGroupParticipantPublicKeys(groupId);
      const participants = info.data.participants;

      // Generate new AES key
      const newAesKey = await generateAESKey();
      const aesKeyB64 = await exportKeyToBase64(newAesKey);

      // Encrypt for all participants
      const encryptedKeys = await Promise.all(participants.map(async (p: any) => {
        const encrypted = await encryptKeyWithPublicKey(aesKeyB64, p.public_key);
        return {
          userId: p.user_id,
          encryptedKey: encrypted,
          keyVersion: 1
        };
      }));

      // Store on server
      const { keyId: newKeyId } = await chatService.storeSessionKeys({
        groupId, // Use groupId instead of conversationId for group session storage
        keys: encryptedKeys
      });

      setSessionKey(newAesKey);
      setKeyId(newKeyId);
      setIsE2EEReady(true);
      return newAesKey;
    } catch (error) {
      console.error('[E2EE] Session initialization failed:', error);
    }
  }, [groupId, userPrivateKey]);

  const decryptMessages = useCallback(async (msgs: GroupMessage[], aesKey: CryptoKey) => {
    return await Promise.all(msgs.map(async (m) => {
      let decryptedMsg = { ...m };

      // Decrypt main content
      if (m.encrypted_content && m.content_iv && m.content_auth_tag) {
        try {
          const decrypted = await decryptMessageAES(
            m.encrypted_content,
            m.content_iv,
            m.content_auth_tag,
            aesKey
          );
          decryptedMsg.encrypted_content = decrypted;
        } catch (err) {
          console.warn(`[E2EE] Failed to decrypt message ${m.message_id}:`, err);
          decryptedMsg.encrypted_content = '[Encrypted Message]';
        }
      }

      // Decrypt parent message content if exists
      if (m.parent_message && m.parent_message.encrypted_content && m.parent_message.content_iv && m.parent_message.content_auth_tag) {
        try {
          const decryptedParent = await decryptMessageAES(
            m.parent_message.encrypted_content,
            m.parent_message.content_iv,
            m.parent_message.content_auth_tag,
            aesKey
          );
          decryptedMsg.parent_message = {
            ...m.parent_message,
            encrypted_content: decryptedParent
          };
        } catch (err) {
          console.warn(`[E2EE] Failed to decrypt parent of message ${m.message_id}:`, err);
        }
      }

      return decryptedMsg;
    }));
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await groupService.getGroupMessages(groupId);
      const fetchedMessages = response.data.messages || [];

      // E2EE: Initialize key and decrypt
      const aesKey = await fetchAndDecryptConversationKey(fetchedMessages);
      if (aesKey) {
        const decrypted = await decryptMessages(fetchedMessages, aesKey);
        setMessages(decrypted);
      } else {
        setMessages(fetchedMessages);
      }
    }
    catch (error: unknown) {
      // console.error('Failed to fetch group messages:', error);
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
  }, [groupId, toast, router, fetchAndDecryptConversationKey, decryptMessages]);

  useEffect(() => {
    if (!socket) return;

    const handleNewGroupMessage = async (message: GroupMessage) => {
      // Robust current user identification
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const currentUserId = currentUser?.user_id || currentUser?.userId;

      let processedMessage = { ...message };

      // Decrypt main content if session key is ready
      if (sessionKey && message.encrypted_content) {
        try {
          const decrypted = await decryptMessageAES(
            message.encrypted_content,
            message.content_iv || '',
            message.content_auth_tag || '',
            sessionKey
          );
          processedMessage.encrypted_content = decrypted;
        } catch (err) {
          console.warn('[E2EE] Failed to decrypt real-time message:', err);
        }
      }

      // Decrypt parent message content if session key is ready
      if (sessionKey && message.parent_message?.encrypted_content) {
        try {
          const decryptedParent = await decryptMessageAES(
            message.parent_message.encrypted_content,
            message.parent_message.content_iv || '',
            message.parent_message.content_auth_tag || '',
            sessionKey
          );
          processedMessage.parent_message = {
            ...message.parent_message,
            encrypted_content: decryptedParent
          };
        } catch (err) {
          console.warn('[E2EE] Failed to decrypt parent of real-time message:', err);
        }
      }

      setMessages((prev) => [...prev, {
        ...processedMessage,
        is_my_message: message.sender_id === currentUserId || (message.sender?.user_id === currentUserId),
      }]);
    };

    socket.on('new-group-message', handleNewGroupMessage);
    const handleNewPoll = (poll: Poll) => {
      setPolls((prev) => [poll, ...prev]);
    };

    const handlePollUpdated = (poll: Poll) => {
      setPolls((prev) => prev.map(p => p.poll_id === poll.poll_id ? poll : p));
    };

    const handlePollCancelled = (data: { poll_id: string }) => {
      setPolls(prev => prev.filter(p => p.poll_id !== data.poll_id));
    };

    socket.on('new-poll', handleNewPoll);
    socket.on('poll-updated', handlePollUpdated);
    socket.on('poll-cancelled', handlePollCancelled);

    // Poll lifecycle events
    const handlePollExecuted = (data: { poll_id: string }) => {
      setPolls(prev => prev.filter(p => p.poll_id !== data.poll_id));
    };
    const handlePollExpired = (data: { poll_id: string }) => {
      setPolls(prev => prev.filter(p => p.poll_id !== data.poll_id));
    };
    const handleMemberRemoved = (data: { user_id: string }) => {
      // If the current user was removed, redirect them out
      const userStr = localStorage.getItem('user');
      const currentUserId = userStr ? JSON.parse(userStr).user_id : null;
      if (currentUserId === data.user_id) {
        toast.error('You were removed from this group by a poll vote.');
        router.push('/my-groups');
      } else {
        toast.error('A member was removed by poll vote.');
      }
    };

    socket.on('poll-executed', handlePollExecuted);
    socket.on('poll-cancelled', handlePollCancelled);
    socket.on('poll-expired', handlePollExpired);
    socket.on('member-removed', handleMemberRemoved);

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
      socket.off('poll-cancelled', handlePollCancelled);
      socket.off('poll-executed', handlePollExecuted);
      socket.off('poll-expired', handlePollExpired);
      socket.off('member-removed', handleMemberRemoved);
      socket.off('message:reaction', handleMessageReaction);
      socket.off('message:edited', handleMessageEdited);
      socket.off('message:deleted', handleMessageDeleted);
    };
  }, [socket, fetchMessages, router, toast]);

  const fetchGroup = useCallback(async () => {
    try {
      const response = await groupService.getGroupDetails(groupId);
      // Backend returns { success: true, data: { group: {...} } } OR sometimes { success: true, data: {...} }
      const groupData = response.data?.group || response.data;
      if (groupData) {
        setGroup(groupData);
      }
    } catch (error) {
      console.error('Failed to fetch group details:', error);
    }
  }, [groupId]);

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

  // Close poll menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pollMenuRef.current && !pollMenuRef.current.contains(event.target as Node)) {
        setShowPollTypeMenu(false);
      }
    };

    if (showPollTypeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPollTypeMenu]);

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

  const handleCancelPoll = async (pollId: string) => {
    if (!window.confirm('Are you sure you want to cancel this poll?')) return;

    try {
      await groupService.cancelPoll(groupId, pollId);
      toast.success('Poll cancelled');
      fetchPolls();
    } catch (err: unknown) {
      const errorMsg = (err as { message?: string })?.message || 'Failed to cancel poll';
      toast.error(errorMsg);
    }
  };

  useEffect(() => {
    fetchPolls();
    fetchGroup();
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
  }, [groupId, isConnected, fetchMessages, fetchPolls, joinGroup, leaveGroup, fetchGroup]);


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

      // E2EE Encryption
      let encryptedContent = newMessage.trim() || (selectedImage ? 'Image' : '');
      let contentIv = '';
      let contentAuthTag = '';

      if (sessionKey && encryptedContent) {
        try {
          const encrypted = await encryptMessageAES(encryptedContent, sessionKey);
          encryptedContent = encrypted.ciphertext;
          contentIv = encrypted.iv;
          contentAuthTag = encrypted.authTag;
        } catch (err) {
          console.error('[E2EE] Encryption failed:', err);
          toast.error('Failed to encrypt message');
          setSending(false);
          return;
        }
      }

      await groupService.sendGroupMessage(groupId, {
        encryptedContent,
        contentIv,
        contentAuthTag,
        messageType: selectedImage ? 'image' : 'text',
        keyId: keyId || undefined,
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
      let encryptedContent = newContent;
      let contentIv = '';
      let contentAuthTag = '';

      if (sessionKey) {
        try {
          const encrypted = await encryptMessageAES(newContent, sessionKey);
          encryptedContent = encrypted.ciphertext;
          contentIv = encrypted.iv;
          contentAuthTag = encrypted.authTag;
        } catch (err) {
          console.error('[E2EE] Edit encryption failed:', err);
          toast.error('Failed to encrypt edit');
          return;
        }
      }

      await messageManagementService.editMessage(
        messageId,
        encryptedContent,
        contentIv,
        contentAuthTag,
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
          <Link href="/dashboard" className="btn-ghost px-3 py-1.5 text-xs">Dashboard</Link>
        </div>
      </header>

      {/* Messages area with floating overlays */}
      <div className="flex-1 overflow-y-auto relative custom-scrollbar">
        {/* Active Polls - Compact Floating Cards */}
        {polls.length > 0 && (
          <div className="absolute top-4 left-4 right-4 z-40 space-y-3 pointer-events-none">
            {polls.map((poll) => (
              <div key={poll.poll_id} className="glass rounded-2xl p-4 shadow-xl border border-white/20 backdrop-blur-2xl pointer-events-auto max-w-sm mx-auto animate-fade-in translate-y-0">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📊</span>
                    <p className="text-sm font-bold tracking-tight" style={{ color: 'var(--heading)' }}>{poll.title}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold shrink-0 ${poll.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' :
                    poll.status === 'passed' ? 'bg-blue-500/15 text-blue-400' :
                      'bg-red-500/15 text-red-400'
                    }`}>{poll.status}</span>
                </div>

                {/* General poll voting/results */}
                {poll.poll_type === 'General' ? (
                  <>
                    {poll.status === 'active' ? (
                      <GeneralPollVoting poll={poll} groupId={groupId} onVoted={fetchPolls} />
                    ) : (
                      <GeneralPollResults poll={poll} />
                    )}
                  </>
                ) : (
                  <>
                    <div className="h-2 rounded-full overflow-hidden my-3 flex shadow-inner" style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-500"
                        style={{ width: `${(poll.votes_for / Math.max(poll.votes_for + poll.votes_against, 1)) * 100}%` }} />
                      <div className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] transition-all duration-500"
                        style={{ width: `${(poll.votes_against / Math.max(poll.votes_for + poll.votes_against, 1)) * 100}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] mb-3 px-1 font-medium" style={{ color: 'var(--muted)' }}>
                      <span className="text-emerald-400">{poll.votes_for} For</span>
                      <span className="text-[10px] opacity-60">
                        {poll.status === 'active'
                          ? `Ends ${new Date(poll.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : `Ended ${new Date(poll.expires_at).toLocaleDateString()}`
                        }
                      </span>
                      <span className="text-red-400">{poll.votes_against} Against</span>
                    </div>
                    {poll.status === 'active' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleVote(poll.poll_id, true)} disabled={poll.has_voted && poll.user_vote === true}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${poll.has_voted && poll.user_vote === true ? 'bg-emerald-500 text-white shadow-lg' : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                            }`}>✓ For</button>
                        <button onClick={() => handleVote(poll.poll_id, false)} disabled={poll.has_voted && poll.user_vote === false}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${poll.has_voted && poll.user_vote === false ? 'bg-red-500 text-white shadow-lg' : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                            }`}>✗ Against</button>
                        {(group?.user_is_admin || group?.user_is_owner || poll.created_by === currentUserId) && (
                          <button
                            onClick={() => handleCancelPoll(poll.poll_id)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all shrink-0"
                            title="Cancel Poll"
                          >
                            <span>🗑️</span>
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Poll Creation Form - Overlay */}
        {showCreatePoll && (
          <div className="absolute inset-x-4 bottom-4 z-50 animate-slide-up pointer-events-auto">
            <div className="glass shadow-2xl rounded-3xl p-5 border border-white/20 backdrop-blur-3xl max-w-lg mx-auto overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-pink-500 to-violet-500" />
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  <h3 className="text-base font-bold tracking-tight" style={{ color: 'var(--heading)' }}>
                    New {selectedPollType?.replace('_', ' ')} Poll
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreatePoll(false)}
                  className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-black/10 transition-colors text-lg"
                >
                  ✕
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                <QuickPollForm
                  groupId={groupId}
                  initialType={selectedPollType || 'General'}
                  onSuccess={() => {
                    setShowCreatePoll(false);
                    fetchPolls();
                    fetchGroup();
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Message List */}
        <div className="px-4 py-6 space-y-3 min-h-full flex flex-col justify-end">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center opacity-50 py-20">
              <div className="text-center">
                <div className="text-5xl mb-4">💬</div>
                <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>No messages yet. Start the conversation!</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isMyMessage = !!msg.is_my_message;
              return (
                <MessageBubble
                  key={msg.message_id}
                  message={msg}
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
      </div>

      {/* Action Previews (Reply / Image) */}
      <div className="px-4 space-y-2">
        {replyingTo && (
          <div className="animate-slide-up">
            <div className="flex items-start gap-3 p-3 rounded-2xl glass border-l-4 border-coral shadow-lg">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--coral)' }}>
                  Replying to {replyingTo?.sender?.name || 'Unknown'}
                </p>
                <p className="text-sm truncate opacity-80" style={{ color: 'var(--heading)' }}>
                  {replyingTo?.encrypted_content || 'Image content'}
                </p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="w-6 h-6 rounded-full glass flex items-center justify-center shrink-0 hover:bg-black/10"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {imagePreview && (
          <div className="animate-slide-up">
            <div className="glass rounded-2xl p-3 flex items-center gap-4 shadow-lg border border-white/20">
              <div className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border border-white/10">
                <Image src={imagePreview as string} alt="Preview" fill className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold" style={{ color: 'var(--heading)' }}>Attachment</p>
                <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Ready to upload</p>
              </div>
              <button onClick={handleRemoveImage} className="w-8 h-8 rounded-full glass flex items-center justify-center text-red-400 hover:bg-red-500/10">✕</button>
            </div>
          </div>
        )}
      </div>

      {/* Emoji Picker Overlay */}
      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="absolute bottom-24 left-4 z-50 animate-fade-in">
          <div className="shadow-2xl rounded-2xl overflow-hidden border border-white/20">
            <EmojiPicker onEmojiClick={handleEmojiSelect} autoFocusSearch={false}
              theme={typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? Theme.DARK : Theme.LIGHT} />
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="glass-nav shrink-0 px-4 py-4 z-30">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-5xl mx-auto relative">

          {/* Poll Type Menu Popover */}
          {showPollTypeMenu && (
            <div ref={pollMenuRef} className="absolute bottom-16 left-0 glass-nav rounded-2xl p-2 w-52 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 animate-slide-up z-50">
              <p className="text-[10px] font-bold px-3 py-2 opacity-50 uppercase tracking-widest">Create Poll</p>
              {[
                { value: 'kick_member', label: '🚫 Kick Member', desc: 'Vote to remove someone' },
                { value: 'make_admin', label: '⭐ Make Admin', desc: 'Promote a member' },
                { value: 'remove_admin', label: '🔻 Remove Admin', desc: 'Demote an admin' },
                { value: 'General', label: '🗳️ General Poll', desc: 'Ask anything' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setSelectedPollType(opt.value);
                    setShowPollTypeMenu(false);
                    setShowCreatePoll(true);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl transition-all hover:bg-white/10 flex flex-col gap-0.5"
                >
                  <span className="text-xs font-bold" style={{ color: 'var(--heading)' }}>{opt.label}</span>
                  <span className="text-[9px] opacity-60" style={{ color: 'var(--muted)' }}>{opt.desc}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1">
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending || uploadingImage}
              className="w-11 h-11 rounded-2xl glass flex items-center justify-center text-xl transition-all hover:scale-105 active:scale-95" title="Upload image">
              📎
            </button>
            <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} disabled={sending || uploadingImage}
              className="w-11 h-11 rounded-2xl glass flex items-center justify-center text-xl transition-all hover:scale-105 active:scale-95" title="Emoji">
              😊
            </button>
            <button
              type="button"
              onClick={() => setShowPollTypeMenu(!showPollTypeMenu)}
              className={`w-11 h-11 rounded-2xl glass flex items-center justify-center text-xl transition-all hover:scale-105 active:scale-95 ${showPollTypeMenu ? 'bg-blue-500/20 shadow-inner scale-95' : ''}`}
              title="Polls"
            >
              📊
            </button>
          </div>

          <input ref={messageInputRef} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message…" className="input-romance flex-1 py-3 px-5 rounded-2xl shadow-inner text-sm" />

          <button type="submit" disabled={sending || uploadingImage || (!newMessage.trim() && !selectedImage)}
            className="btn-romance px-6 h-11 rounded-2xl font-bold transition-all hover:shadow-[0_0_20px_rgba(255,107,107,0.3)] disabled:opacity-50">
            {uploadingImage ? '↑' : sending ? '…' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Poll Sub-components ────────────────────────────────────────────────────────

function GeneralPollVoting({ poll, groupId, onVoted }: { poll: Poll, groupId: string, onVoted: () => void }) {
  const [selected, setSelected] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleVote = async () => {
    if (!selected) { toast.error('Select an option'); return; }
    setSubmitting(true);
    try {
      await groupService.voteOnPoll(groupId, poll.poll_id, undefined, selected);
      toast.success('Vote cast!');
      onVoted();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || 'Failed to vote');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1.5">
        {poll.options?.map((opt: PollOption) => (
          <button
            key={opt.option_id}
            type="button"
            disabled={submitting || poll.has_voted}
            onClick={() => setSelected(opt.option_id)}
            className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-all text-sm font-medium ${selected === opt.option_id
              ? 'bg-pink-500/10 border-pink-500/40 text-pink-400'
              : 'bg-white/5 border-transparent hover:bg-white/10'
              }`}
          >
            <span>{opt.option_text}</span>
            {selected === opt.option_id && <span className="text-[10px] animate-fade-in">●</span>}
            {poll.has_voted && poll.user_vote === opt.option_id && <span className="text-[10px] font-bold text-pink-400">YOUR VOTE</span>}
          </button>
        ))}
      </div>
      {!poll.has_voted && (
        <button onClick={handleVote} disabled={submitting || !selected}
          className="w-full py-2.5 rounded-xl bg-linear-to-r from-pink-500 to-violet-500 text-white text-xs font-bold shadow-lg shadow-pink-500/20 active:scale-95 transition-all disabled:opacity-40">
          {submitting ? 'Casting Vote…' : 'Cast Vote'}
        </button>
      )}
    </div>
  );
}

function GeneralPollResults({ poll }: { poll: Poll }) {
  const options: PollOption[] = poll.options ?? [];
  const totalVotes = options.reduce((sum, o) => sum + (o.votes || 0), 0);
  return (
    <div className="space-y-3 mt-1">
      {options.map((opt) => {
        const percentage = totalVotes ? ((opt.votes || 0) / totalVotes) * 100 : 0;
        return (
          <div key={opt.option_id} className="space-y-1">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span style={{ color: 'var(--heading)' }}>{opt.option_text}</span>
              <span className="text-pink-400">{opt.votes || 0} ({Math.round(percentage)}%)</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden shadow-inner">
              <div
                className="h-full bg-linear-to-r from-pink-500/80 to-violet-500/80 rounded-full transition-all duration-1000"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
      <div className="text-[10px] text-center font-bold tracking-widest uppercase opacity-40 mt-4" style={{ color: 'var(--muted)' }}>
        Total Votes: {totalVotes}
      </div>
    </div>
  );
}

// ─── Poll Creation Form Component ───────────────────────────────────────────────

interface GroupMember {
  user_id: string;
  name: string;
  roll_no: string;
  is_admin: boolean;
  is_owner: boolean;
  dp_url?: string;
  is_anonymous: boolean;
}

const MEMBER_POLL_TYPES = ['kick_member', 'make_admin', 'remove_admin'];

function QuickPollForm({ groupId, initialType = 'General', onSuccess }: { groupId: string; initialType?: string; onSuccess: () => void }) {
  const toast = useToast();

  const [pollType, setPollType] = useState(initialType);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [hours, setHours] = useState(6);
  const [targetId, setTargetId] = useState('');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [options, setOptions] = useState<string[]>(['', '']);

  const needsTarget = MEMBER_POLL_TYPES.includes(pollType);

  useEffect(() => {
    if (initialType) setPollType(initialType);
  }, [initialType]);

  useEffect(() => {
    if (!needsTarget) { setTargetId(''); return; }
    setLoadingMembers(true);
    groupService.getGroupMembers(groupId)
      .then(res => {
        const list: GroupMember[] = res.data?.members ?? res.data ?? [];
        const userStr = localStorage.getItem('user');
        const me = userStr ? JSON.parse(userStr).user_id : null;
        setMembers(list.filter(m => m.user_id !== me));
      })
      .catch(() => toast.error('Could not load members'))
      .finally(() => setLoadingMembers(false));
  }, [pollType, groupId, needsTarget, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsTarget && !targetId) {
      toast.error('Please select a member');
      return;
    }
    if (pollType === 'General') {
      const filtered = options.map(o => o.trim()).filter(Boolean);
      if (filtered.length < 2) {
        toast.error('Need at least 2 options');
        return;
      }
    }

    setSubmitting(true);
    try {
      await groupService.createPoll(groupId, {
        poll_type: pollType,
        title: title.trim() || (needsTarget ? `Action: ${pollType.replace('_', ' ')}` : 'Unnamed Poll'),
        description: desc.trim() || undefined,
        target_user_id: needsTarget ? targetId : undefined,
        expires_in_hours: hours,
        ...(pollType === 'General' ? { options: options.map(o => o.trim()).filter(Boolean) } : {})
      });
      toast.success('Poll live!');
      onSuccess();
      setTitle(''); setDesc(''); setTargetId(''); setHours(6); setOptions(['', '']);
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? 'Failed to create poll');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMember = members.find(m => m.user_id === targetId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Member Selection for specific polls */}
      {needsTarget && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Select Target Member</p>
          {loadingMembers ? (
            <div className="h-32 flex items-center justify-center bg-white/5 rounded-2xl animate-pulse">
              <span className="text-xs opacity-50">Loading directory…</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {members.map(member => (
                <button
                  key={member.user_id}
                  type="button"
                  onClick={() => setTargetId(member.user_id)}
                  className={`flex items-center gap-2 p-2 rounded-xl text-left border transition-all ${targetId === member.user_id ? 'bg-pink-500/20 border-pink-500/40' : 'bg-white/5 border-transparent hover:bg-white/10'
                    }`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-linear-to-br from-indigo-500 to-cyan-500 text-white text-[10px] font-bold shadow-lg">
                    {member.name?.[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold truncate tracking-tight">{member.name}</p>
                    <p className="text-[9px] opacity-60 truncate">{member.is_admin ? '🛡️ Admin' : 'Member'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* General Options UI */}
      {pollType === 'General' && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Poll Question & Options</p>
          <input
            type="text" required value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What's on your mind?"
            className="input-romance w-full text-sm py-3 px-4 rounded-xl"
          />
          <div className="space-y-2 mt-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text" required value={opt}
                  onChange={e => {
                    const arr = [...options];
                    arr[idx] = e.target.value;
                    setOptions(arr);
                  }}
                  placeholder={`Choice ${idx + 1}`}
                  className="input-romance flex-1 text-sm py-2 px-4 rounded-xl"
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => setOptions(options.filter((_, i) => i !== idx))} className="w-9 h-9 rounded-xl glass text-red-400">✕</button>
                )}
              </div>
            ))}
            <button
              type="button" onClick={() => setOptions([...options, ''])}
              className="w-full py-2 text-[10px] font-bold text-pink-400 uppercase tracking-widest border border-dashed border-pink-500/20 rounded-xl hover:bg-pink-500/5 transition-all"
            >
              + Add Choice
            </button>
          </div>
        </div>
      )}

      {/* Simple Text Fields for Role Polls */}
      {needsTarget && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Poll Reason</p>
          <input
            type="text" required value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={`Why should we ${pollType.split('_').join(' ')} ${selectedMember?.name ?? 'this user'}?`}
            className="input-romance w-full text-sm py-3 px-4 rounded-xl"
          />
        </div>
      )}

      {/* Extra Context */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Duration (1-24h)</p>
        <div className="flex items-center gap-4">
          <input
            type="range" min={1} max={24} value={hours}
            onChange={e => setHours(Number(e.target.value))}
            className="flex-1 accent-pink-500"
          />
          <span className="w-12 text-center text-sm font-bold bg-white/10 py-1 rounded-lg">{hours}h</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || (needsTarget && !targetId)}
        className="w-full py-4 rounded-2xl bg-linear-to-r from-pink-500 via-violet-500 to-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-40"
      >
        {submitting ? 'Deploying Poll…' : 'Start Global Poll'}
      </button>
    </form>
  );
}
