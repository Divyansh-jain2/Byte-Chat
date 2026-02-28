'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BlockUserButton } from '@/components/ModerationComponents';
import { checkIfBlocked } from '@/services/moderation.service';
import Image from 'next/image';

export default function ViewProfile() {
  const params = useParams();
  const router = useRouter();
  const rollNo = params.rollNo as string;
  // need proper error handling
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');
  const [, setBlockedByOther] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const fetchProfile = useCallback ( async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      // Fetch current user's profile to check if it's their own profile
      const myProfileResponse = await fetch('http://localhost:3001/api/profile/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const myProfileData = await myProfileResponse.json();
      if (myProfileData.success) {
        setIsOwnProfile(myProfileData.data.roll_no.toUpperCase() === rollNo.toUpperCase());
      }
      
      // Fetch the requested profile
      const response = await fetch(`http://localhost:3001/api/profile/${rollNo}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.status === 403) {
        // User is blocked by the profile owner
        setBlockedByOther(true);
        setError(data.message || 'This user has blocked you');
        setIsLoading(false);
        return;
      }

      if (data.success) {
        setProfile(data.data);
        
        // Check if current user blocked this profile
        if (data.blocked) {
          setBlockMessage(data.blockMessage || 'You have blocked this user');
        }

        // Check block status if not own profile
        if (!isOwnProfile && data.data.user_id) {
          try {
            const blockStatus = await checkIfBlocked(data.data.user_id);
            setIsBlocked(blockStatus.data.isBlocked);
          } catch (err) {
            console.error('Failed to check block status:', err);
          }
        }
      } else {
        setError(data.message || 'Failed to fetch profile');
      }
    } 
    catch (err) {
      setError('Failed to load profile');
      console.log(err);
    } 
    finally {
      setIsLoading(false);
    }
  }, [rollNo, isOwnProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);


  const handleBlockStatusChange = () => {
    fetchProfile(); // Refresh profile after blocking/unblocking
  };

  const handleStartChat = (userId: string, isAnonymous: boolean = false) => {
    if (navigating) return; // Prevent double-clicks
    setNavigating(true);
    router.push(`/chat/new?userId=${userId}&anonymous=${isAnonymous}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mesh-warm flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full border-4 border-transparent mx-auto mb-4 animate-spin"
            style={{ borderTopColor: 'var(--pink)', borderRightColor: 'var(--coral)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Loading profile…</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-mesh-warm flex items-center justify-center p-4">
        <div className="glass-strong rounded-3xl p-8 text-center max-w-sm animate-scale-in">
          <div className="text-4xl mb-4">😕</div>
          <p className="font-semibold mb-6" style={{ color: 'var(--heading)' }}>{error || 'Profile not found'}</p>
          <button onClick={() => router.back()} className="btn-romance px-6 py-2.5">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh-warm antialiased">
      {/* Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-linear-to-br from-pink-300/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 bg-linear-to-tr from-purple-300/10 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Nav bar */}
      <header className="glass-nav sticky top-0 z-20 px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="btn-ghost w-9 h-9 rounded-full flex items-center justify-center text-lg">←</button>
        <p className="font-semibold text-sm" style={{ color: 'var(--heading)' }}>Profile</p>
        <div className="w-9" /> {/* spacer */}
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Cover + avatar */}
        <div className="glass-strong rounded-3xl overflow-hidden mb-4 animate-fade-in">
          {/* Cover */}
          <div className="h-28 w-full" style={{ background: 'var(--grad-romance)' }} />
          {/* Profile content */}
          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="-mt-12 mb-4">
              {profile.dp_url ? (
                <Image src={profile.dp_url} alt={profile.name} width={96} height={96}
                  className="w-24 h-24 rounded-2xl object-cover border-4 shadow-xl"
                  style={{ borderColor: 'var(--glass-bg)' }} />
              ) : (
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-3xl font-bold border-4 shadow-xl"
                  style={{ background: 'var(--grad-romance)', borderColor: 'var(--glass-bg)' }}>
                  {profile.name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </div>

            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--heading)' }}>{profile.name}</h1>
                <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>{profile.roll_no}</p>
                <div className="flex flex-wrap gap-2">
                  {profile.branch && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400">{profile.branch}</span>
                  )}
                  {profile.gender && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--grad-romance)', color: '#fff' }}>{profile.gender}</span>
                  )}
                  {profile.is_verified && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400">✓ Verified</span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 mt-1">
                {isOwnProfile ? (
                  <Link href="/profile/edit">
                    <button className="btn-romance px-4 py-2 text-sm">✏️ Edit Profile</button>
                  </Link>
                ) : (
                  <>
                    {blockMessage && (
                      <div className="glass rounded-xl px-3 py-2 text-xs text-yellow-400 text-center">🚫 {blockMessage}</div>
                    )}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleStartChat(profile.user_id, false)}
                        disabled={isBlocked || navigating}
                        className="btn-romance px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        💬 Message
                      </button>
                      <button 
                        onClick={() => handleStartChat(profile.user_id, true)}
                        disabled={isBlocked || navigating}
                        className="btn-purple px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        🎭 Anon
                      </button>
                    </div>
                    <div>
                      <BlockUserButton userId={profile.user_id} userName={profile.name}
                        isBlocked={isBlocked} onBlockStatusChange={handleBlockStatusChange} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="glass-card rounded-3xl p-5 mb-4 animate-fade-in">
            <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--muted)' }}>ABOUT</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--body)' }}>{profile.bio}</p>
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3 animate-fade-in">
          {profile.dob && (
            <div className="glass-card rounded-2xl p-4">
              <p className="text-xs mb-1 font-medium" style={{ color: 'var(--muted)' }}>Birthday</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--heading)' }}>
                {new Date(profile.dob).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </p>
            </div>
          )}
          <div className="glass-card rounded-2xl p-4">
            <p className="text-xs mb-1 font-medium" style={{ color: 'var(--muted)' }}>Member Since</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--heading)' }}>
              {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          </div>
          {profile.last_login && (
            <div className="glass-card rounded-2xl p-4">
              <p className="text-xs mb-1 font-medium" style={{ color: 'var(--muted)' }}>Last Active</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--heading)' }}>
                {new Date(profile.last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
