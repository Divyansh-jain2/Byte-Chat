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
      <div className="min-h-screen bg-mesh-warm flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full border-4 border-transparent mx-auto mb-4 animate-spin"
            style={{ borderTopColor: 'var(--pink)', borderRightColor: 'var(--coral)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Loading group…</p>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-mesh-warm flex items-center justify-center p-6">
        <div className="glass-strong rounded-3xl p-12 text-center max-w-md animate-scale-in">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--heading)' }}>{error || 'Group not found'}</h2>
          <Link href="/dashboard" className="btn-romance mt-6 inline-block">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh-warm antialiased">
      {/* Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-linear-to-br from-cyan-300/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-[-5%] left-[-3%] w-80 h-80 bg-linear-to-br from-blue-300/10 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <header className="glass-nav sticky top-0 z-50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard" className="btn-ghost px-3 py-2 text-sm shrink-0">← Back</Link>
            <div className="flex items-center gap-3 min-w-0">
              {group.group_dp_url ? (
                <Image src={group.group_dp_url} alt={group.group_name} width={40} height={40}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/20 shrink-0" unoptimized />
              ) : (
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
                  style={{ background: 'var(--grad-ocean)' }}>
                  {group.group_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-lg font-bold truncate heading-romance">{group.group_name}</h1>
                <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                  by {group.creator_name} · {group.member_count}/{group.max_members} members
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {group.is_member && (group.user_is_admin || group.user_is_owner) && (
              <>
                <button onClick={() => setShowEditModal(true)} className="btn-ghost px-4 py-2 text-sm">Edit</button>
                <Link href={`/groups/${groupId}/manage`} className="btn-purple px-4 py-2 text-sm">Manage</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Group Info Card */}
        <div className="glass-strong rounded-3xl p-7 animate-fade-in">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              {group.group_dp_url ? (
                <Image src={group.group_dp_url} alt={group.group_name} width={72} height={72}
                  className="w-18 h-18 rounded-2xl object-cover ring-2 ring-white/20 shrink-0" unoptimized />
              ) : (
                <div className="w-18 h-18 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shrink-0"
                  style={{ background: 'var(--grad-ocean)', width: 72, height: 72 }}>
                  {group.group_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-2xl font-bold" style={{ color: 'var(--heading)' }}>{group.group_name}</h2>
                  <span className={`px-3 py-0.5 rounded-full text-xs font-semibold ${
                    group.is_public ? 'bg-emerald-500/15 text-emerald-400' : 'bg-orange-500/15 text-orange-400'
                  }`}>
                    {group.is_public ? '🌐 Public' : '🔒 Private'}
                  </span>
                </div>
                {group.group_desc && (
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>{group.group_desc}</p>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Members', value: `${group.member_count}/${group.max_members}` },
              { label: 'Created', value: new Date(group.created_at).toLocaleDateString() },
              { label: 'Type', value: group.is_public ? 'Public' : 'Private' },
            ].map(s => (
              <div key={s.label} className="glass rounded-2xl p-4 text-center">
                <p className="text-base font-bold mb-0.5" style={{ color: 'var(--heading)' }}>{s.value}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-wrap">
            {!group.is_member && group.is_public && (
              <>
                <button onClick={() => handleJoinGroup(false)} className="btn-romance px-6 py-3 text-sm font-semibold flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Join Group
                </button>
                <button onClick={() => handleJoinGroup(true)} className="btn-purple px-6 py-3 text-sm font-semibold flex items-center gap-2">
                  🎭 Join Anonymously
                </button>
              </>
            )}
            {group.is_member && (
              <>
                <Link href={`/groups/${groupId}/chat`} className="btn-romance px-6 py-3 text-sm font-semibold flex items-center gap-2">
                  💬 Open Chat
                </Link>
                <button onClick={handleLeaveGroup} className="px-6 py-3 rounded-2xl text-sm font-semibold glass transition-all hover:scale-105 flex items-center gap-2" style={{ color: '#EF4444' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Leave Group
                </button>
              </>
            )}
            {group && (
              <ReportGroupButton groupId={group.group_id} groupName={group.group_name} />
            )}
          </div>
        </div>

        {/* Members List */}
        {group.is_member && members.length > 0 && (
          <div className="glass-strong rounded-3xl p-7 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--heading)' }}>
              <span>👥</span> Members <span className="text-base font-normal" style={{ color: 'var(--muted)' }}>({members.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <div key={member.member_id} className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    {member.dp_url && !member.is_anonymous ? (
                      <Image src={member.dp_url} alt={member.name} width={44} height={44}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-white/20 shrink-0" unoptimized />
                    ) : (
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
                        style={{ background: member.is_anonymous ? 'var(--grad-mystery)' : 'var(--grad-romance)' }}>
                        {(member.is_anonymous ? member.anonymous_name : member.name)?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="font-semibold text-sm truncate" style={{ color: 'var(--heading)' }}>
                          {member.is_anonymous ? member.anonymous_name : member.name}
                        </span>
                        {member.is_owner && <span className="px-1.5 py-0.5 rounded text-xs bg-purple-500/15 text-purple-400">👑</span>}
                        {member.is_admin && !member.is_owner && <span className="px-1.5 py-0.5 rounded text-xs bg-blue-500/15 text-blue-400">🛡️</span>}
                        {member.is_anonymous && <span className="px-1.5 py-0.5 rounded text-xs bg-white/10 text-gray-400">🎭</span>}
                      </div>
                      <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                        {member.is_anonymous
                          ? `${member.anonymous_gender} · Anonymous`
                          : `${member.roll_no} · ${member.branch}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {showEditModal && group && (
        <EditGroupModal
          group={group}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => { setShowEditModal(false); fetchGroupData(); }}
        />
      )}
    </div>
  );
}

// Edit Group Modal
function EditGroupModal({
  group, onClose, onSuccess
}: {
  group: GroupDetails; onClose: () => void; onSuccess: () => void;
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
    setLoading(true); setError('');
    try {
      await groupService.updateGroup(group.group_id, formData);
      onSuccess();
    } catch (err: unknown) {
      let errorMsg = 'Failed to update group';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        errorMsg = (err as { message: string }).message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-strong rounded-3xl p-8 max-w-md w-full animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold heading-romance">Edit Group</h2>
          <button onClick={onClose} className="btn-ghost w-9 h-9 rounded-full flex items-center justify-center">✕</button>
        </div>
        {error && (
          <div className="glass rounded-2xl p-3 mb-5 border border-red-400/30 bg-red-500/10 text-red-400 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--body)' }}>Group Name*</label>
            <input type="text" required value={formData.group_name}
              onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
              className="input-romance w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--body)' }}>Description</label>
            <textarea value={formData.group_desc}
              onChange={(e) => setFormData({ ...formData, group_desc: e.target.value })}
              className="input-romance w-full resize-none" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--body)' }}>Group Picture</label>
            <GroupImageManager
              groupId={group.group_id}
              isAdmin={group.user_is_admin || group.user_is_owner}
              currentImageUrl={formData.group_dp_url || undefined}
              onUploadSuccess={(url: string) => setFormData({ ...formData, group_dp_url: url })}
              onDeleteSuccess={() => setFormData({ ...formData, group_dp_url: '' })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--body)' }}>
              Max Members (2–500)
            </label>
            <input type="number" required min={group.member_count} max={500} value={formData.max_members}
              onChange={(e) => setFormData({ ...formData, max_members: parseInt(e.target.value) })}
              className="input-romance w-full" />
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Current members: {group.member_count}</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-romance flex-1">
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


