// ==================== Block User Component ====================

'use client';

import { useState } from 'react';
import { blockUser, unblockUser } from '@/services/moderation.service';
import { useToast } from '@/contexts/ToastContext';

interface BlockUserButtonProps {
  userId: string;
  userName: string;
  isBlocked: boolean;
  onBlockStatusChange?: () => void;
}

export function BlockUserButton({ userId, userName, isBlocked, onBlockStatusChange }: BlockUserButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [reason, setReason] = useState('');
  const toast = useToast();

  const handleBlock = async () => {
    if (!reason.trim()) {
      toast.warning('Please enter a reason for blocking');
      return;
    }

    setLoading(true);
    try {
      await blockUser(userId, reason);
      toast.success(`Successfully blocked ${userName}`);
      setShowReasonDialog(false);
      setReason('');
      onBlockStatusChange?.();
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as Record<string, unknown>).message === 'string') {
        toast.error((error as { message: string }).message);
      } else {
        toast.error('Failed to block user');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!confirm(`Are you sure you want to unblock ${userName}?`)) return;

    setLoading(true);
    try {
      const response = await unblockUser(userId);
      
      // Check if user can message now
      if (response?.data?.canMessageNow) {
        toast.success(`Successfully unblocked ${userName}. You can now send messages to them.`);
      } else {
        toast.info(`Successfully unblocked ${userName}. However, they have also blocked you, so you cannot message them yet.`);
      }
      
      onBlockStatusChange?.();
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as Record<string, unknown>).message === 'string') {
        toast.error((error as { message: string }).message);
      } else {
        toast.error('Failed to unblock user');
      }
    } finally {
      setLoading(false);
    }
  };

  if (isBlocked) {
    return (
      <button
        onClick={handleUnblock}
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Unblocking...' : 'Unblock User'}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowReasonDialog(true)}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Block User
      </button>

      {showReasonDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Block {userName}</h3>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you blocking this user? (optional)"
              className="w-full border rounded p-2 mb-4 h-24"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowReasonDialog(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleBlock}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Blocking...' : 'Block'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==================== Report User Component ====================
// 'use client';
// import { useState } from 'react';
import { reportUser, reportGroup, ReportUserData, ReportGroupData } from '@/services/moderation.service';

interface ReportUserButtonProps {
  userId: string;
  userName: string;
  messageId?: string;
}

const REPORT_TYPES = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'impersonating', label: 'Impersonating' },
  { value: 'fake_profile', label: 'Fake Profile' },
  { value: 'other', label: 'Other' },
];

export function ReportUserButton({ userId, userName, messageId }: ReportUserButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportType, setReportType] = useState<string>('spam');
  const [description, setDescription] = useState('');
  const toast = useToast();

  const handleReport = async () => {
    if (!description.trim()) {
      toast.warning('Please provide a description');
      return;
    }

    setLoading(true);
    try {
      // Build comprehensive description with context
      const contextualDescription = `
        === REPORT DETAILS ===
        Report Type: ${reportType}
        User Description: ${description}

        === REPORTED USER INFO ===
        User ID: ${userId}
        User Name: ${userName}
        ${messageId ? `\n=== MESSAGE CONTEXT ===\nMessage ID: ${messageId}` : ''}

        === TIMESTAMP ===
        Reported At: ${new Date().toISOString()}
        Reported At (Local): ${new Date().toLocaleString()}
        `.trim();

      const data: ReportUserData = {
        reportedUserId: userId,
        reportType: reportType as 'spam' | 'harassment' | 'inappropriate_content' | 'impersonating' | 'fake_profile' | 'other',
        description: contextualDescription,
        messageId,
      };

      await reportUser(data);
      toast.success('Report submitted successfully. Our team will review it shortly.');
      setShowReportDialog(false);
      setDescription('');
      setReportType('spam');
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as Record<string, unknown>).message === 'string') {
        toast.error((error as { message: string }).message);
      } else {
        toast.error('Failed to submit report');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowReportDialog(true)}
        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
      >
        Report User
      </button>

      {showReportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Report {userName}</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full border rounded p-2"
              >
                {REPORT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide details about this report..."
                className="w-full border rounded p-2 h-32"
                required
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowReportDialog(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                disabled={loading}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==================== Reveal Identity Button ====================
// 'use client';
// import { useState } from 'react';
import { revealAnonymousIdentity } from '@/services/moderation.service';

interface RevealIdentityButtonProps {
  conversationId: string;
  isSender: boolean; // Only sender can reveal
  onReveal?: (data: unknown) => void;
}

export function RevealIdentityButton({ conversationId, isSender, onReveal }: RevealIdentityButtonProps) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  if (!isSender) {
    return null; // Only sender can see the button
  }

  const handleReveal = async () => {
    if (!confirm('Are you sure you want to reveal your identity? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const result = await revealAnonymousIdentity(conversationId);
      toast.success(result.message);
      onReveal?.(result.data);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as Record<string, unknown>).message === 'string') {
        toast.error((error as { message: string }).message);
      } else {
        toast.error('Failed to reveal identity');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleReveal}
      disabled={loading}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
    >
      {loading ? 'Revealing...' : '🎭 Reveal My Identity'}
    </button>
  );
}

// ==================== Report Group Button ====================

interface ReportGroupButtonProps {
  groupId: string;
  groupName: string;
}

export function ReportGroupButton({ groupId, groupName }: ReportGroupButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportType, setReportType] = useState<string>('spam');
  const [description, setDescription] = useState('');
  const toast = useToast();

  const handleReport = async () => {
    if (!description.trim()) {
      toast.warning('Please provide a description');
      return;
    }

    setLoading(true);
    try {
      // Build comprehensive description with context
      const contextualDescription = `
        === REPORT DETAILS ===
        Report Type: ${reportType}
        User Description: ${description}

        === REPORTED GROUP INFO ===
        Group ID: ${groupId}
        Group Name: ${groupName}

        === TIMESTAMP ===
        Reported At: ${new Date().toISOString()}
        Reported At (Local): ${new Date().toLocaleString()}
        `.trim();

      const data: ReportGroupData = {
        reportedGroupId: groupId,
        reportType: reportType as 'spam' | 'harassment' | 'inappropriate_content' | 'impersonating' | 'fake_profile' | 'other',
        description: contextualDescription,
      };

      await reportGroup(data);
      toast.success('Report submitted successfully. Our team will review it shortly.');
      setShowReportDialog(false);
      setDescription('');
      setReportType('spam');
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as Record<string, unknown>).message === 'string') {
        toast.error((error as { message: string }).message);
      } else {
        toast.error('Failed to submit report');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowReportDialog(true)}
        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100"
      >
        🚨 REPORT GROUP
      </button>

      {showReportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Report {groupName}</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full border rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {REPORT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide details about why you're reporting this group..."
                className="w-full border rounded p-2 h-32 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowReportDialog(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                disabled={loading}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==================== Anonymous Message Badge ====================

interface MessageBadgeProps {
  wasAnonymous: boolean;
}

export function AnonymousMessageBadge({ wasAnonymous }: MessageBadgeProps) {
  if (!wasAnonymous) return null;

  return (
    <span 
      className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full"
      title="This message was sent anonymously"
    >
      ⭐ Previously Anonymous
    </span>
  );
}
