import axios from 'axios';
import { User as AuthUser } from '@/types/auth.types';
import { Group as ChatGroup } from '@/types/chat.types';
import { API_BASE_URL, getApiUrl } from './api.config';

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
  const cloudName = process.env.NEXT_PUBLIC_CLOUD_NAME;
  
  if (gender?.toLowerCase() === 'female') {
    return `https://res.cloudinary.com/${cloudName}/image/upload/v1770722710/syqrnws7rzkjxxvullsa.jpg`;
  }
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/v1770722710/ahvxgdh0shutx72okak0.jpg`;
};

/**
 * Get default group display picture
 */
export const getDefaultGroupDP = (): string => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUD_NAME;
  // Using a placeholder service for default group image
  // You can replace this with your own Cloudinary image URL
  return `https://res.cloudinary.com/${cloudName}/image/upload/v1770723323/iuq8s6kfm6sufdws7nrr.jpg`;
};


/**
 * Upload profile picture
 */
export const uploadProfilePicture = async (
  file: File
): Promise<ImageUploadResponse> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await axios.post(
    getApiUrl('/api/profile/upload-picture'),
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
    }
  );

  return response.data;
};

/**
 * Delete profile picture (reset to default)
 */
export const deleteProfilePicture = async (): Promise<ImageUploadResponse> => {
  const response = await axios.delete(
    getApiUrl('/api/profile/delete-picture'),
    {
      withCredentials: true,
    }
  );

  return response.data;
};

/**
 * Upload group picture
 */
export const uploadGroupPicture = async (
  groupId: string,
  file: File
): Promise<ImageUploadResponse> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await axios.post(
    getApiUrl(`/api/groups/${groupId}/upload-picture`),
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
    }
  );

  return response.data;
};

/**
 * Delete group picture
 */
export const deleteGroupPicture = async (
  groupId: string
): Promise<ImageUploadResponse> => {
  const response = await axios.delete(
    getApiUrl(`/api/groups/${groupId}/delete-picture`),
    {
      withCredentials: true,
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
  avatarId: string
): Promise<ImageUploadResponse> => {
  const response = await axios.post(
    `${API_BASE_URL}/api/profile/select-avatar`,
    { avatarId },
    {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    }
  );

  return response.data;
};

/**
 * Select preset avatar for group
 */
export const selectGroupPresetAvatar = async (
  groupId: string,
  avatarId: string
): Promise<ImageUploadResponse> => {
  const response = await axios.post(
    `${API_BASE_URL}/api/groups/${groupId}/select-avatar`,
    { avatarId },
    {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    }
  );

  return response.data;
};
