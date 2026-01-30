-- ============================================
-- ENCRYPTED CHAT APP - RELATIONAL SCHEMA
-- Corrected for Supabase
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLE 1: users
-- ============================================
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name VARCHAR(50) UNIQUE NOT NULL,
  email_enc TEXT NOT NULL,            -- Encrypted email (app-level)
  pass_hash TEXT NOT NULL,            -- bcrypt/scrypt hash
  salt TEXT,                          -- Password salt
  public_name VARCHAR(100),           -- Display name
  avatar_hash TEXT,                   -- Hash of profile picture
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ              -- Soft delete (NULL = not deleted)
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_is_online ON users (is_online);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users (last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at);

-- ============================================
-- TABLE 2: user_keys
-- ============================================
CREATE TABLE user_keys (
  user_id UUID PRIMARY KEY,
  public_key TEXT NOT NULL,               -- RSA/ECC public key
  private_key_encrypted TEXT NOT NULL,    -- Encrypted with user's password
  key_salt TEXT NOT NULL,
  key_algorithm VARCHAR(50) NOT NULL DEFAULT 'RSA-2048',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_rotated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================
-- TABLE 3: devices (FIXED: added user_id)
-- ============================================
CREATE TABLE devices (
  device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                -- FIXED: Added this field
  device_hash TEXT NOT NULL UNIQUE,     -- Unique device identifier
  device_name VARCHAR(100),             -- Added: User-friendly name
  last_login TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_public_key TEXT,               -- Device-specific key for multi-device sync
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Unique constraint: same device can't be registered twice for same user
  UNIQUE(user_id, device_hash)
);

-- Indexes for devices
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices (user_id);
CREATE INDEX IF NOT EXISTS idx_devices_last_login ON devices (last_login DESC);

-- ============================================
-- TABLE 4: conversations
-- ============================================
CREATE TABLE conversations (
  conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- Added for sorting
  
  -- Foreign keys
  FOREIGN KEY (user1_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (user2_id) REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Constraints
  UNIQUE(user1_id, user2_id),           -- Prevent duplicate conversations
  CHECK (user1_id <> user2_id)          -- No self-conversations
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations (user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations (user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations (last_message_at DESC);

-- ============================================
-- TABLE 5: session_keys
-- ============================================
CREATE TABLE session_keys (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,                -- Which user this key is encrypted for
  session_key_encrypted TEXT NOT NULL,  -- Encrypted with user's public key
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Foreign keys
  FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Unique: each user gets one session key per conversation
  UNIQUE(conversation_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_keys_conversation ON session_keys (conversation_id);
CREATE INDEX IF NOT EXISTS idx_session_keys_user ON session_keys (user_id);

-- ============================================
-- TABLE 6: groups
-- ============================================
CREATE TABLE groups (
  group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,                      -- Added: group description
  admin_id UUID NOT NULL,
  avatar_hash TEXT,                      -- Group profile picture
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key
  FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_groups_admin ON groups (admin_id);
CREATE INDEX IF NOT EXISTS idx_groups_public ON groups (is_public);

-- ============================================
-- TABLE 7: group_members
-- ============================================
CREATE TABLE group_members (
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  
  -- Composite primary key
  PRIMARY KEY (group_id, user_id),
  
  -- Foreign keys
  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members (group_id);

-- ============================================
-- TABLE 8: messages (1:1 chat messages)
-- ============================================
CREATE TABLE messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,          -- Changed: NOT NULL for 1:1 messages
  sender_id UUID NOT NULL,
  content_encrypted TEXT NOT NULL,
  iv TEXT NOT NULL,                       -- AES initialization vector
  hmac TEXT NOT NULL,                     -- Integrity check
  message_type VARCHAR(20) NOT NULL DEFAULT 'text' 
    CHECK (message_type IN ('text', 'image', 'file', 'video', 'audio')),
  media_url_encrypted TEXT,               -- Encrypted CDN URL for media
  status VARCHAR(20) NOT NULL DEFAULT 'sent' 
    CHECK (status IN ('sent', 'delivered', 'read')),
  timestamp_client TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  
  -- Foreign keys
  FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, server_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages (status);

-- ============================================
-- TABLE 9: group_messages
-- ============================================
CREATE TABLE group_messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content_encrypted TEXT NOT NULL,
  iv TEXT NOT NULL,
  hmac TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text' 
    CHECK (message_type IN ('text', 'image', 'file', 'video', 'audio')),
  media_url_encrypted TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  timestamp_client TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign keys
  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages (group_id, server_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender ON group_messages (sender_id);

-- ============================================
-- TABLE 10: message_status (read receipts)
-- ============================================
CREATE TABLE message_status (
  message_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'sent' 
    CHECK (status IN ('sent', 'delivered', 'read')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Composite primary key
  PRIMARY KEY (message_id, user_id),
  
  -- Foreign keys
  FOREIGN KEY (message_id) REFERENCES messages(message_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_status_user ON message_status (user_id, updated_at DESC);

-- ============================================
-- TABLE 11: group_session_keys
-- ============================================
CREATE TABLE group_session_keys (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  session_key_encrypted TEXT NOT NULL,    -- Different for each group member
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Foreign keys
  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Unique: one key per user per group
  UNIQUE(group_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_session_keys_group ON group_session_keys (group_id);
CREATE INDEX IF NOT EXISTS idx_group_session_keys_user ON group_session_keys (user_id);


-- -- ============================================
-- -- ENCRYPTED CHAT APP - RELATIONAL SCHEMA
-- -- Complete with fixes and sample data
-- -- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -- ============================================
-- -- TABLE 1: users
-- -- ============================================
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_number TEXT UNIQUE NOT NULL,
  user_name VARCHAR(50) NOT NULL,
  gender VARCHAR(10),
  branch VARCHAR(50),
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  dob DATE,
  dp_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

-- Indexes for users
CREATE INDEX idx_users_is_online ON users (is_online);
CREATE INDEX idx_users_last_seen_at ON users (last_seen_at DESC);
CREATE INDEX idx_users_deleted_at ON users (deleted_at);
CREATE INDEX idx_users_roll_number ON users (roll_number);

-- ============================================
-- TABLE 2: user_keys
-- ============================================
CREATE TABLE user_keys (
  user_id UUID PRIMARY KEY,
  public_key TEXT NOT NULL,
  private_key_encrypted TEXT NOT NULL,
  key_salt TEXT NOT NULL,
  key_algorithm VARCHAR(50) NOT NULL DEFAULT 'RSA-2048',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_rotated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================
-- TABLE 3: devices
-- ============================================
CREATE TABLE devices (
  device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_hash TEXT NOT NULL,
  device_name VARCHAR(100),
  device_public_key TEXT,
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE(user_id, device_hash)
);

CREATE INDEX idx_devices_user_id ON devices (user_id);
CREATE INDEX idx_devices_last_login_at ON devices (last_login_at DESC);

-- ============================================
-- TABLE 4: conversations
-- ============================================
CREATE TABLE conversations (
  conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (user1_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (user2_id) REFERENCES users(user_id) ON DELETE CASCADE,
  
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id <> user2_id)
);

CREATE INDEX idx_conversations_user1 ON conversations (user1_id);
CREATE INDEX idx_conversations_user2 ON conversations (user2_id);
CREATE INDEX idx_conversations_last_message_at ON conversations (last_message_at DESC);

-- ============================================
-- TABLE 5: groups
-- ============================================
CREATE TABLE groups (
  group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  admin_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  
  FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_groups_admin ON groups (admin_id);

-- ============================================
-- TABLE 6: group_members
-- ============================================
CREATE TABLE group_members (
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_group_members_user ON group_members (user_id);
CREATE INDEX idx_group_members_group ON group_members (group_id);

-- ============================================
-- TABLE 7: session_keys
-- ============================================
CREATE TABLE session_keys (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  group_id UUID,
  user_id UUID NOT NULL,
  session_key_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  
  FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  
  CHECK (
    (conversation_id IS NOT NULL AND group_id IS NULL) OR
    (conversation_id IS NULL AND group_id IS NOT NULL)
  )
);

-- Partial unique indexes for NULL handling
CREATE UNIQUE INDEX idx_unique_conversation_user ON session_keys (conversation_id, user_id) 
  WHERE conversation_id IS NOT NULL;

CREATE UNIQUE INDEX idx_unique_group_user ON session_keys (group_id, user_id) 
  WHERE group_id IS NOT NULL;

CREATE INDEX idx_session_keys_conversation ON session_keys (conversation_id);
CREATE INDEX idx_session_keys_group ON session_keys (group_id);
CREATE INDEX idx_session_keys_user ON session_keys (user_id);

-- ============================================
-- TABLE 8: messages
-- ============================================
CREATE TABLE messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  group_id UUID,
  sender_id UUID NOT NULL,
  content_encrypted TEXT NOT NULL,
  iv TEXT NOT NULL,
  hmac TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text' 
    CHECK (message_type IN ('text', 'image', 'file', 'video', 'audio')),
  media_url_encrypted TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'sent' 
    CHECK (status IN ('sent', 'delivered', 'read')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  
  FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE,
  
  CHECK (
    (conversation_id IS NOT NULL AND group_id IS NULL) OR
    (conversation_id IS NULL AND group_id IS NOT NULL)
  )
);

CREATE INDEX idx_messages_conversation ON messages (conversation_id, server_timestamp DESC);
CREATE INDEX idx_messages_group ON messages (group_id, server_timestamp DESC);
CREATE INDEX idx_messages_sender ON messages (sender_id);
CREATE INDEX idx_messages_status ON messages (status);

-- ============================================
-- TABLE 9: message_status
-- ============================================
CREATE TABLE message_status (
  message_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'sent' 
    CHECK (status IN ('sent', 'delivered', 'read')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES messages(message_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_message_status_user ON message_status (user_id, updated_at DESC);

-- ============================================
-- TABLE 10: group_message_read
-- ============================================
CREATE TABLE group_message_read (
  message_id UUID NOT NULL,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES messages(message_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_group_message_read_user ON group_message_read (user_id);
CREATE INDEX idx_group_message_read_message ON group_message_read (message_id);

-- ============================================
-- COMPREHENSIVE SAMPLE DATA
-- ============================================

-- Insert 8 sample users
INSERT INTO users (roll_number, user_name, gender, branch, password_hash, password_salt, dob, dp_url, is_online) VALUES
('2024001', 'Alice Johnson', 'Female', 'CSE', '$2a$10$N9qo8uLOickgx2ZMRZoMye', 'salt_001', '2000-05-15', 'https://example.com/alice.jpg', TRUE),
('2024002', 'Bob Smith', 'Male', 'ECE', '$2a$10$B6Z5F3pQ9rRk2M7N1VXoYt', 'salt_002', '2001-02-20', 'https://example.com/bob.jpg', FALSE),
('2024003', 'Charlie Brown', 'Male', 'CSE', '$2a$10$C7M6N8oLpQrS2T1U9V0WXy', 'salt_003', '2000-11-30', 'https://example.com/charlie.jpg', TRUE),
('2024004', 'Diana Prince', 'Female', 'EEE', '$2a$10$D8N9M0pLqOrR3T2V1W2X3y', 'salt_004', '2001-07-10', 'https://example.com/diana.jpg', TRUE),
('2024005', 'Ethan Hunt', 'Male', 'ME', '$2a$10$E9O8N1pMqPrS4T3W2X3Y4z', 'salt_005', '2000-09-25', 'https://example.com/ethan.jpg', FALSE),
('2024006', 'Fiona Gallagher', 'Female', 'CSE', '$2a$10$F0P9O2qNrQtT5U4X3Y4Z5a', 'salt_006', '2001-04-12', 'https://example.com/fiona.jpg', TRUE),
('2024007', 'George Miller', 'Male', 'ECE', '$2a$10$G1Q0P3rOsRuU6V5Y4Z5A6b', 'salt_007', '2000-08-18', 'https://example.com/george.jpg', FALSE),
('2024008', 'Hannah Baker', 'Female', 'EEE', '$2a$10$H2R1Q4sPtSvV7W6Z5A6B7c', 'salt_008', '2001-01-05', 'https://example.com/hannah.jpg', TRUE);

-- Insert user keys for all users
INSERT INTO user_keys (user_id, public_key, private_key_encrypted, key_salt) VALUES
((SELECT user_id FROM users WHERE roll_number = '2024001'), '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFA...AlicePubKey...\n-----END PUBLIC KEY-----', 'U2FsdGVkX1/...EncryptedAlicePrivate...', 'key_salt_a1'),
((SELECT user_id FROM users WHERE roll_number = '2024002'), '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFA...BobPubKey...\n-----END PUBLIC KEY-----', 'U2FsdGVkX1/...EncryptedBobPrivate...', 'key_salt_b2'),
((SELECT user_id FROM users WHERE roll_number = '2024003'), '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFA...CharliePubKey...\n-----END PUBLIC KEY-----', 'U2FsdGVkX1/...EncryptedCharliePrivate...', 'key_salt_c3'),
((SELECT user_id FROM users WHERE roll_number = '2024004'), '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFA...DianaPubKey...\n-----END PUBLIC KEY-----', 'U2FsdGVkX1/...EncryptedDianaPrivate...', 'key_salt_d4'),
((SELECT user_id FROM users WHERE roll_number = '2024005'), '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFA...EthanPubKey...\n-----END PUBLIC KEY-----', 'U2FsdGVkX1/...EncryptedEthanPrivate...', 'key_salt_e5'),
((SELECT user_id FROM users WHERE roll_number = '2024006'), '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFA...FionaPubKey...\n-----END PUBLIC KEY-----', 'U2FsdGVkX1/...EncryptedFionaPrivate...', 'key_salt_f6'),
((SELECT user_id FROM users WHERE roll_number = '2024007'), '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFA...GeorgePubKey...\n-----END PUBLIC KEY-----', 'U2FsdGVkX1/...EncryptedGeorgePrivate...', 'key_salt_g7'),
((SELECT user_id FROM users WHERE roll_number = '2024008'), '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFA...HannahPubKey...\n-----END PUBLIC KEY-----', 'U2FsdGVkX1/...EncryptedHannahPrivate...', 'key_salt_h8');

-- Insert devices for users
INSERT INTO devices (user_id, device_hash, device_name, device_public_key) VALUES
((SELECT user_id FROM users WHERE roll_number = '2024001'), 'iphone_123456', 'iPhone 15', '-----BEGIN DEVICE KEY-----\n...AliceDevice1...\n-----END DEVICE KEY-----'),
((SELECT user_id FROM users WHERE roll_number = '2024001'), 'macbook_abcdef', 'MacBook Pro', '-----BEGIN DEVICE KEY-----\n...AliceDevice2...\n-----END DEVICE KEY-----'),
((SELECT user_id FROM users WHERE roll_number = '2024002'), 'android_789012', 'Samsung Galaxy', '-----BEGIN DEVICE KEY-----\n...BobDevice1...\n-----END DEVICE KEY-----'),
((SELECT user_id FROM users WHERE roll_number = '2024003'), 'windows_pc_xyz', 'Windows Laptop', '-----BEGIN DEVICE KEY-----\n...CharlieDevice1...\n-----END DEVICE KEY-----'),
((SELECT user_id FROM users WHERE roll_number = '2024004'), 'iphone_345678', 'iPhone 14', '-----BEGIN DEVICE KEY-----\n...DianaDevice1...\n-----END DEVICE KEY-----');

-- Create conversations between users
INSERT INTO conversations (user1_id, user2_id) VALUES
((SELECT user_id FROM users WHERE roll_number = '2024001'), (SELECT user_id FROM users WHERE roll_number = '2024002')),
((SELECT user_id FROM users WHERE roll_number = '2024001'), (SELECT user_id FROM users WHERE roll_number = '2024003')),
((SELECT user_id FROM users WHERE roll_number = '2024002'), (SELECT user_id FROM users WHERE roll_number = '2024004')),
((SELECT user_id FROM users WHERE roll_number = '2024003'), (SELECT user_id FROM users WHERE roll_number = '2024005')),
((SELECT user_id FROM users WHERE roll_number = '2024006'), (SELECT user_id FROM users WHERE roll_number = '2024007'));

-- Create groups
INSERT INTO groups (name, admin_id, description, is_public) VALUES
('Project Team Alpha', (SELECT user_id FROM users WHERE roll_number = '2024001'), 'Final year project group', TRUE),
('CSE Study Group', (SELECT user_id FROM users WHERE roll_number = '2024003'), 'CSE students study materials', TRUE),
('Friends Circle', (SELECT user_id FROM users WHERE roll_number = '2024002'), 'Close friends group', FALSE),
('College Events', (SELECT user_id FROM users WHERE roll_number = '2024004'), 'College event announcements', TRUE);

-- Add members to groups
INSERT INTO group_members (group_id, user_id, role) VALUES
-- Project Team Alpha
((SELECT group_id FROM groups WHERE name = 'Project Team Alpha'), (SELECT user_id FROM users WHERE roll_number = '2024001'), 'admin'),
((SELECT group_id FROM groups WHERE name = 'Project Team Alpha'), (SELECT user_id FROM users WHERE roll_number = '2024002'), 'member'),
((SELECT group_id FROM groups WHERE name = 'Project Team Alpha'), (SELECT user_id FROM users WHERE roll_number = '2024003'), 'member'),
((SELECT group_id FROM groups WHERE name = 'Project Team Alpha'), (SELECT user_id FROM users WHERE roll_number = '2024006'), 'member'),

-- CSE Study Group
((SELECT group_id FROM groups WHERE name = 'CSE Study Group'), (SELECT user_id FROM users WHERE roll_number = '2024001'), 'member'),
((SELECT group_id FROM groups WHERE name = 'CSE Study Group'), (SELECT user_id FROM users WHERE roll_number = '2024003'), 'admin'),
((SELECT group_id FROM groups WHERE name = 'CSE Study Group'), (SELECT user_id FROM users WHERE roll_number = '2024006'), 'member'),

-- Friends Circle
((SELECT group_id FROM groups WHERE name = 'Friends Circle'), (SELECT user_id FROM users WHERE roll_number = '2024002'), 'admin'),
((SELECT group_id FROM groups WHERE name = 'Friends Circle'), (SELECT user_id FROM users WHERE roll_number = '2024004'), 'member'),
((SELECT group_id FROM groups WHERE name = 'Friends Circle'), (SELECT user_id FROM users WHERE roll_number = '2024005'), 'member'),

-- College Events
((SELECT group_id FROM groups WHERE name = 'College Events'), (SELECT user_id FROM users WHERE roll_number = '2024004'), 'admin'),
((SELECT group_id FROM groups WHERE name = 'College Events'), (SELECT user_id FROM users WHERE roll_number = '2024001'), 'member'),
((SELECT group_id FROM groups WHERE name = 'College Events'), (SELECT user_id FROM users WHERE roll_number = '2024002'), 'member'),
((SELECT group_id FROM groups WHERE name = 'College Events'), (SELECT user_id FROM users WHERE roll_number = '2024003'), 'member'),
((SELECT group_id FROM groups WHERE name = 'College Events'), (SELECT user_id FROM users WHERE roll_number = '2024006'), 'member'),
((SELECT group_id FROM groups WHERE name = 'College Events'), (SELECT user_id FROM users WHERE roll_number = '2024007'), 'member'),
((SELECT group_id FROM groups WHERE name = 'College Events'), (SELECT user_id FROM users WHERE roll_number = '2024008'), 'member');

-- Create session keys for conversations
INSERT INTO session_keys (conversation_id, user_id, session_key_encrypted, expires_at) VALUES
-- Alice-Bob conversation keys
((SELECT conversation_id FROM conversations WHERE user1_id = (SELECT user_id FROM users WHERE roll_number = '2024001') LIMIT 1), 
 (SELECT user_id FROM users WHERE roll_number = '2024001'), 'U2FsdGVkX1/...AliceSessionKey1...', NOW() + INTERVAL '60 days'),
((SELECT conversation_id FROM conversations WHERE user1_id = (SELECT user_id FROM users WHERE roll_number = '2024001') LIMIT 1), 
 (SELECT user_id FROM users WHERE roll_number = '2024002'), 'U2FsdGVkX1/...BobSessionKey1...', NOW() + INTERVAL '60 days'),

-- Alice-Charlie conversation keys
((SELECT conversation_id FROM conversations WHERE user1_id = (SELECT user_id FROM users WHERE roll_number = '2024001') AND user2_id = (SELECT user_id FROM users WHERE roll_number = '2024003')), 
 (SELECT user_id FROM users WHERE roll_number = '2024001'), 'U2FsdGVkX1/...AliceSessionKey2...', NOW() + INTERVAL '60 days'),
((SELECT conversation_id FROM conversations WHERE user1_id = (SELECT user_id FROM users WHERE roll_number = '2024001') AND user2_id = (SELECT user_id FROM users WHERE roll_number = '2024003')), 
 (SELECT user_id FROM users WHERE roll_number = '2024003'), 'U2FsdGVkX1/...CharlieSessionKey1...', NOW() + INTERVAL '60 days');

-- Create session keys for groups
INSERT INTO session_keys (group_id, user_id, session_key_encrypted) VALUES
-- Project Team Alpha group keys
((SELECT group_id FROM groups WHERE name = 'Project Team Alpha'), (SELECT user_id FROM users WHERE roll_number = '2024001'), 'U2FsdGVkX1/...AliceGroupKey1...'),
((SELECT group_id FROM groups WHERE name = 'Project Team Alpha'), (SELECT user_id FROM users WHERE roll_number = '2024002'), 'U2FsdGVkX1/...BobGroupKey1...'),
((SELECT group_id FROM groups WHERE name = 'Project Team Alpha'), (SELECT user_id FROM users WHERE roll_number = '2024003'), 'U2FsdGVkX1/...CharlieGroupKey1...'),

-- CSE Study Group keys
((SELECT group_id FROM groups WHERE name = 'CSE Study Group'), (SELECT user_id FROM users WHERE roll_number = '2024001'), 'U2FsdGVkX1/...AliceGroupKey2...'),
((SELECT group_id FROM groups WHERE name = 'CSE Study Group'), (SELECT user_id FROM users WHERE roll_number = '2024003'), 'U2FsdGVkX1/...CharlieGroupKey2...');

-- Insert 1:1 chat messages
INSERT INTO messages (conversation_id, sender_id, content_encrypted, iv, hmac, message_type, status) VALUES
-- Alice to Bob
((SELECT conversation_id FROM conversations WHERE user1_id = (SELECT user_id FROM users WHERE roll_number = '2024001') LIMIT 1),
 (SELECT user_id FROM users WHERE roll_number = '2024001'),
 'U2FsdGVkX1/...Hello Bob! How are you?...', 'iv_abcdef123456', 'hmac_001', 'text', 'read'),

-- Bob to Alice
((SELECT conversation_id FROM conversations WHERE user1_id = (SELECT user_id FROM users WHERE roll_number = '2024001') LIMIT 1),
 (SELECT user_id FROM users WHERE roll_number = '2024002'),
 'U2FsdGVkX1/...Hi Alice! Im good, working on project...', 'iv_ghijk789012', 'hmac_002', 'text', 'read'),

-- Alice to Charlie
((SELECT conversation_id FROM conversations WHERE user1_id = (SELECT user_id FROM users WHERE roll_number = '2024001') AND user2_id = (SELECT user_id FROM users WHERE roll_number = '2024003')),
 (SELECT user_id FROM users WHERE roll_number = '2024001'),
 'U2FsdGVkX1/...Charlie, are we meeting tomorrow?...', 'iv_lmnop345678', 'hmac_003', 'text', 'delivered'),

-- Image message from Alice to Bob
((SELECT conversation_id FROM conversations WHERE user1_id = (SELECT user_id FROM users WHERE roll_number = '2024001') LIMIT 1),
 (SELECT user_id FROM users WHERE roll_number = '2024001'),
 'U2FsdGVkX1/...encrypted_image_data...', 'iv_qrstu901234', 'hmac_004', 'image', 'sent');

-- Insert group messages
INSERT INTO messages (group_id, sender_id, content_encrypted, iv, hmac, message_type, status) VALUES
-- Project Team Alpha messages
((SELECT group_id FROM groups WHERE name = 'Project Team Alpha'),
 (SELECT user_id FROM users WHERE roll_number = '2024001'),
 'U2FsdGVkX1/...Hello team! Lets start the meeting at 3 PM...', 'iv_grp_001', 'hmac_grp_001', 'text', 'delivered'),

((SELECT group_id FROM groups WHERE name = 'Project Team Alpha'),
 (SELECT user_id FROM users WHERE roll_number = '2024002'),
 'U2FsdGVkX1/...Ive uploaded the requirements document...', 'iv_grp_002', 'hmac_grp_002', 'file', 'sent'),

((SELECT group_id FROM groups WHERE name = 'Project Team Alpha'),
 (SELECT user_id FROM users WHERE roll_number = '2024003'),
 'U2FsdGVkX1/...I found a bug in the authentication module...', 'iv_grp_003', 'hmac_grp_003', 'text', 'sent'),

-- CSE Study Group messages
((SELECT group_id FROM groups WHERE name = 'CSE Study Group'),
 (SELECT user_id FROM users WHERE roll_number = '2024003'),
 'U2FsdGVkX1/...DBMS exam notes are available now...', 'iv_study_001', 'hmac_study_001', 'text', 'delivered'),

-- College Events announcement
((SELECT group_id FROM groups WHERE name = 'College Events'),
 (SELECT user_id FROM users WHERE roll_number = '2024004'),
 'U2FsdGVkX1/...Annual Tech Fest starts next Monday!...', 'iv_event_001', 'hmac_event_001', 'text', 'sent');

-- Insert message status (read receipts for 1:1 messages)
INSERT INTO message_status (message_id, user_id, status) VALUES
-- Bob read Alice's first message
((SELECT message_id FROM messages WHERE content_encrypted LIKE '%Hello Bob%'), 
 (SELECT user_id FROM users WHERE roll_number = '2024002'), 'read'),

-- Alice read Bob's reply
((SELECT message_id FROM messages WHERE content_encrypted LIKE '%Hi Alice%'), 
 (SELECT user_id FROM users WHERE roll_number = '2024001'), 'read');

-- Insert group message read status
INSERT INTO group_message_read (message_id, user_id) VALUES
-- Alice read first group message
((SELECT message_id FROM messages WHERE content_encrypted LIKE '%Hello team%'), 
 (SELECT user_id FROM users WHERE roll_number = '2024001')),

-- Bob read first group message
((SELECT message_id FROM messages WHERE content_encrypted LIKE '%Hello team%'), 
 (SELECT user_id FROM users WHERE roll_number = '2024002')),

-- Charlie read DBMS notes message
((SELECT message_id FROM messages WHERE content_encrypted LIKE '%DBMS exam%'), 
 (SELECT user_id FROM users WHERE roll_number = '2024003'));

-- Update conversation last_message_at timestamps
UPDATE conversations c SET last_message_at = (
  SELECT MAX(timestamp) 
  FROM messages m 
  WHERE m.conversation_id = c.conversation_id
) WHERE EXISTS (SELECT 1 FROM messages WHERE conversation_id = c.conversation_id);

-- ============================================
-- SAMPLE QUERIES TO VERIFY DATA
-- ============================================

-- Query 1: Show all users with online status
SELECT roll_number, user_name, branch, is_online, last_seen_at 
FROM users 
ORDER BY is_online DESC, user_name;

-- Query 2: Show conversations with participant names
SELECT 
  c.conversation_id,
  u1.user_name as user1_name,
  u2.user_name as user2_name,
  c.created_at,
  c.last_message_at
FROM conversations c
JOIN users u1 ON c.user1_id = u1.user_id
JOIN users u2 ON c.user2_id = u2.user_id
ORDER BY c.last_message_at DESC;

-- Query 3: Show groups with member counts
SELECT 
  g.name,
  g.description,
  u.user_name as admin_name,
  COUNT(gm.user_id) as member_count,
  g.created_at
FROM groups g
JOIN users u ON g.admin_id = u.user_id
LEFT JOIN group_members gm ON g.group_id = gm.group_id
GROUP BY g.group_id, u.user_name
ORDER BY member_count DESC;

-- Query 4: Show messages in Alice-Bob conversation
SELECT 
  m.message_id,
  u.user_name as sender,
  m.message_type,
  m.status,
  m.timestamp
FROM messages m
JOIN users u ON m.sender_id = u.user_id
WHERE m.conversation_id = (
  SELECT conversation_id 
  FROM conversations 
  WHERE user1_id = (SELECT user_id FROM users WHERE roll_number = '2024001')
    AND user2_id = (SELECT user_id FROM users WHERE roll_number = '2024002')
)
ORDER BY m.timestamp;

-- Query 5: Show session keys for each user
SELECT 
  u.user_name,
  COUNT(sk.session_id) as total_session_keys,
  COUNT(sk.conversation_id) as conversation_keys,
  COUNT(sk.group_id) as group_keys
FROM users u
LEFT JOIN session_keys sk ON u.user_id = sk.user_id
GROUP BY u.user_id, u.user_name
ORDER BY total_session_keys DESC;




DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;
