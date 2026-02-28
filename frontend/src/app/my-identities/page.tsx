'use client';

import { useState, useEffect } from 'react';

type TabType = 'all' | 'chat' | 'group';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { getMyAnonymousIdentities, revealAnonymousIdentity, AnonymousIdentity } from '@/services/anonymous.service';
import Image from 'next/image';

export default function MyAnonymousIdentities() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();

  const [identities, setIdentities] = useState<AnonymousIdentity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<TabType>('all');
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [confirmRevealId, setConfirmRevealId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null); // Added error state

  useEffect(() => {
    fetchIdentities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchIdentities = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getMyAnonymousIdentities();

      if (response.success) {
        setIdentities(response.data);
      } else {
        setError(response.message || 'Failed to fetch identities');
        toast.error(response.message || 'Failed to fetch identities');
      }
    } 
    // catch (err: any) {
    //   setError(err.message || 'Failed to load anonymous identities');
    //   toast.error(err.message || 'Failed to load anonymous identities');
    // } 
    catch (err: unknown) {
      let errorMsg = 'Failed to load anonymous identities';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        errorMsg = (err as { message: string }).message;
      }
      setError(errorMsg);
      toast.error(errorMsg);
    }
    finally {
      setIsLoading(false);
    }
  };

  const handleRevealIdentity = async (identityId: string) => {
    // First click: Ask for confirmation
    if (confirmRevealId !== identityId) {
      setConfirmRevealId(identityId);
      toast.warning('Click reveal again to confirm. This cannot be undone!');
      // Auto-cancel after 5 seconds
      setTimeout(() => {
        setConfirmRevealId(null);
      }, 5000);
      return;
    }

    // Second click: Actually reveal
    try {
      setRevealingId(identityId);
      setConfirmRevealId(null);
      const response = await revealAnonymousIdentity(identityId);

      if (response.success) {
        toast.success('Identity revealed! Your next message will show your profile.');
        fetchIdentities(); // Refresh list
      } else {
        toast.error(response.message || 'Failed to reveal identity');
      }
    } 
    // catch (err: any) {
    //   toast.error(err.message || 'Failed to reveal identity');
    // } 
    catch (err: unknown) {
      let errorMsg = 'Failed to reveal identity';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        errorMsg = (err as { message: string }).message;
      }
      setError(errorMsg);
      toast.error(errorMsg);
    }
    finally {
      setRevealingId(null);
    }
  };

  const handleNavigateToChat = (identity: AnonymousIdentity) => {
    // Cancel any pending confirmation when navigating
    if (confirmRevealId) {
      setConfirmRevealId(null);
    }
    
    if (identity.conversation_id) {
      // Direct navigation to existing conversation
      toast.info('Opening 1V1 chat...');
      router.push(`/chat/${identity.conversation_id}`);
    } else if (identity.group_id) {
      // Navigate to group chat
      toast.info('Opening group chat...');
      router.push(`/groups/${identity.group_id}/chat`);
    } else {
      toast.warning('Unable to navigate to chat');
    }
  };

  const filteredIdentities = filter === 'all'
    ? identities
    : filter === 'chat'
    ? identities.filter(i => !i.group_id)
    : identities.filter(i => i.group_id);

  // Badge counts
  const chatCount = identities.filter(i => !i.group_id).length;
  const groupCount = identities.filter(i => i.group_id).length;

  const tabLabels: Record<TabType, string> = { all: 'All', chat: '1V1 Chats', group: 'Groups' };
  const tabCounts: Record<TabType, number> = { all: identities.length, chat: chatCount, group: groupCount };

  return (
    <div className="min-h-screen bg-mesh-warm antialiased">
      {/* Gradient blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-linear-to-br from-purple-400/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-[-5%] left-[-3%] w-80 h-80 bg-linear-to-br from-pink-400/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-linear-to-br from-indigo-400/10 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <header className="glass-nav sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-ghost px-3 py-2 text-sm flex items-center gap-2"
            >
              <span>←</span> Back
            </button>
            <div>
              <h1 className="text-xl font-bold heading-romance">My Identities</h1>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Your anonymous personas</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="btn-ghost w-10 h-10 rounded-full flex items-center justify-center text-lg"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* Hero strip */}
        <div className="glass-strong rounded-3xl p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: 'var(--grad-mystery)' }}>
              🎭
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--heading)' }}>
                Anonymous Identities
              </h2>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {identities.length} active persona{identities.length !== 1 ? 's' : ''} · Click any card to open the chat
              </p>
            </div>
          </div>
          {/* Stats */}
          <div className="flex gap-3">
            {[
              { label: 'Total', value: identities.length, color: 'var(--purple)' },
              { label: '1V1', value: chatCount, color: 'var(--pink)' },
              { label: 'Groups', value: groupCount, color: '#22c55e' },
            ].map(s => (
              <div key={s.label} className="glass rounded-2xl px-4 py-3 text-center min-w-15">
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="glass rounded-2xl p-1.5 flex gap-1 mb-8 w-fit animate-fade-in">
          {(['all', 'chat', 'group'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                filter === tab
                  ? 'text-white shadow-lg'
                  : 'hover:bg-white/10'
              }`}
              style={filter === tab ? { background: 'var(--grad-mystery)' } : { color: 'var(--muted)' }}
            >
              {tabLabels[tab]}
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                filter === tab ? 'bg-white/20 text-white' : 'bg-white/10'
              }`}
                style={filter !== tab ? { color: 'var(--muted)' } : {}}>
                {tabCounts[tab]}
              </span>
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="glass rounded-2xl p-4 mb-6 border border-red-400/30 bg-red-500/10 text-red-400 animate-fade-in">
            ⚠️ {error}
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card rounded-3xl p-6 animate-pulse">
                <div className="flex justify-between mb-4">
                  <div className="skeleton h-6 w-24 rounded-full" />
                  <div className="skeleton h-5 w-16 rounded" />
                </div>
                <div className="skeleton h-5 w-full rounded mb-2" />
                <div className="skeleton h-4 w-20 rounded mb-4" />
                <div className="glass rounded-2xl p-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="skeleton w-8 h-8 rounded-full" />
                    <div className="flex-1">
                      <div className="skeleton h-4 w-24 rounded mb-1" />
                      <div className="skeleton h-3 w-16 rounded" />
                    </div>
                  </div>
                </div>
                <div className="skeleton h-3 w-28 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredIdentities.length === 0 && (
          <div className="glass-strong rounded-3xl p-16 text-center animate-scale-in">
            <div className="text-6xl mb-4">🎭</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--heading)' }}>
              No anonymous identities yet
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
              Send an anonymous message or join a group anonymously to create one
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-purple"
            >
              Explore Students & Groups
            </button>
          </div>
        )}

        {/* Identities Grid */}
        {!isLoading && filteredIdentities.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIdentities.map((identity, idx) => (
              <div
                key={identity.identity_id}
                className={`glass-card rounded-3xl p-6 cursor-pointer hover:scale-[1.02] transition-all duration-200 animate-fade-in ${
                  confirmRevealId === identity.identity_id
                    ? 'ring-2 ring-red-400/60'
                    : ''
                }`}
                style={{ animationDelay: `${idx * 60}ms` }}
                onClick={() => handleNavigateToChat(identity)}
                title="Click to open conversation"
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    identity.group_id
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-purple-500/15 text-purple-400'
                  }`}>
                    {identity.group_id ? '👥 Group' : '💬 1V1 Chat'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRevealIdentity(identity.identity_id);
                    }}
                    disabled={revealingId === identity.identity_id || identity.is_revealed}
                    className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                      identity.is_revealed
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                        : revealingId === identity.identity_id
                        ? 'bg-white/5 text-gray-400'
                        : confirmRevealId === identity.identity_id
                        ? 'bg-red-500/20 text-red-400 animate-pulse'
                        : 'bg-orange-500/15 text-orange-400 hover:bg-orange-500/25'
                    }`}
                  >
                    {identity.is_revealed
                      ? '✓ Revealed'
                      : revealingId === identity.identity_id
                      ? 'Revealing…'
                      : confirmRevealId === identity.identity_id
                      ? '⚠️ Confirm?'
                      : '🔓 Reveal'}
                  </button>
                </div>

                {/* Anon string */}
                <div className="mb-4">
                  <p className="font-mono text-sm font-bold mb-1 truncate" style={{ color: 'var(--purple)' }}>
                    {identity.random_string.substring(0, 24)}…
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {identity.display_gender}
                  </p>
                </div>

                {/* Target info */}
                <div className="glass rounded-2xl p-3 mb-4">
                  {identity.target_user_id && identity.target_user && (
                    <div className="flex items-center gap-3">
                      <Image
                        src={identity.target_user.dp_url || '/default-avatar.png'}
                        alt={identity.target_user.name}
                        width={36}
                        height={36}
                        className="rounded-full object-cover ring-2 ring-white/20"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--heading)' }}>
                          {identity.target_user.name}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                          {identity.target_user.roll_no}
                        </p>
                      </div>
                    </div>
                  )}
                  {identity.group_id && identity.target_group && (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
                        style={{ background: 'var(--grad-ocean)' }}>
                        👥
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--heading)' }}>
                          {identity.target_group.group_name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>
                          {identity.target_group.is_public ? '🌐 Public' : '🔒 Private'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-light)' }}>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {new Date(identity.created_at).toLocaleDateString()}
                  </p>
                  <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--pink)' }}>
                    Open chat <span>→</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
