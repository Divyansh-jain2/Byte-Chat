'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BlockUserButton } from '@/components/ModerationComponents';
import { checkIfBlocked } from '@/services/moderation.service';
import Image from 'next/image';
import QRCode from 'qrcode';

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
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  // const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchProfile = useCallback(async () => {
    try {
      // Fetch current user's profile to check if it's their own profile
      const { API_BASE_URL } = await import('../../../services/apiBase');
      const myProfileResponse = await fetch(`${API_BASE_URL}/api/profile/me`, {
        credentials: 'include'
      });
      const myProfileData = await myProfileResponse.json();
      if (myProfileData.success) {
        setIsOwnProfile(myProfileData.data.roll_no.toUpperCase() === rollNo.toUpperCase());
      }

      // Fetch the requested profile
      const response = await fetch(`${API_BASE_URL}/api/profile/${rollNo}`, {
        credentials: 'include'
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

  const handleShareProfile = async () => {
    try {
      const profileUrl = `${window.location.origin}/profile/${rollNo}`;
      const qrDataUrl = await QRCode.toDataURL(profileUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#1a1a2e',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      });
      setQrCodeUrl(qrDataUrl);
      setShowQRModal(true);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
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
                  style={{ borderColor: 'var(--glass-bg)' }}
                  priority={true} />
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
                  <>
                    <Link href="/profile/edit">
                      <button className="btn-romance px-4 py-2 text-sm">✏️ Edit Profile</button>
                    </Link>
                    <button
                      onClick={handleShareProfile}
                      className="btn-ghost px-4 py-2 text-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share QR
                    </button>
                  </>
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
                    <button
                      onClick={handleShareProfile}
                      className="btn-ghost px-4 py-2 text-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share QR
                    </button>
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

        {/* Social Media Links */}
        {(profile.instagram_url || profile.twitter_url || profile.linkedin_url) && (
          <div className="glass-card rounded-3xl p-5 mb-4 animate-fade-in">
            <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--muted)' }}>SOCIAL LINKS</h2>
            <div className="flex flex-wrap gap-3">
              {profile.instagram_url && (
                <a
                  href={profile.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl glass hover:scale-105 transition-all"
                  style={{ color: 'var(--body)' }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  <span className="text-sm font-medium">Instagram</span>
                </a>
              )}
              {profile.twitter_url && (
                <a
                  href={profile.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl glass hover:scale-105 transition-all"
                  style={{ color: 'var(--body)' }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span className="text-sm font-medium">Twitter</span>
                </a>
              )}
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl glass hover:scale-105 transition-all"
                  style={{ color: 'var(--body)' }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  <span className="text-sm font-medium">LinkedIn</span>
                </a>
              )}
            </div>
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

      {/* QR Code Modal */}
      {showQRModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
          onClick={() => setShowQRModal(false)}
        >
          <div
            className="glass-strong rounded-3xl p-8 max-w-md w-full animate-scale-in relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative gradient blobs */}
            <div className="absolute top-0 left-0 w-32 h-32 rounded-full blur-3xl opacity-30" style={{ background: 'var(--grad-romance)' }}></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-30" style={{ background: 'var(--grad-ocean)' }}></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--heading)' }}>Share Profile</h2>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>Scan to connect</p>
                </div>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="w-10 h-10 rounded-full glass flex items-center justify-center hover:scale-110 transition-all"
                  style={{ color: 'var(--muted)' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* QR Code with profile info */}
              <div className="relative mb-6">
                {/* Gradient border effect */}
                <div className="absolute -inset-1 rounded-3xl blur-sm opacity-75" style={{ background: 'var(--grad-romance)' }}></div>

                <div className="relative bg-white rounded-3xl p-6">
                  {/* Profile info at top */}
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                    {profile.dp_url ? (
                      <Image
                        src={profile.dp_url}
                        alt={profile.name}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold" style={{ background: 'var(--grad-romance)' }}>
                        {profile.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-gray-900">{profile.name}</p>
                      <p className="text-sm text-gray-500">{profile.roll_no}</p>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="flex items-center justify-center">
                    {qrCodeUrl && (
                      <div className="relative">
                        <Image
                          src={qrCodeUrl}
                          alt="Profile QR Code"
                          width={280}
                          height={280}
                          className="w-full h-auto"
                        />
                        {/* Center logo overlay */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg" style={{ background: 'var(--grad-romance)' }}>
                            {profile.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer text */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-center text-xs text-gray-500 font-medium">
                      Scan with camera to view profile
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.download = `${rollNo}-profile-qr.png`;
                    link.href = qrCodeUrl;
                    link.click();
                  }}
                  className="btn-romance flex-1 px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download QR
                </button>
                <button
                  onClick={() => {
                    const profileUrl = `${window.location.origin}/profile/${rollNo}`;
                    navigator.clipboard.writeText(profileUrl);
                  }}
                  className="btn-ghost px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
