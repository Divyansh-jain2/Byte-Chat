'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { messageManagementService } from '@/services/message-management.service';

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
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactions, setReactions] = useState<MessageReaction[]>(message.reactions || []);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.encrypted_content || '');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReaction = async (emoji: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      // Check if already reacted
      const userReacted = reactions.find((r) => 
        r.emoji === emoji &&  r.users?.some((u) => u.user_id === message.sender_id)
      );

      if (userReacted) {
        await messageManagementService.removeReaction(message.message_id, emoji, token);
        // Remove reaction from state
        setReactions(prev => 
          prev.map(r => r.emoji === emoji ? 
            { ...r, count: r.count - 1, users: r.users?.filter((u) => u.user_id !== message.sender_id) } : 
            r
          ).filter(r => r.count > 0)
        );
      } else {
        await messageManagementService.addReaction(message.message_id, emoji, token);
        // Add reaction to state
        setReactions(prev => {
          const existing = prev.find(r => r.emoji === emoji);
          if (existing) {
            return prev.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r);
          } else {
            return [...prev, { emoji, count: 1 }];
          }
        });
      }
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Failed to handle reaction:', error);
    }
  };

  const handleEditMessage = async () => {
    if (!editContent.trim() || editContent === message.encrypted_content) {
      setIsEditing(false);
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      // For now, we'll just update the UI. In production, you'd encrypt the content
      if (onEdit) {
        onEdit(message.message_id, editContent);
      }
      
      setIsEditing(false);
      setShowMenu(false);
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleDeleteMessage = async (deleteForEveryone: boolean) => {
    try {
      if (onDelete) {
        onDelete(message.message_id, deleteForEveryone);
      }
      setShowDeleteDialog(false);
      setShowMenu(false);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const canDeleteForEveryone = useMemo(() => {
    if (!isMyMessage) return false;
    const createdAt = new Date(message.created_at).getTime();
    const now = new Date().getTime();
    const messageAge = now - createdAt;
    const maxAge = 48 * 60 * 60 * 1000; // 48 hours
    return messageAge <= maxAge;
  }, [isMyMessage, message.created_at]);

  return (
    <div className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} group relative`}>
      <div className={`max-w-[72%] relative`}>
        {/* Reply indicator */}
        {message.parent_message_id && message.parent_message && (
          <div className="mb-2 px-3 py-2 rounded-xl opacity-70 text-xs" style={{ background: 'var(--glass-bg)' }}>
            <p className="font-semibold mb-1">Replying to {message.parent_message.sender?.name}</p>
            <p className="opacity-80 line-clamp-2">{message.parent_message.encrypted_content}</p>
          </div>
        )}

        <div className={`${isMyMessage ? 'bubble-sent' : 'bubble-received'} relative`}>
          {/* Message context menu button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full glass flex items-center justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {/* Context menu */}
          {showMenu && (
            <div
              ref={menuRef}
              className={`absolute ${isMyMessage ? 'right-0' : 'left-0'} top-full mt-2 w-48 glass-strong rounded-2xl py-1 z-50 shadow-xl`}
            >
              <button
                onClick={() => { setShowEmojiPicker(!showEmojiPicker); }}
                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:opacity-70"
                style={{ color: 'var(--body)' }}
              >
                <span className="text-lg">😊</span>
                React
              </button>
              {onReply && (
                <button
                  onClick={() => { onReply(message); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:opacity-70"
                  style={{ color: 'var(--body)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Reply
                </button>
              )}
              {isMyMessage && (
                <>
                  <button
                    onClick={() => { setIsEditing(true); setShowMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:opacity-70"
                    style={{ color: 'var(--body)' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:opacity-70"
                    style={{ color: '#EF4444' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </>
              )}
            </div>
          )}

          {/* Emoji picker */}
          {showEmojiPicker && (
            <div
              ref={emojiRef}
              className={`absolute ${isMyMessage ? 'right-0' : 'left-0'} top-full mt-2 glass-strong rounded-2xl p-3 z-50 shadow-xl flex gap-2`}
            >
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="w-10 h-10 rounded-xl hover:scale-125 transition-transform text-2xl flex items-center justify-center glass"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {!isMyMessage && message.sender && (
            <p className="text-xs font-semibold mb-1.5 opacity-80">
              {message.sender.is_anonymous ? `Anonymous (${message.sender.display_gender || 'Unknown'})` : message.sender.name}
            </p>
          )}

          {message.message_type === 'image' && message.media_url && (
            <div className="mb-2 -mx-1">
              <a href={message.media_url} target="_blank" rel="noopener noreferrer">
                <Image
                  src={message.media_url}
                  alt="Shared image"
                  width={300}
                  height={200}
                  className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ objectFit: 'contain' }}
                />
              </a>
            </div>
          )}

          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass text-sm"
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

          <div className="flex items-center gap-2 mt-1.5">
            <p className={`text-[10px] ${isMyMessage ? 'text-white/70' : 'opacity-60'}`}>
              {formatTime(message.created_at.toString())}
            </p>
            {message.is_edited && (
              <span className={`text-[9px] ${isMyMessage ? 'text-white/50' : 'opacity-40'}`}>(edited)</span>
            )}
          </div>
        </div>

        {/* Reactions display */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => handleReaction(reaction.emoji)}
                className="px-2 py-1 rounded-full glass text-xs flex items-center gap-1 hover:scale-110 transition-transform"
                title={reaction.users?.map((u) => u.name).join(', ') || ''}
              >
                <span>{reaction.emoji}</span>
                <span className="font-semibold">{reaction.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-strong rounded-3xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--heading)' }}>Delete Message</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--body)' }}>Choose how to delete this message:</p>
            <div className="space-y-3">
              <button
                onClick={() => handleDeleteMessage(false)}
                className="w-full px-4 py-3 rounded-xl glass text-left"
              >
                <p className="font-semibold text-sm" style={{ color: 'var(--heading)' }}>Delete for me</p>
                <p className="text-xs opacity-70" style={{ color: 'var(--muted)' }}>Only removes for you</p>
              </button>
              {canDeleteForEveryone && (
                <button
                  onClick={() => handleDeleteMessage(true)}
                  className="w-full px-4 py-3 rounded-xl glass text-left"
                >
                  <p className="font-semibold text-sm" style={{ color: '#EF4444' }}>Delete for everyone</p>
                  <p className="text-xs opacity-70" style={{ color: 'var(--muted)' }}>Removes for all participants (within 48hrs)</p>
                </button>
              )}
            </div>
            <button
              onClick={() => { setShowDeleteDialog(false); setShowMenu(false); }}
              className="w-full mt-4 px-4 py-2.5 rounded-xl btn-ghost text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
