import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from './supabase';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Username format validation: lowercase alphanumeric or underscore, 3-20 chars
export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export function validateUsername(username: string): { valid: boolean; cleanUsername: string; error?: string } {
  // If user pasted an email by mistake, strip domain part
  let clean = username.trim().toLowerCase();
  if (clean.includes('@')) {
    clean = clean.split('@')[0];
  }

  if (!clean) {
    return { valid: false, cleanUsername: clean, error: 'Username is required.' };
  }
  if (clean.length < 3) {
    return { valid: false, cleanUsername: clean, error: 'Username must be at least 3 characters.' };
  }
  if (clean.length > 20) {
    return { valid: false, cleanUsername: clean, error: 'Username must be at most 20 characters.' };
  }
  if (!USERNAME_REGEX.test(clean)) {
    return { valid: false, cleanUsername: clean, error: 'Only lowercase letters, numbers, and underscores allowed.' };
  }
  return { valid: true, cleanUsername: clean };
}

export function usernameToEmail(username: string): string {
  return `${username.toLowerCase().trim()}@heyankit.invalid`;
}

export function emailToUsername(email: string): string {
  return email.replace(/@heyankit\.invalid$/i, '');
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const clean = name.trim();
  return clean.charAt(0).toUpperCase();
}

// 12-hour timestamp format: e.g. "11:03 AM"
export function formatMessageTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

// Date separators for chat: "Today", "Yesterday", "Monday", or "3/10/26"
export function formatChatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    if (isToday) return 'Today';

    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return 'Yesterday';

    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 3600 * 24));
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'long' });
    }

    return date.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' });
  } catch {
    return '';
  }
}

// Short relative time for Admin Inbox items: e.g. "2m", "11:03 AM", "Yesterday", "3/10/26"
export function formatShortTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    ) {
      return 'Yesterday';
    }

    const diffDays = Math.floor(diffSeconds / (3600 * 24));
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }

    return date.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' });
  } catch {
    return '';
  }
}

// Image compression utility
// Resizes large images to max width/height and compresses to WebP
export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<{ blob: Blob; ext: string }> {
  // Reject non-allowed types (no GIF, only JPEG/PNG/WebP)
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are supported.');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Prefer WebP for modern browsers, fallback to JPEG
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, ext: 'webp' });
          } else {
            // Fallback
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob) {
                  resolve({ blob: jpegBlob, ext: 'jpg' });
                } else {
                  reject(new Error('Image compression failed'));
                }
              },
              'image/jpeg',
              quality
            );
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = url;
  });
}

// Memory cache for signed image URLs with expiration tracking (1 hr cache duration)
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export async function getSignedImageUrl(imagePath: string): Promise<string | null> {
  if (!imagePath) return null;

  const now = Date.now();
  const cached = signedUrlCache.get(imagePath);
  if (cached && cached.expiresAt > now + 60000) {
    // Valid for at least 1 more minute
    return cached.url;
  }

  try {
    const { data, error } = await supabase.storage
      .from('chat-images')
      .createSignedUrl(imagePath, 3600); // 1 hour validity

    if (error || !data?.signedUrl) {
      return null;
    }

    signedUrlCache.set(imagePath, {
      url: data.signedUrl,
      expiresAt: now + 3500 * 1000,
    });

    return data.signedUrl;
  } catch {
    return null;
  }
}
