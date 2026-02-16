'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User, Group } from '@/types/chat.types';
import { groupService } from '@/services/group.service';
import { useToast } from '@/contexts/ToastContext';

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
        myGroupsData.data.groups.forEach((g: any) => myGroupIds.add(g.group_id));
      }

      // Fetch public groups and filter out groups user is already a member of
      const groupsData = await groupService.getPublicGroups();
      if (groupsData.success && groupsData.data && Array.isArray(groupsData.data.groups)) {
        // Only show groups user hasn't joined yet
        const nonMemberGroups = groupsData.data.groups.filter((g: any) => !myGroupIds.has(g.group_id));
        setGroups(nonMemberGroups);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

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
    router.push(`/chat/new?userId=${userId}&anonymous=${isAnonymous}`);
  };

  const handleJoinGroup = async (groupId: string, isAnonymous: boolean = false) => {
    try {
      await groupService.joinGroup(groupId, isAnonymous);
      toast.success('Joined group successfully!');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to join group');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-neutral-100 rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400 font-mono">
            {error || 'LOADING...'}
          </p>
        </div>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center border-4 border-neutral-900 dark:border-neutral-100 p-8 bg-white dark:bg-black">
          <p className="text-neutral-900 dark:text-neutral-100 text-lg mb-4 font-mono">{error}</p>
          <p className="text-neutral-500 dark:text-neutral-500 text-sm font-mono">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header - Blocky Design */}
      <header className="bg-white dark:bg-black border-b-4 border-neutral-900 dark:border-neutral-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 font-mono tracking-tight">
              [BYTE-CHAT]
            </h1>
            <div className="flex items-center gap-2">
              <Link
                href="/chat"
                className="px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 font-mono font-bold hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors border-2 border-neutral-900 dark:border-neutral-100"
              >
                CHATS
              </Link>
              <Link
                href="/my-groups"
                className="px-4 py-2 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
              >
                MY GROUPS
              </Link>
              <Link
                href="/my-identities"
                className="px-4 py-2 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
              >
                🎭 IDENTITIES
              </Link>
              <Link
                href="/profile/edit"
                className="px-4 py-2 bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
              >
                PROFILE
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation - Blocky */}
        <div className="mb-8 flex gap-0 border-2 border-neutral-900 dark:border-neutral-100 w-fit">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-8 py-3 font-mono font-bold transition-colors ${
              activeTab === 'users'
                ? 'bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900'
                : 'bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900'
            }`}
          >
            [USERS]
          </button>
          <div className="w-0.5 bg-neutral-900 dark:bg-neutral-100"></div>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-8 py-3 font-mono font-bold transition-colors ${
              activeTab === 'groups'
                ? 'bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900'
                : 'bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900'
            }`}
          >
            [GROUPS]
          </button>
        </div>

        {/* Search and Filters - Blocky */}
        <div className="mb-8 bg-white dark:bg-black border-4 border-neutral-900 dark:border-neutral-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <input
                type="text"
                placeholder="SEARCH..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border-2 border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:ring-4 focus:ring-neutral-400 dark:focus:ring-neutral-600"
              />
            </div>
            {activeTab === 'users' && (
              <>
                <div>
                  <select
                    value={filterBranch}
                    onChange={(e) => setFilterBranch(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:ring-4 focus:ring-neutral-400 dark:focus:ring-neutral-600"
                  >
                    <option value="all">ALL BRANCHES</option>
                    {branches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={filterGender}
                    onChange={(e) => setFilterGender(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:ring-4 focus:ring-neutral-400 dark:focus:ring-neutral-600"
                  >
                    <option value="all">ALL GENDERS</option>
                    <option value="male">MALE</option>
                    <option value="female">FEMALE</option>
                    <option value="other">OTHER</option>
                  </select>
                </div>
              </>
            )}
            {activeTab === 'groups' && (
              <div className="md:col-span-2 flex justify-end">
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="px-6 py-3 bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors"
                >
                  + CREATE GROUP
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats - Blocky Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800 border-4 border-neutral-900 dark:border-neutral-100 p-6">
            <h3 className="text-neutral-600 dark:text-neutral-400 text-sm font-mono font-bold">
              {activeTab === 'users' ? 'TOTAL USERS' : 'PUBLIC GROUPS'}
            </h3>
            <p className="text-5xl font-bold text-neutral-900 dark:text-neutral-100 mt-2 font-mono">
              {activeTab === 'users' ? users.length : groups.length}
            </p>
          </div>
          {activeTab === 'users' && (
            <>
              <div className="bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800 border-4 border-neutral-900 dark:border-neutral-100 p-6">
                <h3 className="text-neutral-600 dark:text-neutral-400 text-sm font-mono font-bold">BRANCHES</h3>
                <p className="text-5xl font-bold text-neutral-900 dark:text-neutral-100 mt-2 font-mono">{branches.length}</p>
              </div>
              <div className="bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800 border-4 border-neutral-900 dark:border-neutral-100 p-6">
                <h3 className="text-neutral-600 dark:text-neutral-400 text-sm font-mono font-bold">SHOWING</h3>
                <p className="text-5xl font-bold text-neutral-900 dark:text-neutral-100 mt-2 font-mono">{filteredUsers.length}</p>
              </div>
            </>
          )}
          {activeTab === 'groups' && (
            <div className="bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800 border-4 border-neutral-900 dark:border-neutral-100 p-6">
              <h3 className="text-neutral-600 dark:text-neutral-400 text-sm font-mono font-bold">SHOWING</h3>
              <p className="text-5xl font-bold text-neutral-900 dark:text-neutral-100 mt-2 font-mono">{filteredGroups.length}</p>
            </div>
          )}
        </div>

        {/* Content Grid */}
        {activeTab === 'users' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredUsers.map((user) => (
              <div
                key={user.user_id}
                className="bg-white dark:bg-black border-4 border-neutral-900 dark:border-neutral-100 overflow-hidden hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] transition-shadow"
              >
                {/* Profile Picture - Blocky */}
                <div className="relative h-48 bg-gradient-to-br from-neutral-300 to-neutral-400 dark:from-neutral-700 dark:to-neutral-800 border-b-4 border-neutral-900 dark:border-neutral-100">
                  {user.dp_url ? (
                    <img
                      src={user.dp_url}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-900 dark:text-neutral-100 text-7xl font-bold font-mono">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 truncate font-mono">
                    {user.name.toUpperCase()}
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 font-mono">
                    {user.roll_no}
                  </p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-1 font-mono">
                    {user.branch} • {user.gender.toUpperCase()}
                  </p>
                  {user.bio && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 line-clamp-2 font-mono">
                      {user.bio}
                    </p>
                  )}

                  {/* Action Buttons - Blocky */}
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/profile/${user.roll_no}`}
                      className="flex-1 px-3 py-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors text-center text-xs font-bold font-mono"
                    >
                      VIEW
                    </Link>
                    <button
                      onClick={() => handleStartChat(user.user_id, false)}
                      className="flex-1 px-3 py-2 bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors text-xs font-bold font-mono"
                    >
                      CHAT
                    </button>
                  </div>
                  <button
                    onClick={() => handleStartChat(user.user_id, true)}
                    className="w-full mt-2 px-3 py-2 bg-gradient-to-r from-neutral-600 to-neutral-800 dark:from-neutral-400 dark:to-neutral-200 text-neutral-100 dark:text-neutral-900 border-2 border-neutral-900 dark:border-neutral-100 hover:from-neutral-700 hover:to-neutral-900 dark:hover:from-neutral-500 dark:hover:to-neutral-300 transition-all text-xs font-bold font-mono"
                  >
                    ANON
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <div
                key={group.group_id}
                className="bg-white dark:bg-black border-4 border-neutral-900 dark:border-neutral-100 p-6 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                    {group.group_name.toUpperCase()}
                  </h3>
                  <span className="px-2 py-1 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100">
                    PUBLIC
                  </span>
                </div>

                {group.group_dp_url && (
                  <div className="mb-4">
                    <img
                      src={group.group_dp_url}
                      alt={group.group_name}
                      className="w-full h-32 object-cover border-2 border-neutral-900 dark:border-neutral-100"
                    />
                  </div>
                )}
                
                {group.group_desc && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 font-mono line-clamp-3">
                    {group.group_desc}
                  </p>
                )}

                <div className="flex items-center gap-4 mb-4 text-sm text-neutral-600 dark:text-neutral-400 font-mono">
                  <span>{group.member_count} / {group.max_members} MEMBERS</span>
                </div>

                <div className="flex flex-col gap-2">
                  <Link
                    href={`/groups/${group.group_id}`}
                    className="w-full px-4 py-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors text-xs text-center"
                  >
                    VIEW DETAILS
                  </Link>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleJoinGroup(group.group_id, false)}
                      className="flex-1 px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors text-xs"
                    >
                      JOIN
                    </button>
                    <button
                      onClick={() => handleJoinGroup(group.group_id, true)}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-neutral-600 to-neutral-800 dark:from-neutral-400 dark:to-neutral-200 text-neutral-100 dark:text-neutral-900 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:from-neutral-700 hover:to-neutral-900 transition-all text-xs"
                    >
                      JOIN ANON
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty States */}
        {activeTab === 'users' && filteredUsers.length === 0 && (
          <div className="text-center py-12 border-4 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-black">
            <p className="text-neutral-500 dark:text-neutral-400 text-lg font-mono font-bold">NO USERS FOUND</p>
          </div>
        )}

        {activeTab === 'groups' && filteredGroups.length === 0 && (
          <div className="text-center py-12 border-4 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-black">
            <p className="text-neutral-500 dark:text-neutral-400 text-lg font-mono font-bold">NO GROUPS FOUND</p>
          </div>
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
    } catch (error: any) {
      setError(error.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-black border-4 border-neutral-900 dark:border-neutral-100 max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4 font-mono">
          [CREATE GROUP]
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
              placeholder="Enter group name"
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
              placeholder="Enter group description"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-2 font-mono">
              GROUP DISPLAY PICTURE URL
            </label>
            <input
              type="url"
              value={formData.group_dp_url}
              onChange={(e) => setFormData({ ...formData, group_dp_url: e.target.value })}
              className="w-full px-4 py-2 border-2 border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:ring-4 focus:ring-neutral-400"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-2 font-mono">
              MAX MEMBERS (2-500)
            </label>
            <input
              type="number"
              required
              min={2}
              max={500}
              value={formData.max_members}
              onChange={(e) => setFormData({ ...formData, max_members: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border-2 border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:ring-4 focus:ring-neutral-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              className="w-5 h-5 border-2 border-neutral-900 dark:border-neutral-100 accent-neutral-900 dark:accent-neutral-100"
            />
            <label htmlFor="is_public" className="text-sm font-bold text-neutral-900 dark:text-neutral-100 font-mono">
              PUBLIC GROUP
            </label>
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
              {loading ? 'CREATING...' : 'CREATE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
