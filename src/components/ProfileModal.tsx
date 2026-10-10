import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { UserAvatar } from './UserAvatar';
import { X, Camera, Loader2, LogOut, Check, Sparkles } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=face',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, updateProfile, logout } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Image size must be under 2MB.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (publicData?.publicUrl) {
        setAvatarUrl(publicData.publicUrl);
      }
    } catch (err: unknown) {
      console.warn('Avatar upload fallback:', err);
      // Fallback: Read as base64 for instant preview and local storage
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const res = await updateProfile({
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      avatar_url: avatarUrl || null,
    });

    setSaving(false);

    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } else {
      setErrorMsg(res.error || 'Failed to save profile.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="w-full max-w-md bg-surface text-ink rounded-3xl p-6 shadow-2xl border border-line flex flex-col gap-4 max-h-[90dvh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-line/40">
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Edit Profile</h2>
              <p className="text-xs text-muted">Customize how you appear on Linksy</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-field transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="relative group">
                <UserAvatar
                  profile={{
                    username: profile?.username,
                    display_name: displayName || profile?.username,
                    avatar_url: avatarUrl,
                  }}
                  size="xl"
                />

                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-btn text-btn-ink flex items-center justify-center shadow-neu-raised cursor-pointer hover:opacity-90 transition-opacity"
                  title="Upload photo"
                >
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </div>

              {/* Avatar Presets */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-1 text-[11px] font-medium text-muted">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>Or pick an avatar preset:</span>
                </div>
                <div className="flex items-center gap-2">
                  {PRESET_AVATARS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all ${
                        avatarUrl === url ? 'border-btn scale-110' : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="text-[10px] text-muted hover:text-bad px-1.5 py-0.5 rounded bg-field transition-colors"
                      title="Clear avatar to initials"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Username (Immutable) */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-semibold text-ink">Username</label>
              <div className="h-10 px-3.5 rounded-xl bg-field/40 border border-line/30 flex items-center text-xs font-mono text-muted select-none">
                @{profile?.username}
              </div>
            </div>

            {/* Display Name */}
            <div className="flex flex-col gap-1">
              <label htmlFor="modal-dn" className="text-[12px] font-semibold text-ink">
                Display Name
              </label>
              <input
                id="modal-dn"
                type="text"
                maxLength={30}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full h-10 px-3.5 rounded-xl bg-field shadow-neu-inset text-xs text-ink outline-none border border-line/40 focus:border-ink/50 transition-all placeholder:text-muted/60"
              />
            </div>

            {/* Bio */}
            <div className="flex flex-col gap-1">
              <label htmlFor="modal-bio" className="text-[12px] font-semibold text-ink">
                Bio <span className="text-muted font-normal text-[11px]">(Optional)</span>
              </label>
              <textarea
                id="modal-bio"
                rows={2}
                maxLength={120}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short note about yourself..."
                className="w-full p-3 rounded-xl bg-field shadow-neu-inset text-xs text-ink outline-none border border-line/40 focus:border-ink/50 transition-all placeholder:text-muted/60 resize-none"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-bad/10 border border-bad/30 text-bad text-xs font-medium text-center">
                {errorMsg}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || uploading}
                className="flex-1 h-11 rounded-xl bg-btn text-btn-ink font-display text-sm font-semibold tracking-wide flex items-center justify-center gap-2 shadow-neu-float hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="h-11 px-4 rounded-xl bg-field hover:bg-bad/15 text-muted hover:text-bad border border-line/40 flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer"
                title="Log out of Linksy"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
            </div>
          </form>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-line/40 text-center text-[10px] text-muted">
            Linksy — by FRZI TOOLS • © 2026 FRZI TOOLS. All rights reserved.
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
