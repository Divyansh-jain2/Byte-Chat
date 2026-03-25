'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { chatService } from '@/services/chat.service';
import anonymousChatService from '@/services/anonymous-chat.service';
import { useSocket } from '@/contexts/SocketContext';
import { useToast } from '@/contexts/ToastContext';
import type { Message, User } from '@/types/chat.types';
import { Theme } from 'emoji-picker-react';
import Image from 'next/image';
import MessageBubble from '@/components/MessageBubble';
import { messageManagementService } from '@/services/message-management.service';
import { usePresence } from '@/hooks/usePresence';
import {
  encryptMessageAES,
  decryptMessageAES,
  generateAESKey,
  encryptKeyWithPublicKey,
  decryptKeyWithPrivateKey,
  // importPublicKey,
  importPrivateKey,
  exportKeyToBase64,
  importKeyFromBase64
} from '@/utils/e2ee.utils';

// Dynamic import for emoji picker (client-side only)
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });
type EmojiData = { emoji: string };

export default function ChatWindowPage() {
  const router = useRouter();
  const params = useParams();
  const { getSocket, isConnected, joinConversation, leaveConversation, sendTyping } = useSocket();
  const conversationId = params.conversationId as string;
  const toast = useToast();
  const socket = getSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [customName, setCustomName] = useState('');
  const [isViewingAnonymous, setIsViewingAnonymous] = useState(false);
  const [anonymousIdentityId, setAnonymousIdentityId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false); // Prevent duplicate fetches
  const lastFetchRef = useRef(0); // Track last fetch time
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // E2EE States
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null);
  const [keyId, setKeyId] = useState<string | null>(null);
  const [isE2EEReady, setIsE2EEReady] = useState(false);
  const [userPrivateKey, setUserPrivateKey] = useState<CryptoKey | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Track presence of the other user — only for non-anonymous chats
  const otherUserIds = useMemo(
    () => (!isAnonymous && otherUser?.user_id ? [otherUser.user_id] : []),
    [isAnonymous, otherUser?.user_id]
  );
  const onlineUsers = usePresence(otherUserIds);
  const isOtherOnline = !isAnonymous && !!otherUser?.user_id && onlineUsers.has(otherUser.user_id);

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

  // E2EE: Initialize session key
  const fetchAndDecryptConversationKey = useCallback(async (msgs: Message[]) => {
    try {
      const storedUser = localStorage.getItem('user');
      const decryptedPrivateKeyB64 = sessionStorage.getItem('decryptedPrivateKey');

      if (!decryptedPrivateKeyB64 || !storedUser) {
        console.warn('[E2EE] Private key missing from session storage');
        return null;
      }

      // const currentUserId = JSON.parse(storedUser).user_id;

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
        // Decrypt the session key to getting the base64 version
        try {
          console.log('[DEBUG] Decrypting session key for msg:', msgWithKey.message_id);
          const aesKeyB64 = await decryptKeyWithPrivateKey(privKey, msgWithKey.user_session_key);
          const aesKey = await importKeyFromBase64(aesKeyB64);
          console.log('[DEBUG] Session key decrypted successfully');
          setSessionKey(aesKey);
          setKeyId(msgWithKey.key_id);
          setIsE2EEReady(true);
          return aesKey;
        } catch (err) {
          console.error('[E2EE] Failed to decrypt session key:', err);
        }
      }

      // If no key found in messages, or decryption failed, try to initialize a new one
      // But only if we have participants' public keys
      const info = await chatService.getParticipantPublicKeys(conversationId);
      const participants = info.participants;

      // Generate new AES key
      const newAesKey = await generateAESKey();

      // Export new AES key to base64 for encryption
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
        conversationId,
        keys: encryptedKeys
      });

      setSessionKey(newAesKey);
      setKeyId(newKeyId);
      setIsE2EEReady(true);
      return newAesKey;
    } catch (error) {
      console.error('[E2EE] Session initialization failed:', error);
    }
  }, [conversationId, isAnonymous, userPrivateKey]);

  const decryptMessages = useCallback(async (msgs: Message[], aesKey: CryptoKey) => {
    console.log('[DEBUG] Starting decryptMessages for', msgs.length, 'messages');
    return await Promise.all(msgs.map(async (m) => {
      let decryptedMsg = { ...m };

      if (m.encrypted_content && m.encrypted_content.length < 50) {
        console.log('[DEBUG] msg to decrypt:', m.message_id, 'iv:', !!m.content_iv, 'tag:', !!m.content_auth_tag);
      }

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
          console.warn(`[E2EE] Failed to decrypt message ${m.message_id}:`, {
            err,
            content: m.encrypted_content?.substring(0, 10),
            iv: m.content_iv,
            tag: m.content_auth_tag
          });
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
          decryptedMsg.parent_message = {
            ...m.parent_message,
            encrypted_content: '[Encrypted Quote]'
          };
        }
      }

      return decryptedMsg;
    }));
  }, []);

  const fetchMessages = useCallback(async () => {
    // Prevent duplicate fetches (debounce 500ms)
    const now = Date.now();
    if (fetchingRef.current || now - lastFetchRef.current < 500) {
      return;
    }

    fetchingRef.current = true;
    lastFetchRef.current = now;

    try {
      let response;
      let conversationType: 'regular' | 'anonymous' = 'regular';

      try {
        // 1. First get participants and conversation type to avoid 403 console errors
        console.log('[DEBUG] Fetching metadata for:', conversationId);
        const info = await chatService.getParticipantPublicKeys(conversationId);
        conversationType = info.isAnonymous ? 'anonymous' : 'regular';

        if (conversationType === 'anonymous') {
          console.log('[DEBUG] Calling anonymous service');
          response = await anonymousChatService.getAnonymousMessages(conversationId);
        } else {
          console.log('[DEBUG] Calling regular service');
          response = await chatService.getMessages(conversationId);
        }
      }
      catch (fetchError: any) {
        console.error('[ERROR] Initial fetch failed:', fetchError);
        // Fallback or rethrow
        throw fetchError;
      }

      let fetchedMessages = Array.isArray(response) ? response : (response.messages || []);
      console.log('[DEBUG] fetchedMessages count:', fetchedMessages.length);
      if (fetchedMessages.length > 0) {
        console.log('[DEBUG] First message keys:', Object.keys(fetchedMessages[0]));
      }
      setIsAnonymous(conversationType === 'anonymous');

      // E2EE handling - Enable for BOTH regular and anonymous
      // Initialize even if 0 messages so the first message can be encrypted
      console.log('[DEBUG] Initializing E2EE for chat, msgs count:', fetchedMessages.length);
      const aesKey = await fetchAndDecryptConversationKey(fetchedMessages);
      if (aesKey) {
        console.log('[DEBUG] Decrypting messages with key');
        fetchedMessages = await decryptMessages(fetchedMessages, aesKey);
      } else {
        console.log('[DEBUG] No AES key available for decryption');
      }

      setMessages(fetchedMessages);

      if (response.otherUser) {
        setOtherUser(response.otherUser);
        if (conversationType === 'anonymous' && response.otherUser.is_anonymous) {
          setIsViewingAnonymous(true);
          setAnonymousIdentityId(response.otherUser.identity_id || null);
          setCustomName(response.otherUser.name || '');
        } else {
          setIsViewingAnonymous(false);
          setAnonymousIdentityId(null);
          setCustomName('');
        }
      }

      if (response.conversation) {
        setIsBlocked(response.conversation.is_blocked || false);
      }
    }
    catch (error: any) {
      if (error.response?.status !== 429) {
        console.error('[ERROR] Failed to fetch messages:', error);
        if (error.response?.status === 403) {
          toast.error('You do not have access to this conversation.');
          router.push('/chat');
        } else if (error.response?.status === 404) {
          toast.error('Conversation not found.');
          router.push('/chat');
        }
      }
    }
    finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [conversationId, router, toast, fetchAndDecryptConversationKey, decryptMessages]);

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
  }, [conversationId, fetchMessages, joinConversation, isConnected, leaveConversation, loading]);

  // Socket event listeners for message management
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleMessageReaction = (data: { messageId: string }) => {
      // Refresh messages to show updated reactions
      fetchMessages();
      console.log(data);
    };

    const handleMessageEdited = async (data: {
      messageId: string;
      encryptedContent: string;
      contentIv?: string;
      contentAuthTag?: string;
    }) => {
      let finalContent = data.encryptedContent;

      // Decrypt if E2EE is active and metadata is present
      if (sessionKey && data.contentIv && data.contentAuthTag) {
        try {
          finalContent = await decryptMessageAES(
            data.encryptedContent,
            data.contentIv,
            data.contentAuthTag,
            sessionKey
          );
        } catch (err) {
          console.error('[E2EE] Failed to decrypt socket edit:', err);
        }
      }

      setMessages(prev =>
        prev.map(msg =>
          msg.message_id === data.messageId
            ? { ...msg, encrypted_content: finalContent, is_edited: true, edited_at: new Date() }
            : msg
        )
      );
    };

    const handleMessageDeleted = (data: { messageId: string; deleteForEveryone: boolean; deletedForUserId?: string }) => {
      if (data.deleteForEveryone) {
        // Remove for everyone
        setMessages(prev => prev.filter(msg => msg.message_id !== data.messageId));
      } else if (data.deletedForUserId) {
        // Remove only for the user who deleted it
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
      socket.off('message:reaction', handleMessageReaction);
      socket.off('message:edited', handleMessageEdited);
      socket.off('message:deleted', handleMessageDeleted);
    };
  }, [socket, conversationId, fetchMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!newMessage.trim() && !selectedImage) || sending || isBlocked) return;

    // Send typing stopped event
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    sendTyping(conversationId, false);

    try {
      setSending(true);

      let mediaUrl = '';
      let mediaSize = 0;
      let mediaMimeType = '';

      // Upload image if selected
      if (selectedImage) {
        setUploadingImage(true);
        try {
          const uploadResult = isAnonymous
            ? await anonymousChatService.uploadAnonymousImage(selectedImage)
            : await chatService.uploadImage(selectedImage);

          mediaUrl = uploadResult.data.url;
          mediaSize = uploadResult.data.size;
          mediaMimeType = uploadResult.data.mimeType;
        }
        catch (uploadError: unknown) {
          let errorMsg = 'Failed to upload image';
          if (
            typeof uploadError === 'object' &&
            uploadError !== null &&
            'response' in uploadError &&
            typeof (uploadError as { response?: { data?: { message?: string } } }).response === 'object'
          ) {
            errorMsg = (uploadError as { response: { data?: { message?: string } } }).response.data?.message || errorMsg;
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

      let finalContent = newMessage.trim() || 'Image';
      let contentIv = 'dummy_iv';
      let contentAuthTag = 'dummy_tag';

      // E2EE: Encrypt message content
      if (isE2EEReady && sessionKey) {
        try {
          const { ciphertext, iv, authTag } = await encryptMessageAES(finalContent, sessionKey);
          finalContent = ciphertext;
          contentIv = iv;
          contentAuthTag = authTag;
        }
        catch (err) {
          console.error('[E2EE] Encryption failed:', err);
          toast.error('Failed to encrypt message securely');
          setSending(false);
          return;
        }
      }

      const messageData = {
        conversationId: conversationId,
        encryptedContent: finalContent,
        contentIv,
        contentAuthTag,
        messageType: selectedImage ? 'image' : 'text',
        ...(mediaUrl && {
          mediaUrl,
          mediaSize,
          mediaMimeType,
        }),
        ...(replyingTo && {
          parentMessageId: replyingTo.message_id,
        }),
        keyId: keyId || undefined
      };

      // Use the correct service based on conversation type
      if (isAnonymous) {
        await anonymousChatService.sendAnonymousMessage(messageData);
      } else {
        await chatService.sendMessage(messageData);
      }

      // Clear states AFTER successful send
      setNewMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      setReplyingTo(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchMessages(); // Refresh messages
    }
    catch (error: unknown) {
      console.error('[ERROR] Failed to send message:', error);
      let errorMessage = 'Failed to send message';
      let status: number | undefined;

      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: unknown }).response === 'object'
      ) {
        const response = (error as { response: { data?: { message?: string }, status?: number } }).response;
        errorMessage = response.data?.message || errorMessage;
        status = response.status;
      }

      // Check if it's a blocking error
      if (errorMessage.includes('blocked') || status === 403) {
        toast.error('Cannot send message - this user is blocked or has blocked you.');
        setIsBlocked(true);
      } else {
        toast.error(errorMessage);
      }
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

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (isConnected) {
      sendTyping(conversationId, true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(conversationId, false);
      }, 2000);
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

  // Message management handlers
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

      let finalContent = newContent;
      let contentIv = 'dummy_iv';
      let contentAuthTag = 'dummy_tag';

      // E2EE: Encrypt edited message content
      if (isE2EEReady && sessionKey) {
        try {
          const { ciphertext, iv, authTag } = await encryptMessageAES(newContent, sessionKey);
          finalContent = ciphertext;
          contentIv = iv;
          contentAuthTag = authTag;
        } catch (err) {
          console.error('[E2EE] Edit encryption failed:', err);
          toast.error('Failed to encrypt edited message');
          return;
        }
      }

      await messageManagementService.editMessage(
        messageId,
        finalContent,
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
  }, [fetchMessages, toast, isAnonymous, isE2EEReady, sessionKey]);

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

  const handleRevealIdentity = async () => {
    if (!confirm('Are you sure you want to reveal your identity? This cannot be undone.')) {
      return;
    }

    try {
      await anonymousChatService.revealAnonymousIdentity(conversationId);
      setIsAnonymous(false);
      toast.success('Your identity has been revealed!');
      fetchMessages();
    }
    catch (error: unknown) {
      let errorMsg = 'Failed to reveal Identity';
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: unknown }).response === 'object'
      ) {
        const response = (error as { response: { data?: { message?: string } } }).response;
        errorMsg = response.data?.message || errorMsg;
      }
      toast.error(errorMsg);
    }
  };

  const handleUpdateCustomName = async () => {
    if (!anonymousIdentityId) {
      toast.error('Cannot update name - identity ID not found');
      return;
    }

    const trimmedName = customName.trim();

    // Validate name
    if (trimmedName.length === 0) {
      toast.warning('Custom name cannot be empty');
      return;
    }
    if (trimmedName.length > 44) {
      toast.error('Custom name must be less than 44 characters (5 chars reserved for uniqueness)');
      return;
    }

    try {
      await anonymousChatService.updateAnonymousName(
        anonymousIdentityId,
        trimmedName
      );

      // Reload messages to get the updated name with random suffix
      await fetchMessages();

      setShowEditNameDialog(false);
      setShowMenu(false);
      toast.success('Custom name updated successfully');
    }
    catch (error: unknown) {
      let errorMsg = 'Failed to update custom name';
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: unknown }).response === 'object'
      ) {
        const response = (error as { response: { data?: { message?: string } } }).response;
        errorMsg = response.data?.message || errorMsg;
      }
      toast.error(errorMsg);
    }
  };

  // Listen for new messages via socket
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = async (message: Message) => {
      // Add is_my_message flag
      const userStr = localStorage.getItem('user');
      const currentUserId = userStr ? JSON.parse(userStr).user_id : null;

      let processedMessage = {
        ...message,
        is_my_message: message.sender_id === currentUserId,
      };

      // Decrypt if E2EE is ready
      if (sessionKey) {
        const decryptedArray = await decryptMessages([processedMessage], sessionKey);
        processedMessage = decryptedArray[0];
      }

      setMessages((prev) => [...prev, processedMessage]);
    };

    const handleTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      const userStr = localStorage.getItem('user');
      const currentUserId = userStr ? JSON.parse(userStr).user_id : null;
      if (userId !== currentUserId) {
        setIsOtherTyping(isTyping);
      }
      // console.log(`User ${userId} is ${isTyping ? 'typing' : 'not typing'}`);
    };

    const handleIdentityRevealed = () => {
      // Refresh messages when identity is revealed
      setIsAnonymous(false);
      fetchMessages();
    };

    const handleUserBlocked = () => {
      setIsBlocked(true);
      toast.warning('This conversation has been blocked');
    };

    const handleConversationUnblocked = ({ canMessageNow }: { conversationId: string; canMessageNow: boolean; unblockedBy: string }) => {
      setIsBlocked(false);
      console.log('🔓 Conversation unblocked - you can now send messages', canMessageNow);
      // Refresh conversation to get latest state
      fetchMessages();
    };

    const handleConversationStillBlocked = ({ blockedBy }: { conversationId: string; blockedBy: string }) => {
      console.log('⚠️ Conversation still blocked by other user', blockedBy);
      // Refresh conversation to get latest state
      fetchMessages();
    };

    socket.on('new-message', handleNewMessage);
    socket.on('user-typing', handleTyping);
    socket.on('identity-revealed', handleIdentityRevealed);
    socket.on('user-blocked', handleUserBlocked);
    socket.on('conversation-unblocked', handleConversationUnblocked);
    socket.on('conversation-still-blocked', handleConversationStillBlocked);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('user-typing', handleTyping);
      socket.off('identity-revealed', handleIdentityRevealed);
      socket.off('user-blocked', handleUserBlocked);
      socket.off('conversation-unblocked', handleConversationUnblocked);
      socket.off('conversation-still-blocked', handleConversationStillBlocked);
    };
  }, [socket, toast, fetchMessages]);


  const handleBlockUser = async () => {
    if (!confirm('Are you sure you want to block this user? You will not be able to send or receive messages.')) {
      return;
    }

    try {
      await chatService.blockUser(conversationId);
      setIsBlocked(true);
      setShowMenu(false);
      toast.success('User blocked successfully');
    }
    catch (error: unknown) {
      let errorMsg = 'Failed to block user';
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: unknown }).response === 'object'
      ) {
        const response = (error as { response: { data?: { message?: string } } }).response;
        errorMsg = response.data?.message || errorMsg;
      }
      toast.error(errorMsg);
    }
  };

  const handleReportUser = async () => {
    if (!reportReason.trim()) {
      toast.warning('Please provide a reason for reporting');
      return;
    }

    try {
      // For anonymous users, we need to get the actual user_id from conversations
      let actualReportedUserId = otherUser?.user_id;

      // If other user is anonymous (user_id is null), we need to report via conversation
      if (isAnonymous && !actualReportedUserId) {
        // console.log('🎭 Reporting anonymous user - using conversation ID to identify');
        // For anonymous users, backend will extract the actual user_id from the conversation
        actualReportedUserId = 'ANONYMOUS'; // Special marker - backend will resolve
      }

      if (!actualReportedUserId && actualReportedUserId !== 'ANONYMOUS') {
        toast.error('Unable to identify user to report');
        return;
      }

      // Get last message from reported user for context
      const lastMessageFromReported = messages
        .filter(m => !m.is_my_message)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      // Build comprehensive description with context
      const contextualDescription = `
        === REPORT DETAILS ===
        Report Type: ${reportReason}
        User Description: ${reportDescription || 'No additional details provided'}

        === REPORTED USER INFO ===
        Name: ${otherUser?.name || 'Anonymous User'}
        Roll No: ${otherUser?.roll_no || 'N/A (Anonymous)'}
        Gender: ${otherUser?.gender || otherUser?.gender || 'N/A'}
        Is Anonymous: ${isAnonymous ? 'Yes' : 'No'}

        === CONVERSATION CONTEXT ===
        Conversation ID: ${conversationId}
        Total Messages: ${messages.length}
        Messages from Reported User: ${messages.filter(m => !m.is_my_message).length}
        Conversation Type: ${isAnonymous ? 'Anonymous' : 'Regular'}

        === LAST MESSAGE FROM REPORTED USER ===
        ${lastMessageFromReported ? `Message ID: ${lastMessageFromReported.message_id}
        Timestamp: ${new Date(lastMessageFromReported.created_at).toLocaleString()}
        Message Type: ${lastMessageFromReported.message_type || 'text'}` : 'No messages from this user'}

        === TIMESTAMP ===
        Reported At: ${new Date().toISOString()}
        `.trim();

      await chatService.reportUser({
        reportedUserId: actualReportedUserId,
        conversationId,  // IMPORTANT: Backend uses this to resolve anonymous user_id
        reportType: reportReason,
        reason: reportReason,  // Backward compatibility
        description: contextualDescription,
        messageId: lastMessageFromReported?.message_id,
        evidenceUrls: [],
      });

      setShowReportDialog(false);
      setShowMenu(false);
      setReportReason('');
      setReportDescription('');
      toast.success('Report submitted successfully. Our team will review it.');
    }
    catch (error: unknown) {
      let errorMsg = 'Failed to submit report';
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: unknown }).response === 'object'
      ) {
        const response = (error as { response: { data?: { message?: string } } }).response;
        errorMsg = response.data?.message || errorMsg;
      }
      toast.error(errorMsg);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-mesh-warm flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-14 h-14 rounded-full border-4 mx-auto mb-4 animate-spin" style={{ borderColor: 'var(--pink)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading chat…</p>
          {loadingTimeout && (
            <div className="mt-5 space-y-3">
              <p className="text-sm" style={{ color: 'var(--coral)' }}>Taking longer than expected…</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => { setLoading(true); setLoadingTimeout(false); fetchMessages(); }} className="btn-romance px-4 py-2 text-sm">Try Again</button>
                <button onClick={() => router.push('/chat')} className="btn-ghost px-4 py-2 text-sm">← Back</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-mesh-warm antialiased flex flex-col">
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-80 h-80 bg-linear-to-br from-pink-300/10 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Chat Header */}
      <div className="glass-nav shrink-0 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => router.push('/chat')} className="w-9 h-9 rounded-xl glass flex items-center justify-center shrink-0 transition-all hover:scale-105" style={{ color: 'var(--body)' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar with online dot */}
          <div className="relative shrink-0">
            {(isAnonymous || !otherUser?.dp_url) ? (
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: isAnonymous ? 'var(--grad-mystery)' : 'var(--grad-romance)' }}>
                {isAnonymous ? '?' : (otherUser?.name?.[0]?.toUpperCase() || 'U')}
              </div>
            ) : (
              <Image src={otherUser.dp_url} alt={otherUser.name} width={40} height={40} className="w-10 h-10 rounded-full object-cover ring-2 ring-white/40" />
            )}
            {/* Green online dot */}
            {isOtherOnline && (
              <span
                className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
                style={{ background: '#22C55E' }}
              />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="font-bold truncate flex items-center gap-2" style={{ color: 'var(--heading)' }}>
              {otherUser?.name || 'Unknown'}
              {isAnonymous && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(168,85,247,.15)', color: 'var(--purple)' }}>Anon</span>}
            </h2>
            {/* Online/Offline status line */}
            {!isAnonymous && (
              isOtherOnline ? (
                <p className="text-xs font-medium flex items-center gap-1" style={{ color: '#22C55E' }}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Online
                </p>
              ) : (
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {otherUser?.roll_no || 'Offline'}
                </p>
              )
            )}
            {isAnonymous && otherUser?.gender && <p className="text-xs" style={{ color: 'var(--muted)' }}>{otherUser.gender}</p>}
          </div>
        </div>

        {/* Action menu */}
        <div className="relative shrink-0">
          <button onClick={() => setShowMenu(!showMenu)} className="w-9 h-9 rounded-xl glass flex items-center justify-center transition-all hover:scale-105" style={{ color: 'var(--body)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-52 glass-strong rounded-2xl py-2 z-50 shadow-xl">
              {isAnonymous && (
                <button onClick={handleRevealIdentity} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-70 transition-opacity" style={{ color: 'var(--body)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  Reveal Identity
                </button>
              )}
              {isViewingAnonymous && anonymousIdentityId && (
                <button onClick={() => { setShowEditNameDialog(true); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-70" style={{ color: 'var(--body)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit Name
                </button>
              )}
              <button onClick={handleBlockUser} disabled={isBlocked} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-70 disabled:opacity-40" style={{ color: '#EF4444' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                {isBlocked ? 'Blocked' : 'Block User'}
              </button>
              <button onClick={() => { setShowReportDialog(true); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:opacity-70" style={{ color: '#F97316' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Report User
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Report Dialog */}
      {showReportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-strong rounded-3xl p-7 w-full max-w-md animate-scale-in">
            <h3 className="text-lg font-bold mb-5" style={{ color: 'var(--heading)' }}>Report User ⚠️</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--heading)' }}>Reason *</label>
                <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="select-romance">
                  <option value="">Select a reason</option>
                  <option value="spam">Spam</option>
                  <option value="harassment">Harassment</option>
                  <option value="inappropriate_content">Inappropriate Content</option>
                  <option value="fake_profile">Fake Profile</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--heading)' }}>Additional details (optional)</label>
                <textarea value={reportDescription} onChange={(e) => setReportDescription(e.target.value)} rows={3} className="input-romance resize-none" placeholder="Describe the issue…" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowReportDialog(false); setReportReason(''); setReportDescription(''); }} className="flex-1 py-2.5 rounded-2xl text-sm font-semibold glass" style={{ color: 'var(--body)' }}>Cancel</button>
              <button onClick={handleReportUser} disabled={!reportReason} className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#EF4444' }}>Submit Report</button>
            </div>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-5xl mb-3">👋</p>
              <p className="font-semibold" style={{ color: 'var(--heading)' }}>Say hello!</p>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Start the conversation</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isMyMessage = message.is_my_message;
              return (
                <MessageBubble
                  key={message.message_id}
                  message={message}
                  isMyMessage={isMyMessage}
                  onReply={handleReply}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  formatTime={formatTime}
                />
              );
            })}
            {isOtherTyping && (
              <div className="flex animate-fade-in my-2">
                <div className="glass-strong rounded-2xl px-4 py-3 flex gap-1 bg-white/5 items-center w-fit">
                  <span className="typing-dot" style={{ background: 'var(--muted)', width: 6, height: 6, borderRadius: '50%' }} />
                  <span className="typing-dot" style={{ background: 'var(--muted)', width: 6, height: 6, borderRadius: '50%' }} />
                  <span className="typing-dot" style={{ background: 'var(--muted)', width: 6, height: 6, borderRadius: '50%' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input bar */}
      <div className="glass-nav shrink-0 px-4 py-3">
        {isBlocked ? (
          <div className="text-center py-3">
            <p className="text-sm font-medium" style={{ color: '#EF4444' }}>🚫 This conversation is blocked. You cannot send messages.</p>
          </div>
        ) : (
          <>
            {/* Reply preview */}
            {replyingTo && (
              <div className="mb-3 flex items-start gap-2 p-3 rounded-xl glass" style={{ borderLeft: '3px solid var(--pink)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--pink)' }}>
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
            )}
            {imagePreview && (
              <div className="mb-3 relative inline-block">
                <Image src={imagePreview} alt="Preview" width={120} height={80} className="max-h-20 rounded-xl border" style={{ borderColor: 'var(--border-light)' }} />
                <button onClick={handleRemoveImage} className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-white flex items-center justify-center text-xs" style={{ background: '#EF4444' }}>✕</button>
              </div>
            )}
            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="absolute bottom-20 left-4 z-50">
                <EmojiPicker onEmojiClick={handleEmojiSelect} autoFocusSearch={false} theme={typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? Theme.DARK : Theme.LIGHT} />
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending || uploadingImage} className="w-9 h-9 rounded-xl glass flex items-center justify-center shrink-0 transition-all hover:scale-110 disabled:opacity-50" style={{ color: 'var(--muted)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
              <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} disabled={sending || uploadingImage} className="w-9 h-9 rounded-xl glass flex items-center justify-center shrink-0 transition-all hover:scale-110 disabled:opacity-50" style={{ color: 'var(--muted)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
              <input ref={messageInputRef} type="text" value={newMessage} onChange={handleMessageChange} placeholder="Type a message…" className="input-romance flex-1 py-2.5" disabled={sending || uploadingImage} />
              <button type="submit" disabled={(!newMessage.trim() && !selectedImage) || sending || uploadingImage} className="w-10 h-10 rounded-xl btn-romance flex items-center justify-center shrink-0 disabled:opacity-50">
                {(sending || uploadingImage) ? (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                ) : (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                )}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Edit Name Dialog */}
      {showEditNameDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-strong rounded-3xl p-7 w-full max-w-sm animate-scale-in">
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--heading)' }}>Edit Custom Name ✏️</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Set a nickname for this anonymous sender.</p>
            <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder={otherUser?.name || 'Custom name'} maxLength={50} className="input-romance mb-1" />
            <p className="text-xs mb-5 text-right" style={{ color: 'var(--muted)' }}>{customName.length}/50</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowEditNameDialog(false); setCustomName(otherUser?.name || ''); }} className="flex-1 py-2.5 rounded-2xl text-sm font-semibold glass" style={{ color: 'var(--body)' }}>Cancel</button>
              <button onClick={handleUpdateCustomName} className="flex-1 py-2.5 rounded-2xl text-sm font-semibold btn-romance">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
