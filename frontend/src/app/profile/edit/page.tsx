'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProfileImageManager from '@/components/ProfileImageManager';
import Image from 'next/image';
import { useToast } from '@/contexts/ToastContext';
import { useTheme } from '@/contexts/ThemeContext';
import '../profile.css';

interface UserProfile {
  user_id: string;
  roll_no: string;
  name: string;
  gender: string;
  branch: string;
  dob: string | null;
  bio: string | null;
  dp_url: string | null;
  created_at: string;
  is_verified: boolean;
}

interface UserSettings {
  theme_mode: string;
  email_notifications: boolean;
  push_notifications: boolean;
  privacy_profile_public: boolean;
  privacy_show_online_status: boolean;
  privacy_show_last_seen: boolean;
}

interface BlockedUser {
  blocked_id: string;
  roll_no: string | null;
  name: string;
  gender: string;
  dp_url: string | null;
  block_reason: string | null;
  created_at: string;
  is_anonymous_block: boolean;
}

export default function ProfileEditPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [, setSettings] = useState<UserSettings | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'personal' | 'settings' | 'privacy' | 'blocks' | 'security'>('personal');
  // Remove message state, use toast instead
  const { success: toastSuccess, error: toastError, info: toastInfo, warning: toastWarning } = useToast();

  // Form states
  const [bio, setBio] = useState('');
  const [dob, setDob] = useState('');
  const [dpUrl, setDpUrl] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [privacyProfilePublic, setPrivacyProfilePublic] = useState(true);
  const [privacyShowOnlineStatus, setPrivacyShowOnlineStatus] = useState(true);
  const [privacyAllowAnonymousChats, setPrivacyAllowAnonymousChats] = useState(true);
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch profile
      const profileRes = await fetch('http://localhost:3001/api/profile/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const profileData = await profileRes.json();

      if (profileData.success) {
        const p = profileData.data;
        setProfile(p);
        setBio(p.bio || '');
        // Handle date properly - extract just the date part
        if (p.dob) {
          const date = new Date(p.dob);
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          setDob(`${year}-${month}-${day}`);
        } else {
          setDob('');
        }
        setDpUrl(p.dp_url || '');
      }

      // Fetch settings
      const settingsRes = await fetch('http://localhost:3001/api/settings/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const settingsData = await settingsRes.json();

      if (settingsData.success) {
        const s = settingsData.data;
        setSettings(s);
        setEmailNotifications(s.email_notifications ?? true);
        setNotificationEnabled(s.notification_enabled ?? true);
        setPrivacyProfilePublic(s.privacy_profile_public ?? true);
        setPrivacyShowOnlineStatus(s.privacy_show_online_status ?? true);
        setPrivacyAllowAnonymousChats(s.privacy_allow_anonymous_chats ?? true);
      }

      // Fetch blocked users
      const blockedRes = await fetch('http://localhost:3001/api/settings/blocked', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blockedData = await blockedRes.json();

      if (blockedData.success) {
        setBlockedUsers(blockedData.data);
      }
    } 
    catch (error) {
      console.error('Failed to fetch data:', error);
      toastError('Failed to load profile data');
    } 
    finally {
      setLoading(false);
    }
  }, [router, toastError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdatePersonal = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:3001/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ bio, dob: dob || null, dpUrl: dpUrl || null })
      });

      const data = await res.json();
      if (data.success) {
        toastSuccess('Profile updated successfully!');
        setProfile(data.data);
      } else {
        toastError(data.message || 'Failed to update profile');
      }
    } catch (error) {
      toastError('Failed to update profile');
      console.log(error);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    //

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:3001/api/settings/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          theme: theme,
          email_notifications: emailNotifications,
          notification_enabled: notificationEnabled
        })
      });

      const data = await res.json();
      if (data.success) {
        toastSuccess('Settings updated successfully!');
        setSettings(data.data);
      } else {
        toastError(data.message || 'Failed to update settings');
      }
    } 
    catch (error) {
      toastError('Failed to update settings');
      console.log(error);
    }
  };

  const handleUpdatePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    //

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:3001/api/settings/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          privacy_profile_public: privacyProfilePublic,
          privacy_show_online_status: privacyShowOnlineStatus,
          privacy_allow_anonymous_chats: privacyAllowAnonymousChats
        })
      });

      const data = await res.json();
      if (data.success) {
        toastSuccess('Privacy settings updated successfully!');
        setSettings(data.data);
      } else {
        toastError(data.message || 'Failed to update privacy settings');
      }
    } 
    catch (error) {
      toastError('Failed to update privacy settings');
      console.log(error);
    }
  };

  const handleUnblockUser = async (blockedUserId: string) => {
    //

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:3001/api/settings/unblock/${blockedUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.success) {
        toastSuccess('User unblocked successfully!');
        setBlockedUsers(blockedUsers.filter(u => u.blocked_id !== blockedUserId));
      } else {
        toastError(data.message || 'Failed to unblock user');
      }
    } 
    catch (error) {
      toastError('Failed to unblock user');
      console.log(error);
    }
  };

  const handleLogout = () => {
    // Replace confirm with toast and a custom confirmation
    toastInfo('Logout is not undoable. Logging out...');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    //
    // Remove confirm, just show a warning toast
    toastWarning('Deleting your account is permanent.');

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:3001/api/settings/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: deletePassword })
      });

      const data = await res.json();
      if (data.success) {
        toastSuccess('Account deleted successfully.');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        router.push('/login');
      } else {
        toastError(data.message || 'Failed to delete account');
      }
    } 
    catch (error) {
      toastError('Failed to delete account');
      console.log(error);
    }
  };

  if (loading) {
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-mesh-warm flex items-center justify-center p-6">
        <div className="glass-strong rounded-3xl p-12 text-center max-w-md animate-scale-in">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--heading)' }}>Failed to load profile</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Unable to load your profile data. Please try again.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => window.location.reload()} className="profile-btn-primary">Retry</button>
            <Link href="/dashboard" className="btn-ghost px-5 py-2.5">Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'personal', label: 'Personal' },
    { id: 'settings', label: 'Settings' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'blocks', label: `Blocked (${blockedUsers.length})` },
    { id: 'security', label: 'Security' },
  ] as const;

  return (
    <div className="min-h-screen bg-mesh-warm antialiased">
      {/* Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-linear-to-br from-pink-300/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-[-5%] left-[-3%] w-80 h-80 bg-linear-to-br from-purple-300/10 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <header className="glass-nav sticky top-0 z-50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="btn-ghost px-3 py-2 text-sm flex items-center gap-2">← Back</Link>
            <div>
              <h1 className="text-xl font-bold heading-romance">Edit Profile</h1>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{profile.name} · {profile.roll_no}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            <button onClick={handleLogout} className="btn-ghost px-4 py-2 text-sm text-red-400 hover:text-red-300 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">

        {/* Tab Bar */}
        <div className="glass rounded-2xl p-1.5 flex gap-1 mb-8 overflow-x-auto animate-fade-in">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                activeTab === tab.id ? 'text-white shadow-lg' : 'hover:bg-white/10'
              }`}
              style={activeTab === tab.id ? { background: 'var(--grad-romance)' } : { color: 'var(--muted)' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="glass-strong rounded-3xl p-8 animate-fade-in">

          {/* Personal Info */}
          {activeTab === 'personal' && (
            <div>
              <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--heading)' }}>Personal Information</h2>

              {/* Read-only fields */}
              <div className="glass rounded-2xl p-5 mb-6">
                <p className="text-xs font-semibold uppercase mb-4" style={{ color: 'var(--muted)' }}>Account Details (Read-Only)</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Name', value: profile.name },
                    { label: 'Roll Number', value: profile.roll_no },
                    { label: 'Branch', value: profile.branch },
                    { label: 'Gender', value: profile.gender },
                    { label: 'Joined', value: new Date(profile.created_at).toLocaleDateString() },
                    { label: 'Verified', value: profile.is_verified ? '✓ Verified' : '✗ Not Verified' },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{f.label}</p>
                      <p className="text-sm font-medium" style={{ color: 'var(--heading)' }}>{f.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editable */}
              <form onSubmit={handleUpdatePersonal} className="space-y-5">
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium mb-2" style={{ color: 'var(--body)' }}>Bio</label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="input-romance w-full resize-none"
                    placeholder="Tell us about yourself…"
                  />
                </div>
                <div>
                  <label htmlFor="dob" className="block text-sm font-medium mb-2" style={{ color: 'var(--body)' }}>Date of Birth</label>
                  <input type="date" id="dob" value={dob} onChange={(e) => setDob(e.target.value)} className="input-romance w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: 'var(--body)' }}>Profile Picture</label>
                  <ProfileImageManager
                    currentImageUrl={profile?.dp_url || undefined}
                    onUploadSuccess={(url: string) => {
                      setDpUrl(url);
                      if (profile) setProfile({ ...profile, dp_url: url });
                      toastSuccess('Profile picture updated!');
                    }}
                    onDeleteSuccess={() => {
                      setDpUrl('');
                      if (profile) setProfile({ ...profile, dp_url: null });
                      toastSuccess('Profile picture removed!');
                    }}
                  />
                </div>
                <button type="submit" className="profile-btn-primary w-full">Save Personal Info</button>
              </form>
            </div>
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <div>
              <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--heading)' }}>App Settings</h2>
              <form onSubmit={handleUpdateSettings} className="space-y-6">
                <div>
                  <label htmlFor="theme" className="block text-sm font-medium mb-2" style={{ color: 'var(--body)' }}>Theme Mode</label>
                  <select id="theme" value={theme} onChange={() => toggleTheme()} className="select-romance w-full">
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
                {[
                  { id: 'emailNotif', label: 'Email Notifications', checked: emailNotifications, onChange: setEmailNotifications },
                  { id: 'notifEnabled', label: 'Push Notifications', checked: notificationEnabled, onChange: setNotificationEnabled },
                ].map(toggle => (
                  <div key={toggle.id} className="glass rounded-2xl p-4 flex items-center justify-between">
                    <label htmlFor={toggle.id} className="text-sm font-medium cursor-pointer" style={{ color: 'var(--body)' }}>
                      {toggle.label}
                    </label>
                    <input
                      type="checkbox" id={toggle.id} checked={toggle.checked}
                      onChange={(e) => toggle.onChange(e.target.checked)}
                      className="w-4 h-4 accent-pink-500"
                    />
                  </div>
                ))}
                <button type="submit" className="profile-btn-primary w-full">Save Settings</button>
              </form>
            </div>
          )}

          {/* Privacy */}
          {activeTab === 'privacy' && (
            <div>
              <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--heading)' }}>Privacy Settings</h2>
              <form onSubmit={handleUpdatePrivacy} className="space-y-4">
                {[
                  { id: 'publicProfile', label: 'Public Profile', desc: 'Allow others to view your profile', checked: privacyProfilePublic, onChange: setPrivacyProfilePublic },
                  { id: 'onlineStatus', label: 'Show Online Status', desc: "Let others see when you're online", checked: privacyShowOnlineStatus, onChange: setPrivacyShowOnlineStatus },
                  { id: 'allowAnon', label: 'Allow Anonymous Chats', desc: 'Allow anonymous users to message you', checked: privacyAllowAnonymousChats, onChange: setPrivacyAllowAnonymousChats },
                ].map(toggle => (
                  <div key={toggle.id} className="glass rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div>
                      <label htmlFor={toggle.id} className="text-sm font-medium cursor-pointer block" style={{ color: 'var(--body)' }}>{toggle.label}</label>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{toggle.desc}</p>
                    </div>
                    <input type="checkbox" id={toggle.id} checked={toggle.checked} onChange={(e) => toggle.onChange(e.target.checked)} className="w-4 h-4 accent-pink-500 shrink-0" />
                  </div>
                ))}
                <button type="submit" className="profile-btn-primary w-full mt-2">Save Privacy Settings</button>
              </form>
            </div>
          )}

          {/* Blocked Users */}
          {activeTab === 'blocks' && (
            <div>
              <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--heading)' }}>Blocked Users</h2>
              {blockedUsers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">🚫</div>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>You haven&#39;t blocked any users yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {blockedUsers.map((user) => (
                    <div key={user.blocked_id} className="glass rounded-2xl p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {user.is_anonymous_block ? (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                            style={{ background: 'var(--grad-mystery)' }}>?</div>
                        ) : (
                          <Image
                            src={user.dp_url || 'https://via.placeholder.com/40'}
                            alt={user.name} width={40} height={40}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-white/20 shrink-0"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--heading)' }}>
                            {user.name}
                            {user.is_anonymous_block && (
                              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-500/15 text-purple-400">Anon</span>
                            )}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--muted)' }}>
                            {user.is_anonymous_block ? user.gender : user.roll_no}
                          </p>
                          {user.block_reason && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Reason: {user.block_reason}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnblockUser(user.blocked_id)}
                        className="btn-ghost text-xs px-3 py-1.5 shrink-0"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold" style={{ color: 'var(--heading)' }}>Security</h2>

              {/* Logout */}
              <div className="glass rounded-2xl p-5 border border-emerald-400/20">
                <h3 className="font-semibold text-emerald-400 mb-1">Logout</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Sign out from your account on this device.</p>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout from Account
                </button>
              </div>

              {/* Reset password */}
              <div className="glass rounded-2xl p-5 border border-blue-400/20">
                <h3 className="font-semibold text-blue-400 mb-1">Change Password</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Reset your password via OTP on the login page.</p>
                <Link href="/forgot-password" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-all">
                  Reset Password
                </Link>
              </div>

              {/* Delete account */}
              <div className="glass rounded-2xl p-5 border border-red-400/20">
                <h3 className="font-semibold text-red-400 mb-1">Danger Zone</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                  Deleting your account is permanent and cannot be undone. All your data will be lost.
                </p>
                <form onSubmit={handleDeleteAccount} className="space-y-3">
                  <input
                    type="password" value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your password to confirm"
                    required
                    className="input-romance w-full border-red-400/30 focus:border-red-400/60"
                    style={{ borderColor: 'rgba(248,113,113,0.3)' }}
                  />
                  <button type="submit" className="w-full py-2.5 rounded-xl font-semibold text-sm bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all border border-red-400/20">
                    Delete Account Permanently
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
