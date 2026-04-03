import { pool } from '../lib/db.js';
import { cacheKeys, CACHE_TTL_SECONDS, getCacheJSON, setCacheJSON } from '../utils/cache.util.js';

export interface CachedUserProfile {
  user_id: string;
  roll_no: string | null;
  name: string | null;
  gender: string | null;
  branch: string | null;
  dp_url: string | null;
  dob: string | null;
  bio: string | null;
  is_verified: boolean | null;
  is_active: boolean | null;
  instagram_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export async function getUserProfileCached(userId: string): Promise<CachedUserProfile | null> {
  const cacheKey = cacheKeys.userProfile(userId);
  const cached = await getCacheJSON<CachedUserProfile>(cacheKey);
  if (cached) {
    return cached;
  }

  const result = await pool.query(
    `SELECT
      user_id, roll_no, name, gender, branch,
      dp_url, dob, bio, is_verified, is_active,
      instagram_url, twitter_url, linkedin_url,
      created_at, updated_at
     FROM users
     WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const profile = result.rows[0] as CachedUserProfile;
  await setCacheJSON(cacheKey, profile, CACHE_TTL_SECONDS.USER_PROFILE);
  return profile;
}

export async function getUserGenderCached(userId: string): Promise<string | null> {
  const profile = await getUserProfileCached(userId);
  return profile?.gender ?? null;
}
