'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import ImageUploader from '@/components/ImageUploader';
import AvatarSelector from '@/components/AvatarSelector';
import { uploadGroupPicture, deleteGroupPicture, getGroupDP, selectGroupPresetAvatar } from '@/services/image.service';
import type { Group } from '@/types/chat.types'; 

interface GroupImageManagerProps {
  groupId: string;
  isAdmin?: boolean;
  currentImageUrl?: string;
  onUploadSuccess?: (url: string) => void;
  onDeleteSuccess?: () => void;
}

export default function GroupImageManager({ 
  groupId, isAdmin = false, currentImageUrl, onUploadSuccess, onDeleteSuccess }: GroupImageManagerProps) {
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  // Use provided currentImageUrl or fallback to group data with default
  // Memoize to prevent unnecessary re-renders of ImageUploader
  // Must be called before any conditional returns to follow Rules of Hooks
  const displayImageUrl = useMemo(() => {
    return getGroupDP(currentImageUrl || group?.group_dp_url);
  }, [currentImageUrl, group?.group_dp_url]);
  
  const fetchGroup = useCallback(async () => {
    try {
      const { API_BASE_URL } = await import('../services/apiBase');
      const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}`, {
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        setGroup(data.data);
      }
    } 
    catch (error) {
      console.error('Failed to fetch group:', error);
    }
  }, [groupId]);

    useEffect(() => {
    if (!currentImageUrl) {
      fetchGroup();
    }
  }, [groupId, currentImageUrl, fetchGroup]);

  const handleImageUpload = async (file: File) => {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await uploadGroupPicture(groupId, file, '');
      const group = result.data?.group;
      
      if (result.success && group) {
        setMessage({ type: 'success', text: 'Group picture uploaded successfully!' });
        setGroup(group);
        
        // Call onUploadSuccess callback if provided
        if (onUploadSuccess && group.group_dp_url) {
          onUploadSuccess(group.group_dp_url);
        }
      } else {
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
      } else {
        setMessage({
          type: 'error',
          text: 'Failed to upload image. Make sure you are an admin.',
        });
      }
    }
    finally {
      setIsLoading(false);
    }
  };

  const handleImageDelete = async () => {
    if (!confirm('Are you sure you want to delete the group picture?')) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const result = await deleteGroupPicture(groupId, '');
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Group picture deleted successfully!' });
        setGroup(group);
        
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
      } else {
        setMessage({
          type: 'error',
          text: 'Failed to delete image. Make sure you are an admin.',
        });
      }
    }
    finally {
      setIsLoading(false);
    }
  };

  const handleAvatarSelect = async (avatarId: string) => {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await selectGroupPresetAvatar(groupId, avatarId, '');
      const group = result.data?.group;
      
      if (result.success && group) {
        setMessage({ type: 'success', text: 'Group avatar selected successfully!' });
        setGroup(group);
        setShowAvatarSelector(false);
        
        // Call onUploadSuccess callback if provided
        if (onUploadSuccess && group.group_dp_url) {
          onUploadSuccess(group.group_dp_url);
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
          text: 'Failed to select avatar. Make sure you are an admin.',
        });
      }
    }
    
    finally {
      setIsLoading(false);
    }
  };

  // In standalone mode, wait for group data
  if (!currentImageUrl && !group) {
    return (
      <div className="flex justify-center items-center p-6">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  // In standalone mode, check admin permissions
  if (!currentImageUrl && !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            Only group administrators can manage the group picture.
          </p>
        </div>
      </div>
    );
  }

  // Standalone mode with full layout
  if (!currentImageUrl) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Group Picture</h2>

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

          {group && (
            <div className="mb-6 text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{group.group_name}</h3>
              <p className="text-gray-600 dark:text-gray-400">{group.group_desc}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {group.is_public ? 'Public Group' : 'Private Group'}
                {group.member_count && ` • ${group.member_count} members`}
              </p>
            </div>
          )}

          <div className="space-y-6">
            {/* Upload Custom Image Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Upload Custom Image</h3>
              <ImageUploader
                key={`group-uploader-${groupId}`}
                currentImage={displayImageUrl}
                onImageUpload={handleImageUpload}
                onImageDelete={handleImageDelete}
                isLoading={isLoading}
                aspectRatio={1}
                title="Group Display Picture"
                showDelete={!!displayImageUrl}
              />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">OR</span>
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
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {showAvatarSelector ? 'Hide' : 'Show'} Preset Avatars
                </span>
                <svg 
                  className={`w-5 h-5 transition-transform ${showAvatarSelector ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
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
              <li>• Or choose from 70 preset avatars!</li>
              <li>• The group picture is visible to all group members</li>
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
          <h3 className="text-sm font-medium mb-2 text-gray-900 dark:text-white">Upload Custom Image</h3>
          <ImageUploader
            key={`group-uploader-inline-${groupId}`}
            currentImage={displayImageUrl}
            onImageUpload={handleImageUpload}
            onImageDelete={handleImageDelete}
            isLoading={isLoading}
            aspectRatio={1}
            showDelete={!!displayImageUrl}
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