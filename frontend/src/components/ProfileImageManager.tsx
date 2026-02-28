'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import ImageUploader from '@/components/ImageUploader';
import AvatarSelector from '@/components/AvatarSelector';
import { uploadProfilePicture, deleteProfilePicture, getUserAvatar, selectPresetAvatar } from '@/services/image.service';
import type { ProfileUser } from '@/types/auth.types';

interface UserProfile {
  user_id: string;
  roll_no: string;
  name: string;
  gender: string;
  branch: string;
  dp_url: string | null;
  bio: string | null;
  dob: string | null;
}

interface ProfileImageManagerProps {
  currentImageUrl?: string;
  onUploadSuccess?: (url: string) => void;
  onDeleteSuccess?: () => void;
}

export default function ProfileImageManager({
  currentImageUrl, onUploadSuccess, onDeleteSuccess}: ProfileImageManagerProps = {}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  // Helper to map API profile user to UserProfile
  const mapUserToUserProfile = (user: ProfileUser): UserProfile => ({
    user_id: user.userId,
    roll_no: user.rollNo,
    name: user.name,
    gender: user.gender,
    branch: user.branch,
    dp_url: user.dp_url ?? null,
    bio: user.bio ?? null,
    dob: user.dob ?? null,
  });

  const fetchProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch('http://localhost:3001/api/profile/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success && data.data) {
        setProfile(mapUserToUserProfile(data.data));
      }
    } 
    catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  }, [setProfile]);

    // Only fetch profile if currentImageUrl is not provided (standalone mode)
  useEffect(() => {
    if (!currentImageUrl) {
      fetchProfile();
    }
  }, [currentImageUrl, fetchProfile]);

  const handleImageUpload = async (file: File) => {
    setIsLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setMessage({ type: 'error', text: 'Please login to upload image' });
        return;
      }

      const result = await uploadProfilePicture(file, token);
      const user = result.data?.user;

      if (result.success && user) {
        const userProfile = mapUserToUserProfile(user);
        setMessage({ type: 'success', text: 'Profile picture uploaded successfully!' });
        setProfile(userProfile);
        // Call onUploadSuccess callback if provided
        if (onUploadSuccess && userProfile.dp_url) {
          onUploadSuccess(userProfile.dp_url);
        }
      } 
      else {
        setMessage({ type: 'error', text: 'Failed to upload image' });
      }
    } 
    catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
      ) {
        setMessage({
          type: 'error',
          text: (error as { response: { data: { message: string } } }).response.data.message,
        });
      } 
      else {
        setMessage({
          type: 'error',
          text: 'Failed to upload image',
        });
      }
    } 
    finally {
      setIsLoading(false);
    }
  };

  const handleImageDelete = async () => {
    if (!confirm('Are you sure you want to delete your profile picture? It will be reset to the default avatar.')) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setMessage({ type: 'error', text: 'Please login to delete image' });
        return;
      }

      const result = await deleteProfilePicture(token);
      const user = result.data?.user;
      if (result.success && user) {
        const userProfile = mapUserToUserProfile(user);
        setMessage({ type: 'success', text: 'Profile picture deleted successfully!' });
        setProfile(userProfile);
        // Call onDeleteSuccess callback if provided
        if (onDeleteSuccess) {
          onDeleteSuccess();
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to delete image' });
      }
    } 
    catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
      ) {
        setMessage({
          type: 'error',
          text: (error as { response: { data: { message: string } } }).response.data.message,
        });
      } 
      else {
        setMessage({
          type: 'error',
          text: 'Failed to delete image',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarSelect = async (avatarId: string) => {
    setIsLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setMessage({ type: 'error', text: 'Please login to select avatar' });
        return;
      }

      const result = await selectPresetAvatar(avatarId, token);
      const user = result.data?.user;
      if (result.success && user) {
        const userProfile = mapUserToUserProfile(user);
        setMessage({ type: 'success', text: 'Avatar selected successfully!' });
        setProfile(userProfile);
        setShowAvatarSelector(false);
        // Call onUploadSuccess callback if provided
        if (onUploadSuccess && userProfile.dp_url) {
          onUploadSuccess(userProfile.dp_url);
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to select avatar' });
      }
    } 
    catch (error: unknown) {
      if (
          typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
        ) {
        setMessage({
          type: 'error',
          text: (error as { response: { data: { message: string } } }).response.data.message,
        });
      } else {
        setMessage({
          type: 'error',
          text: 'Failed to select avatar',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Memoize to prevent unnecessary re-renders of ImageUploader
  const displayImageUrl = useMemo(() => {
    return currentImageUrl || (profile ? getUserAvatar(profile.dp_url, profile.gender) : undefined);
  }, [currentImageUrl, profile]);

  // In standalone mode, wait for profile data
  if (!currentImageUrl && !profile) {
    return (
      <div className="flex justify-center items-center p-6">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  // Standalone mode with full layout
  if (!currentImageUrl) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Profile Picture</h2>

          {message && (
            <div
              className={`mb-4 p-4 rounded ${
                message.type === 'success'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}
            >
              {message.text}
            </div>
          )}

          {profile && (
            <div className="mb-6 text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{profile.name}</h3>
              <p className="text-gray-600 dark:text-gray-400">{profile.roll_no}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{profile.branch}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Upload Custom Image Section */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--grad-romance)' }}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--heading)' }}>Upload Custom Image</h3>
              </div>
              <ImageUploader
                key="profile-uploader-standalone"
                currentImage={displayImageUrl}
                onImageUpload={handleImageUpload}
                onImageDelete={handleImageDelete}
                isLoading={isLoading}
                aspectRatio={1}
                title="Profile Picture"
                showDelete={true}
              />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px" style={{ background: 'var(--border-light)' }}></div>
              <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>OR</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border-light)' }}></div>
            </div>

            {/* Avatar Selector Section */}
            <div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowAvatarSelector(!showAvatarSelector);
                }}
                className="w-full flex items-center justify-between px-4 py-3 glass rounded-xl transition-all hover:scale-[1.02]"
              >
                <span className="text-lg font-semibold" style={{ color: 'var(--heading)' }}>
                  {showAvatarSelector ? 'Hide' : 'Show'} Preset Avatars
                </span>
                <svg 
                  className={`w-5 h-5 transition-transform ${showAvatarSelector ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{ color: 'var(--body)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showAvatarSelector && (
                <div className="mt-4">
                  <AvatarSelector
                    currentAvatarUrl={displayImageUrl}
                    onSelect={handleAvatarSelect}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Image Guidelines:</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Maximum file size: 5MB</li>
              <li>• Supported formats: JPG, PNG, WEBP</li>
              <li>• Recommended: Square images (1:1 ratio)</li>
              <li>• Use the crop tool to adjust your image before uploading</li>
              <li>• Rotate the image if needed using the rotate button</li>
              <li>• Or choose from 70 preset avatars!</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Inline mode (for use in modals/forms)
  return (
    <div>
      {message && (
        <div
          className={`mb-4 p-3 rounded text-sm ${
            message.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {/* Upload Custom Image Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--grad-romance)' }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--heading)' }}>Upload Custom Image</h3>
          </div>
          <ImageUploader
            key="profile-uploader-inline"
            currentImage={displayImageUrl}
            onImageUpload={handleImageUpload}
            onImageDelete={handleImageDelete}
            isLoading={isLoading}
            aspectRatio={1}
            showDelete={true}
          />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">OR</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
        </div>

        {/* Avatar Selector Section */}
        <div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setShowAvatarSelector(!showAvatarSelector);
            }}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {showAvatarSelector ? 'Hide' : 'Show'} Preset Avatars
            </span>
            <svg 
              className={`w-4 h-4 transition-transform ${showAvatarSelector ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showAvatarSelector && (
            <div className="mt-3">
              <AvatarSelector
                currentAvatarUrl={displayImageUrl}
                onSelect={handleAvatarSelect}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
