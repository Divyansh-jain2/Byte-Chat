'use client';

import { useState } from 'react';
import { AVATAR_OPTIONS, getAvatarUrl, extractAvatarPublicId } from '@/utils/avatar.utils';
import Image from 'next/image';

interface AvatarSelectorProps {
  currentAvatarUrl?: string;
  onSelect: (avatarId: string) => void;
  isLoading?: boolean;
}

export default function AvatarSelector({ 
  currentAvatarUrl, 
  onSelect, 
  isLoading = false 
}: AvatarSelectorProps) {
  const currentAvatarId = currentAvatarUrl ? extractAvatarPublicId(currentAvatarUrl) : null;
  const [selectedId, setSelectedId] = useState<string | null>(currentAvatarId);

  const handleSelect = (avatarId: string) => {
    setSelectedId(avatarId);
    onSelect(avatarId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Choose a Preset Avatar
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {AVATAR_OPTIONS.length} options
        </p>
      </div>

      <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 gap-3">
          {AVATAR_OPTIONS.map((avatarId) => {
            const isSelected = selectedId === avatarId;
            const avatarUrl = getAvatarUrl(avatarId);

            return (
              <button
                key={avatarId}
                type="button"
                onClick={() => handleSelect(avatarId)}
                disabled={isLoading}
                className={`
                  relative aspect-square rounded-lg overflow-hidden
                  transition-all duration-200 
                  ${isSelected 
                    ? 'ring-4 ring-blue-500 scale-105' 
                    : 'ring-2 ring-gray-200 dark:ring-gray-700 hover:ring-blue-300 dark:hover:ring-blue-600'
                  }
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                  focus:outline-none focus:ring-4 focus:ring-blue-500
                `}
                title={avatarId}
              >
              <Image
                src={avatarUrl}
                alt={`Avatar ${avatarId}`}
                width={48}
                height={48}
                className="rounded-lg object-cover"
              />
                {isSelected && (
                  <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                    <svg 
                      className="w-6 h-6 text-white drop-shadow-lg" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        <span>Click an avatar to select it. It will be saved automatically.</span>
      </div>
    </div>
  );
}
