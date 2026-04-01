import { v2 as cloudinary } from 'cloudinary';
import { ApiError } from './error.util.js';
import { getDefaultAvatarId, getDefaultGroupAvatarId, getAvatarUrl } from './avatar.util.js';

const cloudName = process.env.CLOUD_NAME;
const apiKey = process.env.CLOUD_API_KEY;
const apiSecret = process.env.CLOUD_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error('Missing required Cloudinary environment variables');
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});


/**
 * Upload image to Cloudinary
 * @param fileBuffer - Buffer of the image file
 * @param folder - Folder name in Cloudinary (e.g., 'profile_pictures', 'group_pictures', 'chat_images')
 * @param publicId - Optional custom public ID for the image
 * @param skipTransformation - Skip image transformation (for chat images)
 * @returns Cloudinary upload result with secure_url
 */
export const uploadToCloudinary = async (
  fileBuffer: Buffer,
  folder: string,
  publicId?: string,
  skipTransformation?: boolean
): Promise<{ secure_url: string; public_id: string }> => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          ...(publicId && { public_id: publicId }),
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
          ...(!skipTransformation && {
            transformation: [
              { width: 500, height: 500, crop: 'limit' }, // Max dimensions
              { quality: 'auto:good' }, // Auto quality optimization
              { fetch_format: 'auto' }, // Auto format conversion
            ],
          }),
        },
        (error, result) => {
          if (error) {
            reject(new ApiError(500, `Cloudinary upload failed: ${error.message}`));
          } else if (result) {
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
            });
          }
        }
      );

      uploadStream.end(fileBuffer);
    });
  } catch (error: any) {
    throw new ApiError(500, `Failed to upload image: ${error.message}`);
  }
};

/**
 * Delete image from Cloudinary
 * @param publicId - Public ID of the image to delete
 * @returns Deletion result
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    if (!publicId) {
      return;
    }

    // Don't delete default images
    if (publicId.includes('syqrnws7rzkjxxvullsa') || publicId.includes('ahvxgdh0shutx72okak0') || publicId.includes('hgzajopjhoqzh1zf3lna')) {
      return;
    }

    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new ApiError(500, 'Failed to delete image from Cloudinary');
    }
  } catch (error: any) {
    console.error('Cloudinary deletion error:', error);
    // Don't throw error for deletion failures, just log them
  }
};

/**
 * Extract public_id from Cloudinary URL
 * @param url - Full Cloudinary URL
 * @returns Public ID
 */
export const extractPublicId = (url: string): string | null => {
  try {
    if (!url || !url.includes('cloudinary.com')) {
      return null;
    }

    // Extract public_id from URL
    // Format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{public_id}.{format}
    const matches = url.match(/\/v\d+\/(.+)\.\w+$/);
    if (matches && matches[1]) {
      return matches[1];
    }

    // Alternative format without version
    const matches2 = url.match(/\/upload\/(.+)\.\w+$/);
    if (matches2 && matches2[1]) {
      return matches2[1];
    }

    return null;
  } catch (error) {
    console.error('Error extracting public_id:', error);
    return null;
  }
};

/**
 * Get default avatar URL based on gender
 * @param gender - 'male' or 'female'
 * @returns Default avatar URL (now uses random preset avatar)
 */
export const getDefaultAvatar = (gender: string): string => {
  return getAvatarUrl(getDefaultAvatarId(gender));
};

/**
 * Get default group display picture URL
 * @returns Default group DP URL (now uses random preset avatar)
 */
export const getDefaultGroupDP = (): string => {
  return getAvatarUrl(getDefaultGroupAvatarId());
};
