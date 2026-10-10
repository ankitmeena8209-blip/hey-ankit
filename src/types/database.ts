export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'disabled';
export type MessageType = 'text' | 'image';

export interface Profile {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  recipient_id?: string | null;
  admin_id?: string | null;
  created_at: string;
  updated_at: string;
  // Joined profile data
  user?: Profile;
  recipient?: Profile;
  admin?: Profile;
  other_user?: Profile; // Helper for current user's chat partner
  last_message?: Message | null;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: MessageType;
  body: string | null;
  image_path: string | null;
  created_at: string;
  edited_at: string | null;
  read_at: string | null;
  is_one_time?: boolean;
  viewed_by?: string[] | null;
  // Joined sender profile
  sender?: Profile;
  // Local state for optimistic updates / signed URL
  signed_url?: string;
  is_optimistic?: boolean;
}

// 10-day media auto-deletion threshold
export const MEDIA_EXPIRY_DAYS = 10;
export const isMediaExpired = (createdAt: string): boolean => {
  try {
    const createdTime = new Date(createdAt).getTime();
    if (isNaN(createdTime)) return false;
    const now = Date.now();
    const ageMs = now - createdTime;
    return ageMs > MEDIA_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

export interface MessageAudit {
  id: string;
  message_id: string;
  sender_id: string;
  conversation_id: string;
  body: string | null;
  image_path: string | null;
  original_created_at: string;
  deleted_at: string;
  deleted_by: string;
  sender?: Profile;
  deleted_by_user?: Profile;
  signed_url?: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; username: string };
        Update: Partial<Profile>;
      };
      conversations: {
        Row: Conversation;
        Insert: Partial<Conversation> & { user_id: string };
        Update: Partial<Conversation>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at' | 'edited_at' | 'read_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Message>;
      };
      message_audit: {
        Row: MessageAudit;
        Insert: Omit<MessageAudit, 'id'>;
        Update: Partial<MessageAudit>;
      };
    };
  };
}

