'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { groupService } from '@/services/group.service';
import GroupImageManager from '@/components/GroupImageManager';
import { ReportGroupButton } from '@/components/ModerationComponents';
import { useToast } from '@/contexts/ToastContext';
import Image from 'next/image';


interface GroupMember {
  member_id: string;
  user_id: string;
  is_admin: boolean;
  is_owner: boolean;
  is_anonymous: boolean;
  joined_at: string;
  name: string;
  roll_no: string;
  dp_url: string | null;
  branch: string;
  anonymous_name: string | null;
  anonymous_gender: string | null;
}

interface GroupDetails {
  group_id: string;
  group_name: string;
  group_desc: string;
  group_dp_url?: string;
  is_public: boolean;
  max_members: number;
  created_at: string;
  updated_at: string;
  creator_name: string;
  creator_roll_no: string;
  member_count: number;
  is_member: boolean;
  user_is_admin: boolean;
  user_is_owner: boolean;
}

export default function GroupDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;
  const toast = useToast();

  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchGroupData = useCallback(async () => {
    try {
      // Fetch group details
      const groupResponse = await groupService.getGroupDetails(groupId);
      if (groupResponse.success && groupResponse.data) {
        setGroup(groupResponse.data.group);

        // If user is a member, fetch members list
        if (groupResponse.data.group.is_member) {
          const membersResponse = await groupService.getGroupMembers(groupId);
          if (membersResponse.success && membersResponse.data) {
            setMembers(membersResponse.data.members);
          }
        }
      }
    }
    catch (err: unknown) {
      let errorMsg = '[ERROR] Failed to fetch group data';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        errorMsg = (err as { message: string }).message;
      }
      setError(errorMsg);
      toast.error(errorMsg);
    }
    finally {
      setLoading(false);
    }
  }, [groupId, toast]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  const handleJoinGroup = async (isAnonymous: boolean) => {
    try {
      await groupService.joinGroup(groupId, isAnonymous);
      fetchGroupData();
    } 
    catch (err: unknown) {
      let errorMsg = 'Failed to join group'
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        errorMsg = (err as { message: string }).message;
      }
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) {
      return;
    }

    try {
      await groupService.leaveGroup(groupId);
      router.push('/dashboard');
    } 
    catch (err: unknown) {
      let errorMsg = 'Failed to leave group'
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        errorMsg = (err as { message: string }).message;
      }
      setError(errorMsg);
      toast.error(errorMsg);
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

  if (error || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center border-4 border-neutral-900 dark:border-neutral-100 p-8 bg-white dark:bg-black">
          <p className="text-neutral-900 dark:text-neutral-100 text-lg mb-4 font-mono">
            {error || 'Group not found'}
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors"
          >
            ← BACK TO DASHBOARD
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="border-b-4 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {group.group_dp_url ? (
                  <Image
                    src={group.group_dp_url}
                    alt={group.group_name}
                    width={32}
                    height={32}
                    className="object-cover border-2 border-neutral-900 dark:border-neutral-100"
                  />
                ) : (
                  <div className="w-16 h-16 bg-neutral-200 dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-100 flex items-center justify-center font-mono font-bold text-neutral-900 dark:text-neutral-100">
                    {group.group_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                  {group.group_name.toUpperCase()}
                </h1>
                <span className={`px-3 py-1 text-sm font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 ${
                  group.is_public 
                    ? 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100'
                    : 'bg-orange-200 dark:bg-orange-800 text-orange-900 dark:text-orange-100'
                }`}>
                  {group.is_public ? 'PUBLIC' : 'PRIVATE'}
                </span>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 font-mono">
                Created by {group.creator_name} ({group.creator_roll_no})
              </p>
            </div>
            <div className="flex gap-2">
              {group.is_member && (group.user_is_admin || group.user_is_owner) && (
                <>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-blue-700 transition-colors"
                  >
                    EDIT GROUP
                  </button>
                  <Link
                    href={`/groups/${groupId}/manage`}
                    className="px-6 py-3 bg-purple-600 dark:bg-purple-500 text-white font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-purple-700 transition-colors"
                  >
                    MANAGE MEMBERS
                  </Link>
                </>
              )}
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
              >
                ← BACK
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Group Info */}
        <div className="bg-white dark:bg-black border-4 border-neutral-900 dark:border-neutral-100 p-6 mb-6">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 font-mono mb-4">
            [GROUP INFORMATION]
          </h2>
          
          {group.group_desc && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-neutral-600 dark:text-neutral-400 font-mono mb-2">DESCRIPTION</h3>
              <p className="text-neutral-900 dark:text-neutral-100 font-mono">{group.group_desc}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-900 dark:border-neutral-100 p-4">
              <h3 className="text-sm font-bold text-neutral-600 dark:text-neutral-400 font-mono mb-2">MEMBERS</h3>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                {group.member_count} / {group.max_members}
              </p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-900 dark:border-neutral-100 p-4">
              <h3 className="text-sm font-bold text-neutral-600 dark:text-neutral-400 font-mono mb-2">CREATED</h3>
              <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                {new Date(group.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-900 dark:border-neutral-100 p-4">
              <h3 className="text-sm font-bold text-neutral-600 dark:text-neutral-400 font-mono mb-2">TYPE</h3>
              <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                {group.is_public ? 'PUBLIC' : 'PRIVATE'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-2 flex-wrap">
            {!group.is_member && group.is_public && (
              <>
                <button
                  onClick={() => handleJoinGroup(false)}
                  className="px-6 py-3 bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors"
                >
                  JOIN GROUP
                </button>
                <button
                  onClick={() => handleJoinGroup(true)}
                  className="px-6 py-3 bg-linear-to-r from-neutral-600 to-neutral-800 dark:from-neutral-400 dark:to-neutral-200 text-neutral-100 dark:text-neutral-900 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:from-neutral-700 hover:to-neutral-900 transition-all"
                >
                  JOIN ANONYMOUSLY
                </button>
              </>
            )}
            {group.is_member && (
              <>
                <Link
                  href={`/groups/${groupId}/chat`}
                  className="px-6 py-3 bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors"
                >
                  OPEN CHAT
                </Link>
                <button
                  onClick={handleLeaveGroup}
                  className="px-6 py-3 bg-red-600 text-white font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-red-700 transition-colors"
                >
                  LEAVE GROUP
                </button>
              </>
            )}
            {/* Report Button - Available to everyone viewing the group */}
            {group && (
              <ReportGroupButton 
                groupId={group.group_id}
                groupName={group.group_name}
              />
            )}
          </div>
        </div>

        {/* Members List (only if user is a member) */}
        {group.is_member && members.length > 0 && (
          <div className="bg-white dark:bg-black border-4 border-neutral-900 dark:border-neutral-100 p-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 font-mono mb-4">
              [MEMBERS] ({members.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <div
                  key={member.member_id}
                  className="bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-900 dark:border-neutral-100 p-4"
                >
                  <div className="flex items-start gap-3">
                    {member.dp_url ? (
                      <Image
                        src={member.dp_url}
                        alt={member.name}
                        width={32}
                        height={32}
                        className="border-2 border-neutral-900 dark:border-neutral-100 object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 border-2 border-neutral-900 dark:border-neutral-100 bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center text-neutral-900 dark:text-neutral-100 font-bold font-mono text-xl">
                        {(member.is_anonymous ? member.anonymous_name : member.name)?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-neutral-900 dark:text-neutral-100 font-mono truncate">
                          {member.is_anonymous ? member.anonymous_name : member.name}
                        </span>
                        {member.is_owner && (
                          <span className="px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 text-xs font-mono font-bold border border-neutral-900 dark:border-neutral-100">
                            OWNER
                          </span>
                        )}
                        {member.is_admin && !member.is_owner && (
                          <span className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 text-xs font-mono font-bold border border-neutral-900 dark:border-neutral-100">
                            ADMIN
                          </span>
                        )}
                        {member.is_anonymous && (
                          <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs font-mono font-bold border border-neutral-900 dark:border-neutral-100">
                            ANON
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                        {member.is_anonymous 
                          ? `${member.anonymous_gender?.toUpperCase()} • Anonymous`
                          : `${member.roll_no} • ${member.branch}`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Edit Group Modal */}
      {showEditModal && group && (
        <EditGroupModal
          group={group}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            fetchGroupData();
          }}
        />
      )}
    </div>
  );
}

// Edit Group Modal Component
function EditGroupModal({ 
  group, 
  onClose, 
  onSuccess 
}: { 
  group: GroupDetails; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    group_name: group.group_name,
    group_desc: group.group_desc || '',
    group_dp_url: group.group_dp_url || '',
    max_members: group.max_members
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await groupService.updateGroup(group.group_id, formData);
      onSuccess();
    } 
    catch (err: unknown) {
      let errorMsg = 'Failed to update group';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        errorMsg = (err as { message: string }).message;
      }
      setError(errorMsg);
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-black border-4 border-neutral-900 dark:border-neutral-100 max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4 font-mono">
          [EDIT GROUP]
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border-2 border-red-600 text-red-900 dark:text-red-100 font-mono text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-2 font-mono">
              GROUP NAME*
            </label>
            <input
              type="text"
              required
              value={formData.group_name}
              onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
              className="w-full px-4 py-2 border-2 border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:ring-4 focus:ring-neutral-400"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-2 font-mono">
              DESCRIPTION
            </label>
            <textarea
              value={formData.group_desc}
              onChange={(e) => setFormData({ ...formData, group_desc: e.target.value })}
              className="w-full px-4 py-2 border-2 border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:ring-4 focus:ring-neutral-400"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-2 font-mono">
              GROUP DISPLAY PICTURE
            </label>
            <GroupImageManager
              groupId={group.group_id}
              isAdmin={group.user_is_admin || group.user_is_owner}
              currentImageUrl={formData.group_dp_url || undefined}
              onUploadSuccess={(url: string) => {
                setFormData({ ...formData, group_dp_url: url });
              }}
              onDeleteSuccess={() => {
                setFormData({ ...formData, group_dp_url: '' });
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-2 font-mono">
              MAX MEMBERS (2-500)
            </label>
            <input
              type="number"
              required
              min={group.member_count}
              max={500}
              value={formData.max_members}
              onChange={(e) => setFormData({ ...formData, max_members: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border-2 border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:ring-4 focus:ring-neutral-400"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-1">
              Current members: {group.member_count}
            </p>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors disabled:opacity-50"
            >
              {loading ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


