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

  return (
    <div className={`min-h-screen p-6 ${
      theme === 'dark'
        ? 'bg-linear-to-br from-gray-900 via-purple-900 to-gray-900'
        : 'bg-linear-to-br from-blue-50 via-purple-50 to-pink-50'
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
          {(['all', 'chat', 'group'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                filter === tab
                  ? 'bg-linear-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : theme === 'dark'
                  ? 'text-gray-300 hover:bg-white/10'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-300 text-gray-800">
                {tab === 'all'
                  ? identities.length
                  : tab === 'chat'
                  ? chatCount
                  : groupCount}
              </span>
            </button>
          ))}
        </div>

        {/* Loading State */}
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
              className={`backdrop-blur-md rounded-xl p-6 border transition-all hover:scale-105 cursor-pointer shadow-lg hover:shadow-2xl ${
                confirmRevealId === identity.identity_id
                  ? 'ring-2 ring-red-500 ring-offset-2'
                  : ''
              } ${
                theme === 'dark'
                  ? 'bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30'
                  : 'bg-white/60 border-white/40 hover:bg-white/70 hover:border-white/50'
              }`}
              onClick={() => handleNavigateToChat(identity)}
              title="Click to open conversation"
            >
              {/* Identity Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  identity.group_id
                    ? 'bg-green-500/20 text-green-300'
                    : 'bg-blue-500/20 text-blue-300'
                }`}>
                  {identity.group_id ? '👥 Group' : '💬 1V1 Chat'}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRevealIdentity(identity.identity_id);
                  }}
                  disabled={revealingId === identity.identity_id || identity.is_revealed}
                  className={`text-xs transition-colors ${identity.is_revealed ? 
                    'text-gray-500 cursor-not-allowed'
                  : revealingId === identity.identity_id
                    ? 'text-gray-400'                      
                    : confirmRevealId === identity.identity_id                      
                    ? 'text-red-400 hover:text-red-300 font-bold animate-pulse'                      
                    : 'text-orange-400 hover:text-orange-300'                  
                  }`}
                >
                  {identity.is_revealed
                    ? 'Revealed ✓'
                    : revealingId === identity.identity_id
                    ? 'Revealing...'
                    : confirmRevealId === identity.identity_id
                    ? 'Click to Confirm! ⚠️'
                    : 'Reveal 🔓'}
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
                {identity.target_user_id && identity.target_user && (
                  <div className="flex items-center gap-3">
                    <Image
                      src={identity.target_user.dp_url || '/default-avatar.png'}
                      alt={identity.target_user.name}
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
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
                {identity.group_id && identity.target_group && (
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
              
              {/* Click to open indicator */}
              <div className={`mt-3 pt-3 border-t flex items-center justify-center gap-2 ${
                theme === 'dark' ? 'border-white/10 text-gray-400' : 'border-gray-300 text-gray-500'
              }`}>
                <span className="text-xs">Click to open chat</span>
                <span className="text-sm">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
