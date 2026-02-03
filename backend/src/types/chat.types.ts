export interface ChatRequest {
  request_id: string;
  sender_id: string;
  receiver_id: string;
  request_type: 'normal' | 'anonymous';
  anonymous_identity_id?: string;
  status: 'pending' | 'accepted' | 'rejected';
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Conversation {
  conversation_id: string;
  user1_id: string;
  user2_id: string;
  is_anonymous: boolean;
  anonymous_initiator_id?: string;
  is_accepted: boolean;
  is_blocked: boolean;
  blocked_by_user_id?: string;
  created_at: Date;
  updated_at: Date;
  last_message_at: Date;
}

export interface Message {
  message_id: string;
  conversation_id?: string;
  group_id?: string;
  sender_id: string;
  message_type: 'text' | 'image' | 'file';
  encrypted_content: string;
  content_iv: string;
  content_auth_tag: string;
  media_url?: string;
  media_size?: number;
  media_mime_type?: string;
  thumbnail_url?: string;
  is_anonymous: boolean;
  anonymous_identity_id?: string;
  is_edited: boolean;
  is_deleted: boolean;
  deleted_at?: Date;
  parent_message_id?: string;
  encryption_key_version: number;
  key_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface MessageStatus {
  status_id: string;
  message_id: string;
  user_id: string;
  status: 'sent' | 'delivered' | 'read';
  delivered_at?: Date;
  read_at?: Date;
  created_at: Date;
}

export interface AnonymousIdentity {
  identity_id: string;
  user_id: string;
  target_user_id?: string;
  conversation_id?: string;
  group_id?: string;
  random_string: string;
  display_gender: string;
  is_active: boolean;
  created_at: Date;
  last_used_at: Date;
  is_revealed: boolean;
  revealed_at?: Date;
}
