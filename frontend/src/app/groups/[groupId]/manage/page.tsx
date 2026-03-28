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
      const { API_BASE_URL } = await import('../../../../services/apiBase');
      const usersResponse = await fetch(`${API_BASE_URL}/api/profile/all`, {
        credentials: 'include',
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
      <div className="min-h-screen bg-mesh-warm flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full border-4 border-transparent mx-auto mb-4 animate-spin"
            style={{ borderTopColor: 'var(--pink)', borderRightColor: 'var(--coral)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Loading members…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh-warm antialiased">
      {/* Decorative blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-linear-to-br from-purple-300/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 bg-linear-to-tr from-pink-300/10 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <header className="glass-nav sticky top-0 z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn-ghost w-9 h-9 rounded-full flex items-center justify-center text-lg">←</button>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--heading)' }}>Manage Members</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={() => setShowAddMember(true)} className="btn-romance px-4 py-2 text-sm">+ Add Member</button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {error && (
          <div className="glass rounded-2xl p-4 mb-4 bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Members list */}
        <div className="glass-strong rounded-3xl p-4 space-y-2">
          {members.map((member) => (
            <div key={member.member_id} className="glass rounded-2xl p-4 flex items-center gap-4">
              {/* Avatar */}
              {member.dp_url ? (
                <Image src={member.dp_url} alt={member.name} width={44} height={44}
                      className="rounded-xl object-cover shrink-0 w-11 h-11" unoptimized />
              ) : (
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0"
                  style={{ background: member.is_anonymous ? 'var(--grad-mystery)' : 'var(--grad-romance)' }}>
                  {member.is_anonymous ? '🎭' : (member.name?.charAt(0).toUpperCase() || '?')}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-sm truncate" style={{ color: 'var(--heading)' }}>
                    {member.is_anonymous ? (member.anonymous_name || 'Anonymous') : member.name}
                  </span>
                  {member.is_owner && (
                    <span className="px-1.5 py-0.5 rounded-md text-xs font-semibold bg-purple-500/15 text-purple-400">👑 Owner</span>
                  )}
                  {member.is_admin && !member.is_owner && (
                    <span className="px-1.5 py-0.5 rounded-md text-xs font-semibold bg-blue-500/15 text-blue-400">🛡️ Admin</span>
                  )}
                  {member.is_anonymous && (
                    <span className="px-1.5 py-0.5 rounded-md text-xs font-semibold bg-purple-500/10 text-purple-300">🎭 Anon</span>
                  )}
                </div>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
                  {member.is_anonymous
                    ? `${member.anonymous_gender || 'Unknown'} · Anonymous`
                    : `${member.roll_no} · ${member.branch}`}
                </p>
                <p className="text-xs" style={{ color: 'var(--muted)', opacity: 0.6 }}>
                  Joined {new Date(member.joined_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex flex-col gap-1.5 shrink-0">
                {isOwner && !member.is_admin && !member.is_owner && (
                  <button onClick={() => handlePromoteMember(member.member_id, member.is_anonymous ? (member.anonymous_name || 'Anonymous') : member.name)}
                    className="btn-ghost px-3 py-1 text-xs rounded-xl text-blue-400">
                    Make Admin
                  </button>
                )}
                {!member.is_owner && groupIsPrivate && (
                  <button onClick={() => handleRemoveMember(member.member_id, member.is_anonymous ? (member.anonymous_name || 'Anonymous') : member.name)}
                    className="btn-ghost px-3 py-1 text-xs rounded-xl text-red-400">
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}

          {members.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">👥</div>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No members yet.</p>
            </div>
          )}
        </div>
      </main>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-5 pb-3">
              <h2 className="font-bold text-lg" style={{ color: 'var(--heading)' }}>Add Member</h2>
              <button onClick={() => { setShowAddMember(false); setSearchQuery(''); }}
                className="btn-ghost w-9 h-9 rounded-full flex items-center justify-center">✕</button>
            </div>

            <div className="px-5 pb-3">
              <input type="text" placeholder="Search by name or roll no…" value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} className="input-romance w-full" />
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2 custom-scrollbar">
              {filteredAvailableUsers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>No users available</p>
                </div>
              ) : (
                filteredAvailableUsers.map((user) => (
                  <div key={user.user_id} className="glass rounded-2xl p-3 flex items-center gap-3">
                    {user.dp_url ? (
                      <Image src={user.dp_url} alt={user.name} width={40} height={40}
                        className="rounded-xl object-cover w-10 h-10 shrink-0" unoptimized />
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
                        style={{ background: 'var(--grad-romance)' }}>
                        {user.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--heading)' }}>{user.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{user.roll_no} · {user.branch}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => handleAddMember(user.user_id, false)} className="btn-romance px-3 py-1.5 text-xs">Add</button>
                      <button onClick={() => handleAddMember(user.user_id, true)} className="btn-purple px-3 py-1.5 text-xs">🎭 Anon</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
