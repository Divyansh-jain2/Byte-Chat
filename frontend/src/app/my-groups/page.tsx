'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Group } from '@/types/chat.types';
import { groupService } from '@/services/group.service';
import Image from 'next/image';
import { useGroupPresence } from '@/hooks/useGroupPresence';

interface MyGroup extends Group {
  is_admin: boolean;
  is_owner: boolean;
  is_anonymous: boolean;
  joined_at: string;
}

/** Small inline badge showing live online member count for a group */
function GroupOnlineBadge({ groupId }: { groupId: string }) {
  const { onlineCount } = useGroupPresence(groupId);
  if (onlineCount === 0) return null;
  return (
    <span className="flex items-center gap-1 font-medium" style={{ color: '#22C55E' }}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      {onlineCount} online
    </span>
  );
}


export default function MyGroupsPage() {
  // const router = useRouter();
  const [groups, setGroups] = useState<MyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyGroups();
  }, []);

  const fetchMyGroups = async () => {
    try {
      const response = await groupService.getMyGroups();
      if (response.success && response.data && Array.isArray(response.data.groups)) {
        setGroups(response.data.groups);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
      setError('Failed to fetch your groups');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-mesh-warm flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full border-4 border-transparent mx-auto mb-4 animate-spin"
            style={{ borderTopColor: 'var(--pink)', borderRightColor: 'var(--coral)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Loading groups…</p>
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
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="btn-ghost px-3 py-2 text-sm flex items-center gap-2">
              ← Back
            </Link>
            <div>
              <h1 className="text-xl font-bold heading-romance">My Groups</h1>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {groups.length} group{groups.length !== 1 ? 's' : ''} joined
              </p>
            </div>
          </div>
          <Link href="/my-identities" className="btn-ghost px-4 py-2 text-sm flex items-center gap-2">
            🎭 Identities
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* Error */}
        {error && (
          <div className="glass rounded-2xl p-4 mb-6 border border-red-400/30 bg-red-500/10 text-red-400 animate-fade-in">
            ⚠️ {error}
          </div>
        )}

        {/* Empty State */}
        {groups.length === 0 ? (
          <div className="glass-strong rounded-3xl p-16 text-center animate-scale-in">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--heading)' }}>No groups yet</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
              Join or create groups from the dashboard
            </p>
            <Link href="/dashboard" className="btn-romance">
              Browse Groups
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group, idx) => (
              <div
                key={group.group_id}
                className="glass-card rounded-3xl p-6 flex flex-col animate-fade-in"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Group image or fallback icon */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative shrink-0">
                    {group.group_dp_url ? (
                      <Image
                        src={group.group_dp_url}
                        alt={group.group_name}
                        width={56}
                        height={56}
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/20"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                        style={{ background: 'var(--grad-ocean)' }}>
                        👥
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base truncate mb-1" style={{ color: 'var(--heading)' }}>
                      {group.group_name}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        group.is_public ? 'bg-emerald-500/15 text-emerald-400' : 'bg-orange-500/15 text-orange-400'
                      }`}>
                        {group.is_public ? '🌐 Public' : '🔒 Private'}
                      </span>
                      {group.is_owner && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400">
                          👑 Owner
                        </span>
                      )}
                      {group.is_admin && !group.is_owner && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400">
                          🛡️ Admin
                        </span>
                      )}
                      {group.is_anonymous && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-gray-400">
                          🎭 Anon
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {group.group_desc && (
                  <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--muted)' }}>
                    {group.group_desc}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs mb-4 pt-3 border-t" style={{ borderColor: 'var(--border-light)', color: 'var(--muted)' }}>
                  <span>👤 {group.member_count} / {group.max_members} members</span>
                  <GroupOnlineBadge groupId={group.group_id} />
                  <span>Joined {new Date(group.joined_at).toLocaleDateString()}</span>
                </div>

                <div className="flex gap-2 mt-auto">
                  <Link
                    href={`/groups/${group.group_id}`}
                    className="btn-romance flex-1 text-center text-sm py-2"
                  >
                    View
                  </Link>
                  {(group.is_admin || group.is_owner) && (
                    <Link
                      href={`/groups/${group.group_id}/manage`}
                      className="btn-ghost flex-1 text-center text-sm py-2"
                    >
                      Manage
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
