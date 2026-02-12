/**
 * Avatar utility functions for frontend
 * Handles preset avatar management and URL generation
 */

// Total number of preset avatars available
const TOTAL_AVATARS = 61;

/**
 * Generate array of all available avatar public IDs
 * @returns Array of avatar public IDs (e.g., ['avatars/avatar-01', 'avatars/avatar-02', ...])
 */
export const AVATAR_OPTIONS = Array.from({ length: TOTAL_AVATARS }, (_, i) =>
  `avatars/avatar-${String(i + 1).padStart(2, '0')}`
);

/**
 * Get Cloudinary URL for an avatar
 * @param publicId - Avatar public ID (e.g., 'avatars/avatar-12')
 * @param transformations - Optional transformations (width, height, etc.)
 * @returns Full Cloudinary URL
 */
export const getAvatarUrl = (
  publicId: string, 
  transformations: string = 'w_128,h_128,c_fill,f_auto,q_auto'
): string => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUD_NAME;
  
  if (!cloudName) {
    console.error('NEXT_PUBLIC_CLOUD_NAME is not set');
    return '';
  }
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId}.svg`;
};

/**
 * Extract avatar public ID from Cloudinary URL
 * Works specifically for preset avatars
 * @param url - Full Cloudinary URL
 * @returns Public ID or null if not a preset avatar
 */
export const extractAvatarPublicId = (url: string): string | null => {
  if (!url || !url.includes('cloudinary.com')) {
    return null;
  }
  
  const match = url.match(/avatars\/avatar-\d{2}/);
  return match ? match[0] : null;
};
