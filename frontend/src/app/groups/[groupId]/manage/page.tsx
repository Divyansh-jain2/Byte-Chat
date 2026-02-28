'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { groupService } from '@/services/group.service';
import type { User } from '@/types/chat.types';
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

export default function ManageGroupPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;
  const toast = useToast();

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [groupIsPrivate, setGroupIsPrivate] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Fetch group details to check if user is owner and if group is private
      const groupDetails = await groupService.getGroupDetails(groupId);
      if (groupDetails.success && groupDetails.data) {
        setIsOwner(groupDetails.data.group.user_is_owner);
        setGroupIsPrivate(!groupDetails.data.group.is_public);
      }

      // Fetch group members
      const membersResponse = await groupService.getGroupMembers(groupId);
      if (membersResponse.success && membersResponse.data) {
        setMembers(membersResponse.data.members);
      }

      // Fetch all users for adding members
      const token = localStorage.getItem('accessToken');
      const usersResponse = await fetch('http://localhost:3001/api/profile/all', {
        credentials: 'include',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        if (usersData.success && usersData.data) {
          setAllUsers(usersData.data.users);
        }
      }
    } 
    catch (err: unknown) {
      let errorMsg = 'Failed to fetch data';
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
    fetchData();
  }, [fetchData]);

  const handleAddMember = async (userId: string, isAnonymous: boolean) => {
    try {
      await groupService.addMemberToGroup(groupId, userId, isAnonymous);
      setShowAddMember(false);
      setSearchQuery('');
      fetchData();
    } 
    catch (err: unknown) {
      let errorMsg = 'Failed to add member';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        errorMsg = (err as { message: string }).message;
      }
      // setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName}?`)) {
      return;
    }

    try {
      await groupService.removeMemberFromGroup(groupId, memberId);
      fetchData();
    } 
    catch (err: unknown) {
      let errorMsg = 'Failed to remove member';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        errorMsg = (err as { message: string }).message;
      }
      // setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handlePromoteMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to promote ${memberName} to admin?`)) {
      return;
    }

    try {
      await groupService.promoteMemberToAdmin(groupId, memberId);
      fetchData();
    } 
    catch (err: unknown) {
      let errorMsg = 'Failed to promote member';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        errorMsg = (err as { message: string }).message;
      }
      // setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  // Filter users not already in the group
  const availableUsers = allUsers.filter(
    user => !members.find(m => m.user_id === user.user_id)
  );

  const filteredAvailableUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.roll_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="border-b-4 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                [MANAGE GROUP]
              </h1>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400 font-mono">
                Add or remove members
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddMember(true)}
                className="px-6 py-3 bg-green-600 dark:bg-green-500 text-white font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-green-700 transition-colors"
              >
                + ADD MEMBER
              </button>
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
              >
                ← BACK
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border-2 border-red-600 text-red-900 dark:text-red-100 font-mono">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-black border-4 border-neutral-900 dark:border-neutral-100 p-6 mb-6">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 font-mono mb-4">
            MEMBERS ({members.length})
          </h2>

          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.member_id}
                className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-900 dark:border-neutral-100"
              >
                <div className="flex items-center gap-4">
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
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900 dark:text-neutral-100 font-mono">
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
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 font-mono">
                      {member.is_anonymous 
                        ? `${member.anonymous_gender?.toUpperCase()} • Anonymous`
                        : `${member.roll_no} • ${member.branch}`
                      }
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                      Joined: {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {/* Promote to Admin - only owners can promote, and only non-admins */}
                  {isOwner && !member.is_admin && !member.is_owner && (
                    <button
                      onClick={() => handlePromoteMember(member.member_id, member.is_anonymous ? member.anonymous_name || 'Anonymous' : member.name)}
                      className="px-4 py-2 bg-blue-600 text-white font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-blue-700 transition-colors text-xs"
                    >
                      MAKE ADMIN
                    </button>
                  )}
                  {/* Remove - can't remove owner, only works for private groups */}
                  {!member.is_owner && groupIsPrivate && (
                    <button
                      onClick={() => handleRemoveMember(member.member_id, member.is_anonymous ? member.anonymous_name || 'Anonymous' : member.name)}
                      className="px-4 py-2 bg-red-600 text-white font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-red-700 transition-colors text-xs"
                    >
                      REMOVE
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black border-4 border-neutral-900 dark:border-neutral-100 max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4 font-mono">
              [ADD MEMBER]
            </h2>

            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 mb-4 border-2 border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:ring-4 focus:ring-neutral-400"
            />

            <div className="space-y-2 mb-4">
              {filteredAvailableUsers.length === 0 ? (
                <p className="text-center text-neutral-500 dark:text-neutral-400 font-mono py-4">
                  No users available
                </p>
              ) : (
                filteredAvailableUsers.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-900 dark:border-neutral-100"
                  >
                    <div className="flex items-center gap-3">
                      {user.dp_url ? (
                        <Image
                          src={user.dp_url}
                          alt={user.name}
                          width={24}
                          height={24}
                          className="border-2 border-neutral-900 dark:border-neutral-100 object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 border-2 border-neutral-900 dark:border-neutral-100 bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center text-neutral-900 dark:text-neutral-100 font-bold font-mono">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      <div>
                        <p className="font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                          {user.name}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 font-mono">
                          {user.roll_no} • {user.branch}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddMember(user.user_id, false)}
                        className="px-3 py-1 bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors text-xs"
                      >
                        ADD
                      </button>
                      <button
                        onClick={() => handleAddMember(user.user_id, true)}
                        className="px-3 py-1 bg-linear-to-r from-neutral-600 to-neutral-800 dark:from-neutral-400 dark:to-neutral-200 text-neutral-100 dark:text-neutral-900 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:from-neutral-700 hover:to-neutral-900 transition-all text-xs"
                      >
                        ADD ANON
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => {
                setShowAddMember(false);
                setSearchQuery('');
              }}
              className="w-full px-4 py-3 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
