'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProfileImageManager from '@/components/ProfileImageManager';

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
  roll_no: string;
  name: string;
  dp_url: string | null;
  block_reason: string | null;
  created_at: string;
}

export default function ProfileEditPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'personal' | 'settings' | 'privacy' | 'blocks' | 'security'>('personal');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [bio, setBio] = useState('');
  const [dob, setDob] = useState('');
  const [dpUrl, setDpUrl] = useState('');
  const [theme, setTheme] = useState('light');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [privacyProfilePublic, setPrivacyProfilePublic] = useState(true);
  const [privacyShowOnlineStatus, setPrivacyShowOnlineStatus] = useState(true);
  const [privacyAllowAnonymousChats, setPrivacyAllowAnonymousChats] = useState(true);
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
        setTheme(s.theme || 'light');
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
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setMessage({ type: 'error', text: 'Failed to load profile data' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

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
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setProfile(data.data);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

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
        setMessage({ type: 'success', text: 'Settings updated successfully!' });
        setSettings(data.data);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update settings' });
    }
  };

  const handleUpdatePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

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
        setMessage({ type: 'success', text: 'Privacy settings updated successfully!' });
        setSettings(data.data);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update privacy settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update privacy settings' });
    }
  };

  const handleUnblockUser = async (blockedUserId: string) => {
    setMessage(null);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:3001/api/settings/unblock/${blockedUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'User unblocked successfully!' });
        setBlockedUsers(blockedUsers.filter(u => u.blocked_id !== blockedUserId));
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to unblock user' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to unblock user' });
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

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
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        router.push('/login');
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to delete account' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete account' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-red-600">Failed to load profile</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 mb-4 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Profile</h1>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab('personal')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'personal' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Personal Info
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'settings' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'privacy' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Privacy
            </button>
            <button
              onClick={() => setActiveTab('blocks')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'blocks' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Blocked Users ({blockedUsers.length})
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'security' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Security
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {/* Personal Info Tab */}
          {activeTab === 'personal' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Personal Information</h2>

              {/* View-Only Fields */}
              <div className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Account Details (Read-Only)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Name</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{profile.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Roll Number</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{profile.roll_no}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Branch</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{profile.branch}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Gender</label>
                    <p className="mt-1 text-gray-900 dark:text-white">{profile.gender}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Joined</label>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Verified</label>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {profile.is_verified ? '✓ Verified' : '✗ Not Verified'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <form onSubmit={handleUpdatePersonal} className="space-y-6">
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div>
                  <label htmlFor="dob" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    id="dob"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Profile Picture
                  </label>
                  <ProfileImageManager
                    currentImageUrl={profile?.dp_url || undefined}
                    onUploadSuccess={(url: string) => {
                      setDpUrl(url);
                      if (profile) {
                        setProfile({ ...profile, dp_url: url });
                      }
                      setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
                    }}
                    onDeleteSuccess={() => {
                      setDpUrl('');
                      if (profile) {
                        setProfile({ ...profile, dp_url: null });
                      }
                      setMessage({ type: 'success', text: 'Profile picture removed successfully!' });
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
                >
                  Save Personal Info
                </button>
              </form>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">App Settings</h2>

              <form onSubmit={handleUpdateSettings} className="space-y-6">
                <div>
                  <label htmlFor="theme" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Theme Mode
                  </label>
                  <select
                    id="theme"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="emailNotif" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email Notifications
                    </label>
                    <input
                      type="checkbox"
                      id="emailNotif"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label htmlFor="notifEnabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Push Notifications
                    </label>
                    <input
                      type="checkbox"
                      id="notifEnabled"
                      checked={notificationEnabled}
                      onChange={(e) => setNotificationEnabled(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
                >
                  Save Settings
                </button>
              </form>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Privacy Settings</h2>

              <form onSubmit={handleUpdatePrivacy} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="publicProfile" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Public Profile
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Allow others to view your profile</p>
                    </div>
                    <input
                      type="checkbox"
                      id="publicProfile"
                      checked={privacyProfilePublic}
                      onChange={(e) => setPrivacyProfilePublic(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="onlineStatus" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Show Online Status
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Let others see when you're online</p>
                    </div>
                    <input
                      type="checkbox"
                      id="onlineStatus"
                      checked={privacyShowOnlineStatus}
                      onChange={(e) => setPrivacyShowOnlineStatus(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="allowAnonymousChats" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Allow Anonymous Chats
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Allow anonymous users to message you</p>
                    </div>
                    <input
                      type="checkbox"
                      id="allowAnonymousChats"
                      checked={privacyAllowAnonymousChats}
                      onChange={(e) => setPrivacyAllowAnonymousChats(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
                >
                  Save Privacy Settings
                </button>
              </form>
            </div>
          )}

          {/* Blocked Users Tab */}
          {activeTab === 'blocks' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Blocked Users</h2>

              {blockedUsers.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                  You haven't blocked any users yet
                </p>
              ) : (
                <div className="space-y-4">
                  {blockedUsers.map((user) => (
                    <div
                      key={user.blocked_id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={user.dp_url || 'https://via.placeholder.com/40'}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{user.roll_no}</p>
                          {user.block_reason && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Reason: {user.block_reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnblockUser(user.blocked_id)}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Security</h2>

              <div className="space-y-6">
                {/* Logout Section */}
                <div className="p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
                  <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">Logout</h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                    Sign out from your account on this device.
                  </p>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout from Account
                  </button>
                </div>

                {/* Password Reset Section */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Change Password</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    Use the forgot password option on the login page to reset your password via OTP.
                  </p>
                  <Link
                    href="/forgot-password"
                    className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    Reset Password
                  </Link>
                </div>

                {/* Delete Account Section */}
                <div className="p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
                  <h3 className="font-medium text-red-900 dark:text-red-100 mb-2">Danger Zone</h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                    Deleting your account is permanent and cannot be undone. All your data will be lost.
                  </p>

                  <form onSubmit={handleDeleteAccount} className="space-y-3">
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Enter your password to confirm"
                      required
                      className="block w-full rounded-md border border-red-300 dark:border-red-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                    <button
                      type="submit"
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition"
                    >
                      Delete Account Permanently
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
