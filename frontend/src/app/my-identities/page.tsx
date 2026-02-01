'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

export default function MyAnonymousIdentities() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  
  const [identities, setIdentities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'chat' | 'group'>('all');

  useEffect(() => {
    fetchIdentities();
  }, []);

  const fetchIdentities = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:3001/api/anonymous/my-identities', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setIdentities(data.data);
      } else {
        setError(data.message || 'Failed to fetch identities');
      }
    } catch (err) {
      setError('Failed to load anonymous identities');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevealIdentity = async (identityId: string) => {
    if (!confirm('Are you sure you want to reveal your identity? This cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:3001/api/anonymous/reveal/${identityId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        alert('Identity revealed! Your next message will show your profile.');
        fetchIdentities(); // Refresh list
      } else {
        alert(data.message || 'Failed to reveal identity');
      }
    } catch (err) {
      alert('Failed to reveal identity');
    }
  };

  const handleNavigateToChat = (identity: any) => {
    if (identity.target_user !== null) {
      router.push(`/chat/${identity.conversation_id}`);
    } else {
      router.push(`/groups/${identity.target_group.group_id}`);
    }
  };

  const filteredIdentities = filter === 'all' 
    ? identities 
    : filter === 'chat'
    ? identities.filter(i => i.target_user !== null)
    : identities.filter(i => i.target_group !== null);

  return (
    <div className={`min-h-screen p-6 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
    }`}>
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-4xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>
              My Anonymous Identities 🎭
            </h1>
            <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
              Manage all your anonymous personas in chats and groups
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className={`px-4 py-2 rounded-lg backdrop-blur-md transition-all ${
                theme === 'dark'
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-white/50 hover:bg-white/70 text-gray-800'
              }`}
            >
              ← Back
            </button>
            <button
              onClick={toggleTheme}
              className={`p-3 rounded-lg backdrop-blur-md transition-all ${
                theme === 'dark'
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-white/50 hover:bg-white/70 text-gray-800'
              }`}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className={`flex gap-2 mb-6 p-2 rounded-lg backdrop-blur-md ${
          theme === 'dark' ? 'bg-white/10' : 'bg-white/50'
        }`}>
          {['all', 'chat', 'group'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab as any)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                filter === tab
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : theme === 'dark'
                  ? 'text-gray-300 hover:bg-white/10'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                filter === tab ? 'bg-white/20' : 'bg-black/10'
              }`}>
                {tab === 'all' ? identities.length : tab === 'chat' ? identities.filter(i => i.target_user !== null).length : identities.filter(i => i.target_group !== null).length}
              </span>
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 backdrop-blur-sm mb-6">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredIdentities.length === 0 && (
          <div className={`text-center py-20 backdrop-blur-md rounded-2xl ${
            theme === 'dark' ? 'bg-white/5' : 'bg-white/40'
          }`}>
            <p className={`text-xl mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              No anonymous identities yet
            </p>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
              Send an anonymous message or join a group anonymously to create one
            </p>
          </div>
        )}

        {/* Identities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIdentities.map((identity) => (
            <div
              key={identity.identity_id}
              className={`backdrop-blur-md rounded-xl p-6 border transition-all hover:scale-105 cursor-pointer ${
                theme === 'dark'
                  ? 'bg-white/10 border-white/20 hover:bg-white/15'
                  : 'bg-white/60 border-white/40 hover:bg-white/70'
              }`}
              onClick={() => handleNavigateToChat(identity)}
            >
              {/* Identity Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  identity.target_user !== null
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-green-500/20 text-green-300'
                }`}>
                  {identity.target_user !== null ? '💬 1-on-1 Chat' : '👥 Group'}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRevealIdentity(identity.identity_id);
                  }}
                  className="text-xs text-orange-400 hover:text-orange-300"
                >
                  Reveal 🔓
                </button>
              </div>

              {/* Anonymous String */}
              <div className="mb-4">
                <p className={`text-lg font-mono font-bold mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>
                  {identity.random_string.substring(0, 20)}...
                </p>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {identity.display_gender}
                </p>
              </div>

              {/* Target Info */}
              <div className={`p-3 rounded-lg mb-4 ${
                theme === 'dark' ? 'bg-white/5' : 'bg-white/50'
              }`}>
                {identity.target_user !== null && identity.target_user && (
                  <div className="flex items-center gap-3">
                    <img
                      src={identity.target_user.dp_url || '/default-avatar.png'}
                      alt={identity.target_user.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        {identity.target_user.name}
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {identity.target_user.roll_no}
                      </p>
                    </div>
                  </div>
                )}
                {identity.target_group !== null && identity.target_group && (
                  <div>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      {identity.target_group.group_name}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {identity.target_group.is_public ? '🌐 Public' : '🔒 Private'}
                    </p>
                  </div>
                )}
              </div>

              {/* Created Date */}
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Created: {new Date(identity.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
