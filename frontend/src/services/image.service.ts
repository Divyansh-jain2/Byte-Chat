import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface ImageUploadResponse {
  success: boolean;
  message: string;
  data: {
    imageUrl: string;
    user?: any;
    group?: any;
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
