'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { BlockUserButton } from '@/components/ModerationComponents';
import { checkIfBlocked } from '@/services/moderation.service';
import Image from 'next/image';

export default function ViewProfile() {
  const params = useParams();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  
  const rollNo = params.rollNo as string;
  // need proper error handling
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');
  const [, setBlockedByOther] = useState(false);

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

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' 
          ? 'bg-linear-to-br from-gray-900 via-purple-900 to-gray-900' 
          : 'bg-linear-to-br from-blue-50 via-purple-50 to-pink-50'
      }`}>
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${
        theme === 'dark' 
          ? 'bg-linear-to-br from-gray-900 via-purple-900 to-gray-900' 
          : 'bg-linear-to-br from-blue-50 via-purple-50 to-pink-50'
      }`}>
        <div className={`backdrop-blur-md rounded-2xl p-8 text-center ${
          theme === 'dark' ? 'bg-white/10' : 'bg-white/60'
        }`}>
          <p className={`text-xl mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            {error || 'Profile not found'}
          </p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 ${
      theme === 'dark' 
        ? 'bg-linear-to-br from-gray-900 via-purple-900 to-gray-900' 
        : 'bg-linear-to-br from-blue-50 via-purple-50 to-pink-50'
    }`}>
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.back()}
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

      {/* Profile Card */}
      <div className="max-w-4xl mx-auto">
        <div className={`backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden ${
          theme === 'dark'
            ? 'bg-white/10 border border-white/20'
            : 'bg-white/60 border border-white/40'
        }`}>
          {/* Cover Header */}
          <div className="h-32 bg-linear-to-r from-purple-500 to-pink-500"></div>

          {/* Profile Content */}
          <div className="p-8">
            {/* Profile Picture & Basic Info */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 -mt-20">
              <Image
                src={profile.dp_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.roll_no}`}
                alt={profile.name}
                width={32}
                height={32}
                className="rounded-full border-4 border-white shadow-xl object-cover"
              />
              <div className="flex-1 text-center md:text-left mt-16 md:mt-10">
                <h1 className={`text-3xl font-bold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>
                  {profile.name}
                </h1>
                <p className={`text-lg mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {profile.roll_no}
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    theme === 'dark' ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {profile.branch}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    theme === 'dark' ? 'bg-pink-500/20 text-pink-300' : 'bg-pink-100 text-pink-700'
                  }`}>
                    {profile.gender}
                  </span>
                  {profile.is_verified && (
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      theme === 'dark' ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'
                    }`}>
                      ✓ Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-16 md:mt-10">
                {isOwnProfile ? (
                  <Link href="/profile/edit">
                    <button className="px-6 py-2 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all">
                      ✏️ Edit Profile
                    </button>
                  </Link>
                ) : (
                  <>
                    {blockMessage && (
                      <div className={`px-4 py-2 rounded-lg text-center ${
                        theme === 'dark' 
                          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' 
                          : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                      }`}>
                        🚫 {blockMessage}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button 
                        disabled={isBlocked}
                        className={`px-6 py-2 rounded-lg transition-all ${
                          isBlocked 
                            ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                            : 'bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                        } text-white`}
                      >
                        💬 Message
                      </button>
                      <button 
                        disabled={isBlocked}
                        className={`px-6 py-2 rounded-lg backdrop-blur-md transition-all ${
                          isBlocked 
                            ? 'bg-gray-400 cursor-not-allowed opacity-50 text-gray-300' 
                            : theme === 'dark'
                              ? 'bg-white/10 hover:bg-white/20 text-white'
                              : 'bg-white/50 hover:bg-white/70 text-gray-800'
                        }`}
                      >
                        🎭 Send Anonymous
                      </button>
                    </div>
                    <div className="mt-2">
                      <BlockUserButton 
                        userId={profile.user_id}
                        userName={profile.name}
                        isBlocked={isBlocked}
                        onBlockStatusChange={handleBlockStatusChange}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bio Section */}
            {profile.bio && (
              <div className={`mt-8 p-6 rounded-xl ${
                theme === 'dark' ? 'bg-white/5' : 'bg-white/50'
              }`}>
                <h2 className={`text-xl font-bold mb-3 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>
                  About
                </h2>
                <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Details Grid */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.dob && (
                <div className={`p-4 rounded-xl ${
                  theme === 'dark' ? 'bg-white/5' : 'bg-white/50'
                }`}>
                  <p className={`text-sm mb-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Date of Birth
                  </p>
                  <p className={`font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>
                    {new Date(profile.dob).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}

              <div className={`p-4 rounded-xl ${
                theme === 'dark' ? 'bg-white/5' : 'bg-white/50'
              }`}>
                <p className={`text-sm mb-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Member Since
                </p>
                <p className={`font-medium ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>
                  {new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long'
                  })}
                </p>
              </div>

              {profile.last_login && (
                <div className={`p-4 rounded-xl ${
                  theme === 'dark' ? 'bg-white/5' : 'bg-white/50'
                }`}>
                  <p className={`text-sm mb-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Last Active
                  </p>
                  <p className={`font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>
                    {new Date(profile.last_login).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
