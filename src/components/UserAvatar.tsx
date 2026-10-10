import React from 'react';
import { getInitials, getAvatarColor, getDisplayName } from '../lib/utils';
import type { Profile } from '../types/database';

interface UserAvatarProps {
  profile?: Partial<Profile> | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  showOnlineStatus?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'w-7 h-7 text-[11px]',
  sm: 'w-9 h-9 text-[13px]',
  md: 'w-10 h-10 text-[15px]',
  lg: 'w-12 h-12 text-[18px]',
  xl: 'w-16 h-16 text-[24px]',
};

const badgeSizeClasses = {
  xs: 'w-2 h-2',
  sm: 'w-2.5 h-2.5',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  profile,
  size = 'md',
  isOnline,
  showOnlineStatus = false,
  className = '',
}) => {
  const username = profile?.username || 'User';
  const displayName = getDisplayName(profile as Profile);
  const initials = getInitials(displayName || username);
  const avatarUrl = profile?.avatar_url;
  const gradientClass = getAvatarColor(username);

  return (
    <div className={`relative flex-shrink-0 select-none ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className={`${sizeClasses[size]} rounded-full object-cover shadow-neu-raised border border-line/40 bg-surface`}
          loading="lazy"
          onError={(e) => {
            // Fallback to initials if image URL fails
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-tr ${gradientClass} text-white font-display font-bold flex items-center justify-center shadow-neu-raised border border-white/15`}
        >
          {initials}
        </div>
      )}

      {showOnlineStatus && (
        <span
          className={`absolute bottom-0 right-0 ${badgeSizeClasses[size]} rounded-full border-2 border-surface ${
            isOnline ? 'bg-emerald-500 ring-1 ring-emerald-400/50' : 'bg-gray-400'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};
