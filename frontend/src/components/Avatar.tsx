'use client';

import React from 'react';
import { getUserAvatar } from '@/services/image.service';
import Image from 'next/image';
import { useState } from 'react';

interface AvatarProps {
  dpUrl?: string | null;
  gender: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  priority?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

/**
 * Avatar component with fallback to default gender-based avatar
 * Displays user profile picture or default avatar based on gender
 */
export default function Avatar({
  dpUrl,
  gender,
  name,
  size = 'md',
  className = '',
  showOnlineStatus = false,
  isOnline = false,
  priority = false,
}: AvatarProps) {
  const avatarUrl = getUserAvatar(dpUrl || null, gender);
  const sizeClass = sizeClasses[size];

  return (
    <div className={`relative inline-block ${className}`}>
      <Image
        src={avatarUrl}
        alt={`${name}'s avatar`}
        width={200}
        height={200}
        className={`${sizeClass} rounded-full object-cover border-2 border-gray-200`}
        priority={priority}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = getUserAvatar(null, gender);
        }}
      />

      {/* Online status indicator */}
      {showOnlineStatus && (
        <span
          className={`absolute bottom-0 right-0 block rounded-full border-2 border-white ${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'
            } ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
        />
      )}
    </div>
  );
}

/**
 * Group Avatar component
 */
interface GroupAvatarProps {
  groupDpUrl?: string | null;
  groupName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  priority?: boolean;
}

export function GroupAvatar({ groupDpUrl, groupName,
  size = 'md', className = '', priority = false, }: GroupAvatarProps) {
  const sizeClass = sizeClasses[size];
  const defaultGroupImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=random&color=fff&size=200`;
  const [src, setSrc] = useState(groupDpUrl || defaultGroupImage);

  return (
    <div className={`relative inline-block ${className}`}>
      <Image
        src={src}
        alt={`${groupName}'s avatar`}
        width={200}
        height={200}
        className={`${sizeClass} rounded-full object-cover border-2 border-gray-200`}
        priority={priority}
        onError={() => setSrc(defaultGroupImage)}
      />
    </div>
  );
}

/**
 * Avatar with name component - shows avatar with user/group name
 */
interface AvatarWithNameProps extends AvatarProps {
  subtitle?: string;
  onClick?: () => void;
}

export function AvatarWithName({
  dpUrl,
  gender,
  name,
  subtitle,
  size = 'md',
  className = '',
  showOnlineStatus = false,
  isOnline = false,
  priority = false,
  onClick,
}: AvatarWithNameProps) {
  return (
    <div
      className={`flex items-center gap-3 ${onClick ? 'cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition' : ''} ${className}`}
      onClick={onClick}
    >
      <Avatar
        dpUrl={dpUrl}
        gender={gender}
        name={name}
        size={size}
        showOnlineStatus={showOnlineStatus}
        isOnline={isOnline}
        priority={priority}
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{name}</p>
        {subtitle && (
          <p className="text-sm text-gray-500 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Group Avatar with name component
 */
interface GroupAvatarWithNameProps extends GroupAvatarProps {
  subtitle?: string;
  memberCount?: number;
  onClick?: () => void;
}

export function GroupAvatarWithName({
  groupDpUrl,
  groupName,
  subtitle,
  memberCount,
  size = 'md',
  className = '',
  priority = false,
  onClick,
}: GroupAvatarWithNameProps) {
  return (
    <div
      className={`flex items-center gap-3 ${onClick ? 'cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition' : ''} ${className}`}
      onClick={onClick}
    >
      <GroupAvatar
        groupDpUrl={groupDpUrl}
        groupName={groupName}
        size={size}
        priority={priority}
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{groupName}</p>
        {subtitle && (
          <p className="text-sm text-gray-500 truncate">{subtitle}</p>
        )}
        {memberCount !== undefined && (
          <p className="text-xs text-gray-400">{memberCount} members</p>
        )}
      </div>
    </div>
  );
}
