import axios from 'axios';
import { User as AuthUser } from '@/types/auth.types';
import { Group as ChatGroup } from '@/types/chat.types';
import { getDefaultAvatarUrl, getDefaultGroupAvatarUrl } from '@/utils/avatar.utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface ImageUploadResponse {
  success: boolean;
  message: string;
  data: {
    imageUrl: string;
    user?: AuthUser;
    group?: ChatGroup;
  };
}

/**
 * Get default avatar URL based on gender
 */
export const getDefaultAvatar = (gender: string): string => {
  return getDefaultAvatarUrl(gender);
};

/**
 * Get default group display picture
 */
export const getDefaultGroupDP = (): string => {
  return getDefaultGroupAvatarUrl();
};


/**
 * Upload profile picture
 */
export const uploadProfilePicture = async (
  file: File,
  token: string
): Promise<ImageUploadResponse> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await axios.post(
    `${API_URL}/api/profile/upload-picture`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

/**
 * Delete profile picture (reset to default)
 */
export const deleteProfilePicture = async (
  token: string
): Promise<ImageUploadResponse> => {
  const response = await axios.delete(
    `${API_URL}/api/profile/delete-picture`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

/**
 * Upload group picture
 */
export const uploadGroupPicture = async (
  groupId: string,
  file: File,
  token: string
): Promise<ImageUploadResponse> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await axios.post(
    `${API_URL}/api/groups/${groupId}/upload-picture`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

/**
 * Delete group picture
 */
export const deleteGroupPicture = async (
  groupId: string,
  token: string
): Promise<ImageUploadResponse> => {
  const response = await axios.delete(
    `${API_URL}/api/groups/${groupId}/delete-picture`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

/**
 * Get user's profile with default avatar fallback
 */
export const getUserAvatar = (dpUrl: string | null, gender: string): string => {
  if (dpUrl) {
    return dpUrl;
  }
  return getDefaultAvatar(gender);
};

/**
 * Next/Image cannot optimize remote SVGs unless dangerouslyAllowSVG is enabled.
 * Mark known SVG avatar URLs as unoptimized instead.
 */
export const shouldUnoptimizeImage = (url?: string | null): boolean => {
  if (!url) {
    return false;
  }

  const normalizedUrl = url.toLowerCase();
  return normalizedUrl.includes('/svg') || normalizedUrl.endsWith('.svg');
};

/**
 * Get group display picture with default fallback
 */
export const getGroupDP = (dpUrl: string | null | undefined): string => {
  if (dpUrl) {
    return dpUrl;
  }
  return getDefaultGroupDP();
};

/**
 * Select preset avatar for profile
 */
export const selectPresetAvatar = async (
  avatarId: string,
  token: string
): Promise<ImageUploadResponse> => {
  const response = await axios.post(
    `${API_URL}/api/profile/select-avatar`,
    { avatarId },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

/**
 * Select preset avatar for group
 */
export const selectGroupPresetAvatar = async (
  groupId: string,
  avatarId: string,
  token: string
): Promise<ImageUploadResponse> => {
  const response = await axios.post(
    `${API_URL}/api/groups/${groupId}/select-avatar`,
    { avatarId },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};
