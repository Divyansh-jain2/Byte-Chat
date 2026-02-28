'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User, Group } from '@/types/chat.types';
import { groupService } from '@/services/group.service';
import { useToast } from '@/contexts/ToastContext';
import { useTheme } from '@/contexts/ThemeContext';
import Image from 'next/image';
import './dashboard.css';

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback( async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      // Fetch users
      const usersResponse = await fetch('http://localhost:3001/api/profile/all', {
        credentials: 'include',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      if (usersResponse.status === 401) {
        setError('Please login to continue');
        setTimeout(() => router.push('/login'), 1500);
        return;
      }
      
      const usersData = await usersResponse.json();
      if (usersData.success && usersData.data && Array.isArray(usersData.data.users)) {
        setUsers(usersData.data.users);
      }

      // Fetch my groups to filter them out from public groups
      const myGroupsData = await groupService.getMyGroups();
      const myGroupIds = new Set<string>();
      if (myGroupsData.success && myGroupsData.data && Array.isArray(myGroupsData.data.groups)) {
        setMyGroups(myGroupsData.data.groups);
        myGroupsData.data.groups.forEach((g: Group) => myGroupIds.add(g.group_id));
      }

      // Fetch public groups and filter out groups user is already a member of
      const groupsData = await groupService.getPublicGroups();
      if (groupsData.success && groupsData.data && Array.isArray(groupsData.data.groups)) {
        // Only show groups user hasn't joined yet
        const nonMemberGroups = groupsData.data.groups.filter((g: Group) => !myGroupIds.has(g.group_id));
        setGroups(nonMemberGroups);
      }
    } 
    catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to connect to server');
    } 
    finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.roll_no.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBranch = filterBranch === 'all' || user.branch === filterBranch;
    const matchesGender = filterGender === 'all' || user.gender === filterGender;
    return matchesSearch && matchesBranch && matchesGender;
  });

  const filteredGroups = groups.filter((group) => {
    return group.group_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (group.group_desc && group.group_desc.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const branches = [...new Set(users.map((u) => u.branch))];

  const handleStartChat = (userId: string, isAnonymous: boolean = false) => {
    if (navigating) return; // Prevent double-clicks
    setNavigating(true);
    router.push(`/chat/new?userId=${userId}&anonymous=${isAnonymous}`);
  };

  const handleJoinGroup = async (groupId: string, isAnonymous: boolean = false) => {
    try {
      await groupService.joinGroup(groupId, isAnonymous);
      toast.success('Joined group successfully!');
      fetchData();
    } 
    catch (err: unknown) {
      let errorMsg = 'Failed to join group';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        errorMsg = (err as { message: string }).message;
      }
      // setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-mesh-warm flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full border-4 border-t-transparent mx-auto mb-4 animate-spin" style={{ borderColor: 'var(--pink)', borderTopColor: 'transparent' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Loading campus…</p>
        </div>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="min-h-screen bg-mesh-warm flex items-center justify-center px-5">
        <div className="glass-strong rounded-3xl p-8 text-center max-w-sm animate-scale-in">
          <p className="text-lg font-bold mb-2" style={{ color: 'var(--heading)' }}>{error}</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh-warm antialiased">
      {/* Fixed blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-125 h-125 bg-linear-to-br from-pink-300/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-linear-to-br from-purple-300/10 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Sticky Nav */}
      <header className="glass-nav sticky top-0 z-40 px-5 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--grad-romance)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-lg font-bold" style={{ color: 'var(--heading)' }}>Byte<span className="text-gradient-romance">Chat</span></span>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/chat" className="px-4 py-2 rounded-xl text-sm font-semibold glass transition-all hover:scale-105" style={{ color: 'var(--body)' }}>💬 Chats</Link>
            <Link href="/my-groups" className="px-4 py-2 rounded-xl text-sm font-semibold glass transition-all hover:scale-105" style={{ color: 'var(--body)' }}>👥 My Groups</Link>
            <Link href="/my-identities" className="px-4 py-2 rounded-xl text-sm font-semibold glass transition-all hover:scale-105" style={{ color: 'var(--purple)' }}>🎭 Identities</Link>
            <Link href="/profile/edit" className="px-4 py-2 rounded-xl text-sm font-semibold btn-romance">Profile</Link>
            {mounted && (
              <button
                onClick={toggleTheme}
                className="px-3 py-2 rounded-xl text-sm font-semibold glass transition-all hover:scale-105"
                style={{ color: 'var(--body)' }}
                aria-label="Toggle theme"
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-8">
        {/* Top controls row */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center justify-between">
          {/* Pill Tabs */}
          <div className="glass rounded-2xl p-1 flex gap-1">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'users' ? 'btn-romance shadow-md' : ''}`}
              style={activeTab !== 'users' ? { color: 'var(--body)' } : {}}
            >
              👤 Students
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'groups' ? 'btn-romance shadow-md' : ''}`}
              style={activeTab !== 'groups' ? { color: 'var(--body)' } : {}}
            >
              👥 Groups
            </button>
          </div>

          {/* Search + filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <svg className="dashboard-search-icon w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder={activeTab === 'users' ? 'Search students…' : 'Search groups…'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="dashboard-search-input" />
            </div>
            {activeTab === 'users' && (
              <>
                <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="select-romance">
                  <option value="all">All Branches</option>
                  {branches.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} className="select-romance">
                  <option value="all">All Genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </>
            )}
            {activeTab === 'groups' && (
              <button onClick={() => setShowCreateGroup(true)} className="btn-romance px-5 py-2.5 text-sm font-semibold">+ Create Group</button>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4 mb-7">
          {[
            { label: activeTab === 'users' ? 'Total Students' : 'Public Groups', value: activeTab === 'users' ? users.length : groups.length, color: 'var(--pink)' },
            { label: activeTab === 'users' ? 'Branches' : 'Shown', value: activeTab === 'users' ? branches.length : filteredGroups.length, color: 'var(--coral)' },
            { label: 'Showing', value: activeTab === 'users' ? filteredUsers.length : filteredGroups.length, color: 'var(--purple)' },
          ].map((s) => (
            <div key={s.label} className="glass-card rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* User Cards */}
        {activeTab === 'users' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredUsers.map((user) => (
                <div key={user.user_id} className="glass-card rounded-2xl overflow-hidden flex flex-col">
                  {/* Avatar */}
                  <div className="relative h-40 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(255,107,157,.15),rgba(168,85,247,.15))' }}>
                    {user.dp_url ? (
                      <Image src={user.dp_url} alt={user.name} width={112} height={112} className="w-28 h-28 rounded-full object-cover ring-4 ring-white/60" />
                    ) : (
                      <div className="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-extrabold text-white ring-4 ring-white/40" style={{ background: 'var(--grad-romance)' }}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                  </div>
                  {/* Info */}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-base truncate" style={{ color: 'var(--heading)' }}>{user.name}</h3>
                    <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--pink)' }}>{user.roll_no}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{user.branch} · {user.gender}</p>
                    {user.bio && <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--body)' }}>{user.bio}</p>}
                    {/* Buttons */}
                    <div className="mt-auto pt-4 flex gap-2">
                      <Link href={`/profile/${user.roll_no}`} className="flex-1 py-2 rounded-xl text-xs font-semibold text-center glass transition-all hover:scale-105" style={{ color: 'var(--body)' }}>View</Link>
                      <button onClick={() => handleStartChat(user.user_id, false)} disabled={navigating} className="flex-1 py-2 rounded-xl text-xs font-semibold btn-romance disabled:opacity-60">Chat</button>
                    </div>
                    <button onClick={() => handleStartChat(user.user_id, true)} disabled={navigating} className="mt-2 w-full py-2 rounded-xl text-xs font-semibold btn-purple disabled:opacity-60">🎭 Chat Anonymously</button>
                  </div>
                </div>
              ))}
            </div>
            {filteredUsers.length === 0 && (
              <div className="glass-strong rounded-2xl p-12 text-center">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-semibold" style={{ color: 'var(--heading)' }}>No students found</p>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Try adjusting your filters</p>
              </div>
            )}
          </>
        )}

        {/* Group Cards */}
        {activeTab === 'groups' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredGroups.map((group) => (
                <div key={group.group_id} className="glass-card rounded-2xl p-5 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    {group.group_dp_url ? (
                      <Image src={group.group_dp_url} alt={group.group_name} width={48} height={48} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl text-white shrink-0" style={{ background: 'var(--grad-ocean)' }}>
                        {group.group_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base truncate" style={{ color: 'var(--heading)' }}>{group.group_name}</h3>
                        <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(59,130,246,.15)', color: '#3B82F6' }}>Public</span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{group.member_count}/{group.max_members} members</p>
                    </div>
                  </div>
                  {group.group_desc && <p className="text-sm line-clamp-2" style={{ color: 'var(--body)' }}>{group.group_desc}</p>}
                  <div className="flex gap-2 mt-auto">
                    <Link href={`/groups/${group.group_id}`} className="flex-1 py-2 rounded-xl text-xs font-semibold text-center glass transition-all hover:scale-105" style={{ color: 'var(--body)' }}>Details</Link>
                    <button onClick={() => handleJoinGroup(group.group_id, false)} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: 'var(--grad-ocean)' }}>Join</button>
                    <button onClick={() => handleJoinGroup(group.group_id, true)} className="flex-1 py-2 rounded-xl text-xs font-semibold btn-purple">🎭 Anon</button>
                  </div>
                </div>
              ))}
            </div>
            {filteredGroups.length === 0 && (
              <div className="glass-strong rounded-2xl p-12 text-center">
                <p className="text-4xl mb-3">👥</p>
                <p className="font-semibold" style={{ color: 'var(--heading)' }}>No groups found</p>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Create the first group!</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onSuccess={() => {
            setShowCreateGroup(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

// Create Group Modal Component
function CreateGroupModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    group_name: '',
    group_desc: '',
    group_dp_url: '',
    is_public: true,
    max_members: 500
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await groupService.createGroup(formData);
      onSuccess();
    } catch (error: unknown) {
      console.error('Failed to create group', error);
      let message = 'Failed to create group';
      if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: string }).message === 'string') {
        message = (error as { message: string }).message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
      <div className="glass-strong rounded-3xl p-8 w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold" style={{ color: 'var(--heading)' }}>Create Group ✨</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl glass flex items-center justify-center hover:scale-110 transition-transform" style={{ color: 'var(--muted)' }}>✕</button>
        </div>

        {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#991B1B' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--heading)' }}>Group Name *</label>
            <input type="text" required value={formData.group_name} onChange={(e) => setFormData({ ...formData, group_name: e.target.value })} className="input-romance" placeholder="e.g. CSE 2024" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--heading)' }}>Description</label>
            <textarea value={formData.group_desc} onChange={(e) => setFormData({ ...formData, group_desc: e.target.value })} className="input-romance resize-none" placeholder="What's this group about?" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--heading)' }}>Cover Image URL</label>
            <input type="url" value={formData.group_dp_url} onChange={(e) => setFormData({ ...formData, group_dp_url: e.target.value })} className="input-romance" placeholder="https://…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--heading)' }}>Max Members</label>
              <input type="number" required min={2} max={500} value={formData.max_members} onChange={(e) => setFormData({ ...formData, max_members: parseInt(e.target.value) })} className="input-romance" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={formData.is_public} onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })} className="w-5 h-5 rounded accent-pink-500" />
                <span className="text-sm font-semibold" style={{ color: 'var(--heading)' }}>Public</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl text-sm font-semibold glass transition-all hover:scale-105" style={{ color: 'var(--body)' }}>Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-2xl text-sm font-semibold btn-romance disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <><svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Creating…</> : 'Create Group →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
