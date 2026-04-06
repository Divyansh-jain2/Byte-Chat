'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { messageManagementService } from '@/services/message-management.service';
import { useToast } from '@/contexts/ToastContext';
import { Theme } from 'emoji-picker-react';

const FullEmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });
type EmojiData = { emoji: string };

type MessageReaction = {
  emoji: string;
  count: number;
  users?: Array<{ user_id: string; name: string }>;
};

interface MessageProps {
  message: {
    message_id: string;
    encrypted_content?: string;
    message_type: string;
    media_url?: string;
    created_at: Date | string;
    sender?: { name: string; is_anonymous?: boolean; display_gender?: string };
    sender_id: string;
    parent_message_id?: string;
    parent_message?: { encrypted_content?: string; sender?: { name: string } };
    is_edited?: boolean;
    reactions?: MessageReaction[];
  };
  isMyMessage: boolean;
  onReply?: (message: MessageProps['message']) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string, deleteForEveryone: boolean) => void;
  formatTime: (time: string) => string;
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥'];

export default function MessageBubble({
  message,
  isMyMessage,
  onReply,
  onEdit,
  onDelete,
  formatTime
}: MessageProps) {
  const toast = useToast();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  const [reactions, setReactions] = useState<MessageReaction[]>(message.reactions || []);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.encrypted_content || '');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fullEmojiPickerRef = useRef<HTMLDivElement>(null);

  // Close quick-emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showEmojiPicker]);

  // Close full emoji picker on outside click
  useEffect(() => {
    if (!showFullEmojiPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (fullEmojiPickerRef.current && !fullEmojiPickerRef.current.contains(e.target as Node)) {
        setShowFullEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showFullEmojiPicker]);

  // Sync editContent when message updates (important for E2EE decryption)
  // useEffect(() => {
  //   if (isEditing) {
  //     setEditContent(message.encrypted_content || '');
  //   }
  // }, [isEditing, message.encrypted_content]);

  useEffect(() => {
    if (isEditing) {
      setEditContent(message.encrypted_content || '');
    }
    // Only run when isEditing transitions to true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing && message.encrypted_content]);

  const handleReaction = useCallback(async (emoji: string) => {
    // console.log('[MessageBubble] Reaction clicked:', emoji);
    try {
      const userStr = localStorage.getItem('user');

      // console.log('[MessageBubble] Raw user string:', userStr);

      const currentUser = userStr ? JSON.parse(userStr) : null;
      // Support both user_id (snake_case from backend) and userId (camelCase)
      const currentUserId = currentUser?.user_id || currentUser?.userId;

      // console.log('[MessageBubble] Parsed user:', currentUser);
      // console.log('[MessageBubble] Token:', token ? 'Present' : 'Missing');
      // console.log('[MessageBubble] User ID:', currentUserId);

      if (!currentUserId) {
        // console.error('[MessageBubble] No user ID found. User object:', currentUser);
        alert('Please log out and log in again to fix your session');
        return;
      }

      const userReacted = reactions.find(r =>
        r.emoji === emoji && r.users?.some(u => u.user_id === currentUserId)
      );

      // console.log('[MessageBubble] User reacted:', userReacted ? 'Yes - removing' : 'No - adding');
      // console.log('[MessageBubble] Message ID:', message.message_id);

      if (userReacted) {
        console.log('[MessageBubble] Calling removeReaction API...');
        const result = await messageManagementService.removeReaction(message.message_id, emoji, '');
        console.log('[MessageBubble] Remove reaction result:', result);
        setReactions(prev =>
          prev.map(r => r.emoji === emoji
            ? { ...r, count: r.count - 1, users: r.users?.filter(u => u.user_id !== currentUserId) }
            : r
          ).filter(r => r.count > 0)
        );
      } else {
        console.log('[MessageBubble] Calling addReaction API...');
        const result = await messageManagementService.addReaction(message.message_id, emoji, '');
        console.log('[MessageBubble] Add reaction result:', result);
        setReactions(prev => {
          const existing = prev.find(r => r.emoji === emoji);
          if (existing) {
            return prev.map(r => r.emoji === emoji
              ? { ...r, count: r.count + 1, users: [...(r.users || []), { user_id: currentUserId, name: currentUser.name || 'You' }] }
              : r
            );
          }
          return [...prev, { emoji, count: 1, users: [{ user_id: currentUserId, name: currentUser.name || 'You' }] }];
        });
      }
      setShowEmojiPicker(false);
      console.log('[MessageBubble] Reaction successful!');
    } 
    
    // catch (error: any) {
    //   const msg = error?.response?.data?.message || error?.message || 'Unknown error';
    //   toast?.error?.(`Reaction failed: ${msg}`);
    // }

    catch (error: unknown) {
      let msg = 'Unknown error';
      function isAxiosError(err: unknown): err is { response: { data: { message?: string } } } {
        return (
          typeof err === 'object' &&
          err !== null &&
          'response' in err &&
          typeof (err as { response: unknown }).response === 'object' &&
          (err as { response: unknown }).response !== null &&
          'data' in (err as { response: { data: unknown } }).response &&
          typeof (err as { response: { data: unknown } }).response.data === 'object' &&
          (err as { response: { data: unknown } }).response.data !== null
        );
      }

      if (isAxiosError(error) && 'message' in error.response.data) {
        msg = (error.response.data.message as string) || msg;
      } 
      else if (error instanceof Error && error.message) {
        msg = error.message;
      }
      toast?.error?.(`Reaction failed: ${msg}`);
    }
  }, [reactions, message.message_id, toast]);

  const handleEditMessage = async () => {
    if (!editContent.trim() || editContent === message.encrypted_content) {
      setIsEditing(false);
      return;
    }
    try {
      if (onEdit) onEdit(message.message_id, editContent);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleDeleteMessage = async (deleteForEveryone: boolean) => {
    try {
      if (onDelete) onDelete(message.message_id, deleteForEveryone);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  // const canDeleteForEveryone = useMemo(() => {
  //   if (!isMyMessage) return false;
  //   const messageAge = Date.now() - new Date(message.created_at).getTime();
  //   return messageAge <= 48 * 60 * 60 * 1000;
  // }, [isMyMessage, message.created_at]);

  const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
      const interval = setInterval(() => setNow(Date.now()), 60 * 1000);
      return () => clearInterval(interval);
    }, []);

  const messageAge = now - new Date(message.created_at).getTime();
  const canDeleteForEveryone = isMyMessage && messageAge <= 48 * 60 * 60 * 1000;

  // ── Quick-emoji strip ───────────────────────────────────────────────────────────
  const QuickEmojiStrip = showEmojiPicker && (
    <div
      ref={emojiPickerRef}
      className="absolute z-50 glass-strong rounded-xl p-2 shadow-xl flex gap-1 animate-scale-in"
      style={{
        bottom: '100%',
        marginBottom: '8px',
        [isMyMessage ? 'right' : 'left']: '0'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {EMOJI_OPTIONS.map(emoji => (
        <button
          key={emoji}
          onClick={() => {
            handleReaction(emoji);
            setShowEmojiPicker(false);
          }}
          className="w-9 h-9 rounded-xl text-xl flex items-center justify-center hover:scale-125 active:scale-95 transition-transform hover:bg-white/10"
        >
          {emoji}
        </button>
      ))}
      {/* ➕ Open full emoji picker */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowEmojiPicker(false);
          setShowFullEmojiPicker(true);
        }}
        title="More emojis"
        className="w-9 h-9 rounded-xl text-base flex items-center justify-center hover:scale-125 active:scale-95 transition-transform hover:bg-white/10"
        style={{ color: 'var(--muted)' }}
      >
        ➕
      </button>
    </div>
  );

  // ── Full emoji picker (emoji-picker-react) ──────────────────────────────────────
  const FullEmojiPickerOverlay = showFullEmojiPicker && (
    <div
      ref={fullEmojiPickerRef}
      className="absolute z-50 animate-scale-in"
      style={{
        bottom: '100%',
        marginBottom: '8px',
        [isMyMessage ? 'right' : 'left']: '0',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <FullEmojiPicker
        onEmojiClick={(emojiData: EmojiData) => {
          handleReaction(emojiData.emoji);
          setShowFullEmojiPicker(false);
        }}
        autoFocusSearch={false}
        theme={typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? Theme.DARK : Theme.LIGHT}
        height={380}
        width={320}
      />
    </div>
  );

  return (
    <>
      <div className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} group relative mb-1`}>

        {/* ── Action bar — appears on group-hover ─────────────────────── */}
        <div className={`flex items-center gap-0.5 self-center shrink-0 transition-all duration-150
          opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto
          ${isMyMessage ? 'order-first mr-1.5' : 'order-last ml-1.5'}`}
        >
          {/* Emoji react */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('[MessageBubble] Emoji button clicked');
              setShowEmojiPicker(prev => !prev);
            }}
            title="React"
            className="w-7 h-7 rounded-full glass flex items-center justify-center text-base hover:scale-110 active:scale-95 transition-transform"
            style={{ color: 'var(--muted)' }}
          >
            😊
          </button>

          {/* Reply — always */}
          {onReply && (
            <button
              onClick={(e) => { e.stopPropagation(); onReply(message); }}
              title="Reply"
              className="w-7 h-7 rounded-full glass flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
              style={{ color: 'var(--muted)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
          )}

          {/* Edit — own messages only */}
          {isMyMessage && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              title="Edit"
              className="w-7 h-7 rounded-full glass flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
              style={{ color: 'var(--muted)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}

          {/* Delete — own messages only */}
          {isMyMessage && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
              title="Delete"
              className="w-7 h-7 rounded-full glass flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
              style={{ color: '#EF4444' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Message bubble ─────────────────────────────────────────── */}
        <div className="relative flex flex-col max-w-[75%] md:max-w-[60%]">
          {QuickEmojiStrip}
          {FullEmojiPickerOverlay}

          <div className={`${isMyMessage ? 'bubble-sent' : 'bubble-received'} relative`}>

            {/* Sender name (received messages) */}
            {!isMyMessage && message.sender && (
              <p className="text-xs font-semibold mb-1.5 opacity-80">
                {message.sender.is_anonymous
                  ? `Anonymous (${message.sender.display_gender || 'Unknown'})`
                  : message.sender.name}
              </p>
            )}

            {/* WhatsApp-style reply quote */}
            {message.parent_message_id && message.parent_message && (
              <div
                className="mb-2 px-3 py-2 rounded-lg text-xs cursor-pointer"
                style={{
                  background: isMyMessage ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
                  borderLeft: `3px solid ${isMyMessage ? 'rgba(255,255,255,0.6)' : 'var(--coral)'}`,
                }}
              >
                <p className="font-bold mb-0.5" style={{ color: isMyMessage ? 'rgba(255,255,255,0.9)' : 'var(--coral)' }}>
                  {message.parent_message.sender?.name || 'Unknown'}
                </p>
                <p className="line-clamp-2 opacity-80" style={{ color: isMyMessage ? 'rgba(255,255,255,0.75)' : 'var(--body)' }}>
                  {message.parent_message.encrypted_content || '📷 Image'}
                </p>
              </div>
            )}

            {/* Image */}
            {message.message_type === 'image' && message.media_url && (
              <div className="mb-2 -mx-1">
                <a href={message.media_url} target="_blank" rel="noopener noreferrer">
                  <Image
                    src={message.media_url}
                    alt="Shared image"
                    width={300}
                    height={200}
                    className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ objectFit: 'contain', height: 'auto' }}
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL="data:image/svg+xml,%3Csvg width='300' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='300' height='200' fill='%23e5e7eb'/%3E%3C/svg%3E"
                    sizes="(max-width: 600px) 100vw, 300px"
                  />
                </a>
              </div>
            )}

            {/* Message content or inline edit */}
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditMessage();
                    if (e.key === 'Escape') { setIsEditing(false); setEditContent(message.encrypted_content || ''); }
                  }}
                  className="w-full px-3 py-2 rounded-xl glass text-sm min-w-45"
                  style={{ color: 'var(--body)' }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleEditMessage}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: 'var(--grad-romance)' }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setIsEditing(false); setEditContent(message.encrypted_content || ''); }}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold glass"
                    style={{ color: 'var(--body)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {message.encrypted_content && (
                  <p className="whitespace-pre-wrap wrap-break-word leading-relaxed">
                    {message.encrypted_content}
                  </p>
                )}
              </>
            )}

            {/* Timestamp + edited badge */}
            <div className="flex items-center gap-2 mt-1.5">
              <p className={`text-[10px] ${isMyMessage ? 'text-white/70' : 'opacity-60'}`}>
                {formatTime(message.created_at.toString())}
              </p>
              {message.is_edited && (
                <span className={`text-[9px] ${isMyMessage ? 'text-white/50' : 'opacity-40'}`}>(edited)</span>
              )}
            </div>
          </div>

          {/* Reactions display — below the bubble */}
          {reactions.length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
              {reactions.map(reaction => {
                const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
                const currentUserId = userStr ? JSON.parse(userStr).user_id : null;
                const iReacted = reaction.users?.some(u => u.user_id === currentUserId);
                return (
                  <button
                    key={reaction.emoji}
                    onClick={() => handleReaction(reaction.emoji)}
                    title={reaction.users?.map(u => u.name).join(', ') || ''}
                    className="px-2 py-0.5 rounded-full text-xs flex items-center gap-1 hover:scale-110 transition-transform"
                    style={{
                      background: iReacted
                        ? 'rgba(var(--pink-rgb, 236,72,153), 0.18)'
                        : 'rgba(255,255,255,0.12)',
                      border: `1px solid ${iReacted ? 'rgba(236,72,153,0.4)' : 'rgba(255,255,255,0.15)'}`,
                    }}
                  >
                    <span>{reaction.emoji}</span>
                    <span className="font-semibold" style={{ color: 'var(--body)' }}>{reaction.count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Delete confirmation dialog ──────────────────────────────── */}
      {showDeleteDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDeleteDialog(false)}
        >
          <div
            className="glass-strong rounded-3xl p-6 max-w-sm w-full animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--heading)' }}>Delete Message</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>How would you like to delete this message?</p>
            <div className="space-y-2">
              <button
                onClick={() => handleDeleteMessage(false)}
                className="w-full px-4 py-3 rounded-xl glass text-left hover:opacity-80 transition-opacity"
              >
                <p className="font-semibold text-sm" style={{ color: 'var(--heading)' }}>Delete for me</p>
                <p className="text-xs opacity-60 mt-0.5" style={{ color: 'var(--muted)' }}>Only you won`t see this message</p>
              </button>
              {canDeleteForEveryone && (
                <button
                  onClick={() => handleDeleteMessage(true)}
                  className="w-full px-4 py-3 rounded-xl glass text-left hover:opacity-80 transition-opacity"
                >
                  <p className="font-semibold text-sm" style={{ color: '#EF4444' }}>Delete for everyone</p>
                  <p className="text-xs opacity-60 mt-0.5" style={{ color: 'var(--muted)' }}>Removes for all participants (within 48 hrs)</p>
                </button>
              )}
            </div>
            <button
              onClick={() => setShowDeleteDialog(false)}
              className="w-full mt-4 px-4 py-2.5 rounded-xl btn-ghost text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
