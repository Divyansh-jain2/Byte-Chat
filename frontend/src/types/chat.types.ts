export interface User {
  user_id: string;
  roll_no: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  branch: string;
  dob?: Date;
  dp_url?: string;
  bio?: string;
  is_verified: boolean;
  is_profile_complete: boolean;
  created_at: Date;
}

export interface ChatRequest {
  request_id: string;
  sender_id: string;
  receiver_id: string;
  request_type: 'normal' | 'anonymous';
  sender_display_name: string;
  sender_gender: string;
  sender_year?: number;
  sender_dp_url?: string;
  status: 'pending' | 'accepted' | 'rejected';
  expires_at: Date;
  created_at: Date;
}

export interface Conversation {
  conversation_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_dp?: string;
  other_user_gender: string;
  is_anonymous: boolean;
  last_message_preview?: string;
  last_message_type?: string;
  last_message_time?: string | Date;
  created_at: string | Date;
  unread_count: number;
  is_blocked: boolean;
}


export interface MessageSender {
  user_id: string;
  name: string;
  is_anonymous: boolean;
  display_gender?: string;
  avatar_url?: string;
}


export interface Message {
  message_id: string;
  conversation_id?: string;
  sender_id: string;
  sender_name: string;
  sender_gender: string;
  sender_dp?: string;
  message_type: 'text' | 'image' | 'file';
  encrypted_content: string;
  content_iv: string;
  content_auth_tag: string;
  media_url?: string;
  is_anonymous: boolean;
  is_my_message: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  my_status?: 'sent' | 'delivered' | 'read';
  delivered_at?: Date;
  sender?: MessageSender;
  read_at?: Date;
  created_at: Date;
  updated_at: Date;
}
