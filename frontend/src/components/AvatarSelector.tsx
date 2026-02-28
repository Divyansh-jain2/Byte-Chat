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
        <h3 className="text-lg font-semibold" style={{ color: 'var(--heading)' }}>
          Choose a Preset Avatar
        </h3>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {AVATAR_OPTIONS.length} options
        </p>
      </div>

      <div className="max-h-96 overflow-y-auto rounded-2xl p-4 glass">
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
                  relative aspect-square rounded-xl overflow-hidden
                  transition-all duration-200 
                  ${isSelected 
                    ? 'ring-4 scale-105' 
                    : 'ring-2 hover:scale-105'
                  }
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  focus:outline-none focus:ring-4
                `}
                style={isSelected 
                  ? { 
                      borderColor: 'var(--pink)',
                      boxShadow: '0 0 0 4px rgba(236, 72, 153, 0.3)'
                    } 
                  : { 
                      borderColor: 'var(--border-light)',
                      boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.1)'
                    }
                }
                title={avatarId}
              >
              <Image
                src={avatarUrl}
                alt={`Avatar ${avatarId}`}
                width={80}
                height={80}
                className="w-full h-full rounded-xl object-cover"
              />
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(236, 72, 153, 0.2)' }}>
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

      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
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
