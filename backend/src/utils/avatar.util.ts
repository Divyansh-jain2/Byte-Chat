/**
 * Avatar utility functions
 * Handles preset avatar management and random selection
 */

// Total number of preset avatars available
const TOTAL_AVATARS = 70;

/**
 * Generate array of all available avatar public IDs
 * @returns Array of avatar public IDs (e.g., ['avatars/avatar-01', 'avatars/avatar-02', ...])
 */
export const AVATAR_OPTIONS = Array.from({ length: TOTAL_AVATARS }, (_, i) =>
  `avatars/avatar-${String(i + 1).padStart(2, '0')}`
);

/**
 * Get a random avatar public ID
 * @returns Random avatar public ID
 */
// export const getRandomAvatar = (): string => {
//   const randomIndex = Math.floor(Math.random() * AVATAR_OPTIONS.length);
//   return AVATAR_OPTIONS[randomIndex];
// };
export const getRandomAvatar = (): string => {
  if (AVATAR_OPTIONS.length === 0) {
    throw new Error('AVATAR_OPTIONS array is empty');
  }
  const randomIndex = Math.floor(Math.random() * AVATAR_OPTIONS.length);
  return AVATAR_OPTIONS[randomIndex]!;
};

/**
 * Validate if a public ID is a valid preset avatar
 * @param publicId - Public ID to validate
 * @returns True if valid preset avatar
 */
export const isValidPresetAvatar = (publicId: string): boolean => {
  return AVATAR_OPTIONS.includes(publicId);
};

/**
 * Generate Cloudinary URL for an avatar
 * @param publicId - Avatar public ID (e.g., 'avatars/avatar-12')
 * @param transformations - Optional transformations (width, height, etc.)
 * @returns Full Cloudinary URL
 */
export const getAvatarUrl = (
  publicId: string, 
  transformations: string = 'w_128,h_128,c_fill,f_auto,q_auto'
): string => {
  const cloudName = process.env.CLOUD_NAME;
  
  if (!cloudName) {
    throw new Error('CLOUD_NAME environment variable is not set');
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
