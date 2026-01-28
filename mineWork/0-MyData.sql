

## **NEW SESSION KEYS EXPLANATION:**

### **PostgreSQL `chat_session_keys`:**
    ```sql
    -- Stores AES keys for each chat/group, encrypted per user
    -- Example: Chat between A & B has one AES key
    -- Stored as: [AES key encrypted with A's public key] + [same AES key encrypted with B's public key]
    ```

### **Redis `session_cache:{userId}:{chatId}`:**
    ```javascript
    // After user decrypts their AES key once, cache it here
    // Avoids decrypting with RSA on every message
    // TTL: 1 hour or until logout
    {
    "aesKey": "decrypted_aes_key_base64",
    "keyVersion": 1,
    "lastUsed": "timestamp"
    }
    ```

### **Redis `key_cache:{userId}:{chatId}`:**
    ```javascript
    // Similar to session_cache but shorter TTL
    // For frequently accessed chats
    // Cleared automatically after 5 minutes
    ```

### **Redis `ws_auth:{socketId}`:**
    ```javascript
    // WebSocket connection authentication
    // When socket connects, validate once and store
    // Prevents re-authentication on every message
    {
    "userId": "uuid",
    "sessionId": "session_token",
    "authenticatedAt": "timestamp"
    }
    ```

---

## **SESSION KEY FLOW:**
    1. **Login** → Create `session:{token}` in Redis + `user_sessions` in PostgreSQL
    2. **Start Chat** → Fetch `chat_session_keys` from DB → Decrypt with RSA once → Store in `session_cache`
    3. **Send Message** → Use cached AES key from `session_cache` → AES encrypt message
    4. **WebSocket** → Validate once → Store in `ws_auth:{socketId}`
    5. **Logout** → Delete all `session:*`, `session_cache:*`, `key_cache:*` for user

===============================================================

### **Core User Tables**
1. **users** - Main user table with verified student info (roll_no, name, gender, branch)
2. **user_verifications** - OTP verification records for signup/email verification
3. **user_sessions** - Active login sessions (for audit trail, Redis is primary)
4. **user_settings** - User preferences (theme, notification settings)
5. **user_password_resets** - Password reset tokens and timestamps

### **Chat & Messaging Tables**
6. **chat_conversations** - 1:1 personal chat metadata (between two users)
7. **chat_messages** - All messages (personal + group) with encrypted content
8. **message_status** - Read receipts and delivery status per user
9. **chat_requests** - Pending chat requests (normal + anonymous)
10. **anonymous_identities** - Random identities for anonymous chatting
11. **user_blocks** - Blocked user relationships

### **Group Tables**
12. **groups** - Group metadata (name, public/private, creator)
13. **group_members** - Memberships with admin status and anonymity
14. **group_invites** - Pending invites for private groups
15. **group_bans** - Banned users from groups (after poll kicks)

### **Polling & Voting Tables**
16. **polls** - Active voting sessions (kick user, make admin)
17. **votes** - Individual votes cast by users in polls

### **Media & Files**
18. **media_uploads** - Encrypted file metadata (images, documents)

### **System & Audit**
19. **audit_logs** - Important actions (logins, blocks, admin actions)
20. **reports** - User reports for moderation
21. **system_notifications** - In-app notifications

### **Encryption & Security**
22. **user_encryption_keys**: Only public keys
23. **chat_session_keys**: Per-chat/group AES keys encrypted per user



1. Core User Tables

-- ========== USERS TABLE ==========
-- Main user table - verified students only
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    roll_no VARCHAR(10) UNIQUE NOT NULL,  -- B23XX format
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    branch VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    dp_url TEXT,
    dob DATE,
    bio TEXT,
    year INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN roll_no LIKE 'B21%' THEN 4
            WHEN roll_no LIKE 'B22%' THEN 3
            WHEN roll_no LIKE 'B23%' THEN 2
            WHEN roll_no LIKE 'B24%' THEN 1
            ELSE 1
        END
    ) STORED,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_roll_no ON users(roll_no);
CREATE INDEX idx_users_branch ON users(branch);
CREATE INDEX idx_users_year ON users(year);

-- ========== USER_VERIFICATIONS TABLE ==========
-- OTP and email verification records
CREATE TABLE user_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    verification_type VARCHAR(20) NOT NULL CHECK (verification_type IN ('signup', 'reset_password', 'change_email')),
    otp_code VARCHAR(6) NOT NULL,
    token VARCHAR(255) UNIQUE,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ -- Think to use or not
);

CREATE INDEX idx_user_verifications_token ON user_verifications(token);
CREATE INDEX idx_user_verifications_user ON user_verifications(user_id);
CREATE INDEX idx_user_verifications_expires ON user_verifications(expires_at); -- Think about it

-- ========== USER_SESSIONS TABLE ==========
-- Alternative to Redis for sessions (can use both)
CREATE TABLE user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_info JSONB,
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);  -- Think about it

-- ========== USER_SETTINGS TABLE ==========
-- User preferences and settings
CREATE TABLE user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(10) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    notification_enabled BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    privacy_profile_public BOOLEAN DEFAULT TRUE,
    privacy_show_online_status BOOLEAN DEFAULT TRUE,
    privacy_allow_anonymous_chats BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_settings_user_id ON user_settings(user_id);

-- ========== USER_PASSWORD_RESETS TABLE ==========
CREATE TABLE user_password_resets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reset_token VARCHAR(255) UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_password_resets_token ON user_password_resets(reset_token);
CREATE INDEX idx_password_resets_user_id ON user_password_resets(user_id);


2. Chat & Messaging Tables

-- ========== CHAT_CONVERSATIONS TABLE ==========
-- 1:1 personal chats between users
CREATE TABLE chat_conversations (
    conversation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    anonymous_initiator_id UUID REFERENCES users(user_id), -- Who started as anonymous
    is_accepted BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_by_user_id UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
);


CREATE INDEX idx_conversations_user1 ON chat_conversations(user1_id);
CREATE INDEX idx_conversations_user2 ON chat_conversations(user2_id);
CREATE INDEX idx_conversations_last_message ON chat_conversations(last_message_at DESC);

-- ========== CHAT_MESSAGES TABLE ==========
-- ALL messages (personal + group)
CREATE TABLE chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE, -- NULL for personal
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'emoji')),
    
    -- Encrypted content
    encrypted_content TEXT NOT NULL, -- AES-256-GCM encrypted
    content_iv VARCHAR(50), -- Initialization vector
    content_auth_tag VARCHAR(50), -- Authentication tag
    
    -- For media messages
    media_url TEXT,
    media_size INTEGER,
    media_mime_type VARCHAR(100),
    thumbnail_url TEXT,
    
    -- Anonymous messaging
    is_anonymous BOOLEAN DEFAULT FALSE,
    anonymous_identity_id UUID REFERENCES anonymous_identities(id) ON DELETE SET NULL,
    
    -- Status
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    
    -- Parent message for replies
    parent_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,

    -- Encryption info
    encryption_key_version INTEGER DEFAULT 1,
    key_id UUID REFERENCES chat_session_keys(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON chat_messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_group ON chat_messages(group_id, created_at DESC);
CREATE INDEX idx_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_messages_created_at ON chat_messages(created_at DESC);

-- ========== MESSAGE_STATUS TABLE ==========
-- Read receipts and delivery status
CREATE TABLE message_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    read_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

CREATE INDEX idx_message_status_message ON message_status(message_id);
CREATE INDEX idx_message_status_user ON message_status(user_id);

-- ========== CHAT_REQUESTS TABLE ==========
CREATE TABLE chat_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(20) DEFAULT 'normal' CHECK (request_type IN ('normal', 'anonymous')),
    anonymous_identity_id UUID REFERENCES anonymous_identities(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked', 'expired')),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sender_id, receiver_id, request_type)
);

CREATE INDEX idx_chat_requests_receiver ON chat_requests(receiver_id, status);
CREATE INDEX idx_chat_requests_sender ON chat_requests(sender_id);

-- ========== ANONYMOUS_IDENTITIES TABLE ==========
-- Core of anonymous system
CREATE TABLE anonymous_identities (
    identity_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL for group anonymous
    conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    
    -- Display info
    random_string VARCHAR(50) UNIQUE NOT NULL,
    display_gender VARCHAR(10) NOT NULL CHECK (display_gender IN ('male', 'female', 'other')),
    display_year INTEGER NOT NULL CHECK (display_year BETWEEN 1 AND 4),
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    is_revealed BOOLEAN DEFAULT FALSE,
    revealed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraint: either target_user (1:1) OR group_id (group), not both
    -- Optional and see if can avoid this constraint
    CONSTRAINT chk_anon_target CHECK (
        (target_user_id IS NOT NULL AND group_id IS NULL) OR
        (target_user_id IS NULL AND group_id IS NOT NULL) OR
        (target_user_id IS NULL AND group_id IS NULL AND conversation_id IS NOT NULL)
    )
);

CREATE INDEX idx_anon_identities_user ON anonymous_identities(user_id);
CREATE INDEX idx_anon_identities_random ON anonymous_identities(random_string);
CREATE INDEX idx_anon_identities_target ON anonymous_identities(target_user_id);
CREATE INDEX idx_anon_identities_group ON anonymous_identities(group_id);

-- ========== USER_BLOCKS TABLE ==========
CREATE TABLE user_blocks (
    block_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
    block_type VARCHAR(20) DEFAULT 'permanent' CHECK (block_type IN ('permanent', 'temporary')),
    expires_at TIMESTAMPTZ,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON user_blocks(blocked_id);


3. Group Tables

-- ========== GROUPS TABLE ==========
CREATE TABLE groups (
    grp_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grp_name VARCHAR(100) NOT NULL,
    grp_description TEXT,
    grp_dp_url TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    max_members INTEGER DEFAULT 500,
    current_member_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_groups_public ON groups(is_public, created_at DESC);
CREATE INDEX idx_groups_creator ON groups(created_by);

-- ========== GROUP_MEMBERS TABLE ==========
CREATE TABLE group_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_owner BOOLEAN DEFAULT FALSE,
    
    -- Anonymous in group
    is_anonymous BOOLEAN DEFAULT FALSE,
    anonymous_display_name VARCHAR(50),
    anonymous_identity_id UUID REFERENCES anonymous_identities(id) ON DELETE SET NULL,
    
    -- Permissions
    -- See if we can avoid the same
    can_send_messages BOOLEAN DEFAULT TRUE,
    can_add_members BOOLEAN DEFAULT FALSE,
    can_remove_members BOOLEAN DEFAULT FALSE,
    can_edit_group BOOLEAN DEFAULT FALSE,
    
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_admin ON group_members(group_id) WHERE is_admin = TRUE;

-- ========== GROUP_INVITES TABLE ==========
CREATE TABLE group_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES users(id) ON DELETE CASCADE,
    invitee_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- these 2 can be avoided
    invite_token VARCHAR(255) UNIQUE,
    invite_type VARCHAR(20) DEFAULT 'private' CHECK (invite_type IN ('private', 'public_link')),
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, invitee_id)
);

CREATE INDEX idx_group_invites_invitee ON group_invites(invitee_id, status);
CREATE INDEX idx_group_invites_token ON group_invites(invite_token);

-- ========== GROUP_BANS TABLE ==========
-- After poll kicks or manual bans
CREATE TABLE group_bans (
    ban_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    banned_by UUID REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    expires_at TIMESTAMPTZ, -- NULL = permanent
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_bans_group ON group_bans(group_id);
CREATE INDEX idx_group_bans_user ON group_bans(user_id);



4. Polling & Voting Tables

-- ========== POLLS TABLE ==========
CREATE TABLE polls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    poll_type VARCHAR(20) NOT NULL CHECK (poll_type IN (
        'kick_member', 'make_admin', 'remove_admin', 
        'change_group_name', 'object_removal'
    )),
    
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Voting stats
    votes_required INTEGER, -- NULL = majority of active members
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    total_voters INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'passed', 'failed', 'cancelled', 'expired')),
    is_executed BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    executed_at TIMESTAMPTZ,
    
    -- For objection polls
    parent_poll_id UUID REFERENCES polls(id) ON DELETE SET NULL,
    objection_reason TEXT
);

CREATE INDEX idx_polls_group ON polls(group_id, status, expires_at);
CREATE INDEX idx_polls_creator ON polls(created_by);
CREATE INDEX idx_polls_target ON polls(target_user_id);
CREATE INDEX idx_polls_expires ON polls(expires_at) WHERE status = 'active'; -- can be avoided

-- ========== VOTES TABLE ==========
CREATE TABLE votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    anonymous_identity_id UUID REFERENCES anonymous_identities(id) ON DELETE SET NULL,
    vote_value BOOLEAN NOT NULL, -- TRUE = for, FALSE = against
    voted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(poll_id, user_id),
    UNIQUE(poll_id, anonymous_identity_id)
);

CREATE INDEX idx_votes_poll ON votes(poll_id);
CREATE INDEX idx_votes_user ON votes(user_id);


5. Media & Files

-- ========== MEDIA_UPLOADS TABLE ==========
CREATE TABLE media_uploads (
    media_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    
    -- File info
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    
    -- Storage
    storage_path TEXT NOT NULL,
    storage_bucket VARCHAR(100) DEFAULT 'chat-media',
    
    -- Encryption
    file_key_encrypted TEXT,
    file_key_iv VARCHAR(50),
    
    -- Access
    access_url TEXT,
    thumbnail_url TEXT,
    expires_at TIMESTAMPTZ, -- For temporary URLs
    
    -- Status
    upload_status VARCHAR(20) DEFAULT 'uploading' CHECK (upload_status IN ('uploading', 'completed', 'failed', 'deleted')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_uploads_user ON media_uploads(user_id);
CREATE INDEX idx_media_uploads_message ON media_uploads(message_id);


6. System & Audit

-- ========== AUDIT_LOGS TABLE ==========
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    
    -- Before/after state (JSON)
    old_values JSONB,
    new_values JSONB,
    
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ========== REPORTS TABLE ==========
CREATE TABLE reports (
    report_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reported_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    reported_message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN (
        'spam', 'harassment', 'inappropriate_content', 
        'fake_profile', 'other'
    )),
    
    description TEXT NOT NULL,
    evidence_urls TEXT[],
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_status ON reports(status);

-- ========== SYSTEM_NOTIFICATIONS TABLE ==========
CREATE TABLE system_notifications (
    notifi_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'chat_request', 'group_invite', 'poll_created', 
        'vote_result', 'message', 'system_alert'
    )),
    
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    data JSONB, -- Additional data like chat_id, poll_id, etc.
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON system_notifications(user_id, is_read, created_at DESC);

7. Encryption & Security

-- ========== USER_ENCRYPTION_KEYS TABLE ==========
CREATE TABLE user_encryption_keys (  -- Only public keys stored
    key_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- RSA keys for asymmetric encryption
    public_key TEXT NOT NULL,
    key_version INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_keys_user ON user_encryption_keys(user_id);


-- ========= Chat Session Keys (AES keys per chat) ========
CREATE TABLE chat_session_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    
    -- Single AES key for this chat/group (encrypted for each member)
    aes_key_encrypted TEXT NOT NULL, -- Base64 encoded
    aes_key_iv VARCHAR(50) NOT NULL, -- IV for AES key encryption
    
    -- Who encrypted this key copy
    encrypted_for_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    encrypted_with_key_version INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: Either conversation OR group, not both
    CONSTRAINT chk_chat_or_group CHECK (
        (conversation_id IS NOT NULL AND group_id IS NULL) OR
        (conversation_id IS NULL AND group_id IS NOT NULL)
    ),
    
    UNIQUE(conversation_id, encrypted_for_user_id),
    UNIQUE(group_id, encrypted_for_user_id)
);

-- Indexes
CREATE INDEX idx_chat_keys_conversation ON chat_session_keys(conversation_id);
CREATE INDEX idx_chat_keys_group ON chat_session_keys(group_id);
CREATE INDEX idx_chat_keys_user ON chat_session_keys(encrypted_for_user_id);

-- ============= User Encryption Keys ===========
CREATE TABLE user_encryption_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Only store public key (private key stays on client)
    public_key TEXT NOT NULL, -- RSA public key in PEM format
    
    key_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_keys_user ON user_encryption_keys(user_id);

===================================================================================

Personal Chat Setup:
    -- Step 1: Generate AES key for chat (server)
    const chatAesKey = generateAESKey();

    -- Step 2: For each user, encrypt with their PUBLIC key
    const forUser1 = RSA_encrypt(chatAesKey, user1PublicKey);
    const forUser2 = RSA_encrypt(chatAesKey, user2PublicKey);

    -- Step 3: Store in chat_session_keys
    INSERT INTO chat_session_keys (conversation_id, aes_key_encrypted, encrypted_for_user_id)
    VALUES 
    (chatId, forUser1, userId1),
    (chatId, forUser2, userId2);

    ## Sending Message:
    // Client-side:
    1. Get chatAesKey (decrypt from chat_session_keys using PRIVATE key) - ONCE
    2. Encrypt message with chatAesKey (AES-256-GCM) - FAST
    3. Send {encryptedMessage, iv, authTag}

Group Chat:
    -- Same as personal but for group
    -- One AES key for entire group
    -- Each member gets: RSA_encrypt(groupAesKey, memberPublicKey)

Client-Side Storage:
    // After decrypting chat AES key once, store locally:
    localStorage.setItem(`chatKey_${chatId}`, chatAesKey);
    // Use for all subsequent messages in that chat
    // Clear on logout

======================================================================

## **REDIS DATA STRUCTURES**

### **Session & Auth**
1. **session:{sessionId}** - User session data (TTL: 7 days) ✅ **PRIMARY SESSION STORE**
2. **user_sessions:{userId}** - Set of active session IDs for a user
3. **rate_limit:{userId}:{endpoint}:{minute}** - API rate limiting counters
4. **session_cache:{userId}:{chatId}**: Cached decrypted AES keys (TTL: 1 hour)

### **Real-time & Presence**
5. **online_users** - Set of currently online user IDs
6. **user_socket:{userId}** → socketId - Mapping user to WebSocket connection
7. **socket_user:{socketId}** → userId - Reverse mapping
8. **room:{chatId}** - Set of socket IDs in a chat room
9. **typing:{chatId}:{userId}** - Typing indicators with TTL (5 seconds)

### **Message Queue & Caching**
10. **offline_messages:{userId}** - List of messages for offline users
11. **unread_counts:{userId}:{chatId}** - Counter of unread messages per chat
12. **message_cache:{chatId}:recent** - Cached recent messages (LRU, 50 messages)
13. **user_presence:{userId}** - Last seen timestamp + status

### **Notifications**
14. **notifications:{userId}** - List of pending notifications
15. **notification_count:{userId}** - Unread notification counter

### **Poll & Voting Cache**
16. **poll_live:{pollId}** - Live vote counts for active polls (Hash)
17. **user_voted:{pollId}** - Set of users who already voted

### **Anonymous Identity Cache**
18. **anon_map:{randomString}** → userId - Quick lookup of anonymous IDs
19. **user_anon:{userId}:{targetId}** → randomString - Reverse mapping
20. **anon_cache:{userId}:{chatId}**: Cached anonymous identity for active chats

### **Rate Limiting & Security**
21. **login_attempts:{ip}:{hour}** - Failed login attempts counter (TTL: 1hrs)
22. **email_otp:{email}** - OTP codes with expiry (TTL: 10 minutes)
23. **blocked_ips:{ip}** - Temporarily blocked IPs (TTL: 24 hours)
24. **ws_auth:{socketId}** - WebSocket authentication token (TTL: 30 secs)

### **Encryption Key Cache**
25. **key_cache:{userId}:{chatId}**-Recently decrypted AES keys (TTL:5 mins)
26. **key_version:{chatId}** - Current encryption key version

### **Search & Discovery**
27. **user_search_index** - Searchable user data for quick lookups
28. **group_search_index** - Searchable group data

### **System Health**
29. **ws_connections** - Count of active WebSocket connections
30. **message_throughput:{second}** - Messages per second (TTL: 60 secs)


Session & Auth (String type)
    Key format: session:{sessionId}
    Value: JSON string with user data
    {
    "userId": "uuid",
    "rollNo": "B23XX",
    "createdAt": "timestamp",
    "expiresAt": "timestamp",
    "device": "web/mobile"
    }
    TTL: 7 days

    Key: user_sessions:{userId}
    Value: Set of active session IDs
    Used for: Logout all sessions

    Key: rate_limit:{userId}:{endpoint}:{minute}
    Value: Integer counter
    TTL: 60 seconds
    Used: Rate limiting per minute

    // Key: session_cache:{userId}:{chatId}
    // Type: String (encrypted AES key)
    // TTL: 1 hour
    // Value: {aesKey: "encrypted", keyVersion: 1, lastUsed: timestamp}
    // Used: Cache decrypted chat keys


Real-time & Presence (Sets/Hashes)
    // Key: online_users
    // Type: Set of user IDs
    // Used for: Quick online status check
    // TTL: Persistent (cleaned on disconnect)

    // Key: user_socket:{userId}
    // Type: String (socket.id)
    // Used for: Send message to specific user
    // TTL: Session duration

    // Key: socket_user:{socketId}
    // Type: String (userId)
    // Reverse mapping for disconnect cleanup
    // TTL: Session duration

    // Key: room:{chatId} or room:group:{groupId}
    // Type: Set of socket IDs
    // Used for: Broadcasting to chat room
    // TTL: Session duration

    // Key: typing:{chatId}:{userId}
    // Type: String (timestamp)
    // TTL: 5 seconds
    // Used for: Typing indicators


Message Queue & Caching
    // Key: offline_messages:{userId}
    // Type: List of message JSON
    // Max length: 100 messages
    // Used for: Store messages when user offline

    // Key: unread_counts:{userId}:{chatId}
    // Type: Integer counter
    // Used for: Badge counts

    // Key: message_cache:{chatId}:recent
    // Type: List (LRU capped at 50 messages)
    // Value: JSON of recent messages
    // TTL: 1 hour
    // Used for: Quick load of recent chat

    // Key: user_presence:{userId}
    // Type: Hash
    // Value: {status: "online/away/offline", lastSeen: timestamp}
    // TTL: 30 days

Notifications (Lists/Sorted Sets)
    // Key: notifications:{userId}
    // Type: List of notification JSON
    // Max length: 50
    // Used for: In-app notifications
    // TTL: 7 days -- will this work?

    // Key: notification_count:{userId}
    // Type: Integer
    // TTL: 7 days
    // Used: Unread badge


Poll & Voting Cache
    // Key: poll_live:{pollId}
    // Type: Hash
    // Value: {votesFor: 0, votesAgainst: 0, totalVoters: 0}
    // TTL: 6 hours (poll duration)
    // Used for: Live vote updates

    // Key: user_voted:{pollId}
    // Type: Set of user IDs
    // TTL: 6 hours
    // Used for: Prevent double voting


Anonymous Identity Cache
    // Key: anon_map:{randomString}
    // Type: String (userId)
    // TTL: 30 days
    // Used for: Quick anonymous ID resolution

    // Key: user_anon:{userId}:{targetId}
    // Type: String (randomString)
    // TTL: 30 days
    // Used for: Reverse lookup

    // Key: anon_cache:{userId}:{chatId}
    // Type: String (anonymousIdentityId)
    // TTL: 1 hour
    // Used: Cache active anonymous identity

Encryption Key Cache
    // Key: key_cache:{userId}:{chatId}
    // Type: String (decrypted AES key)
    // TTL: 5 minutes
    // Used: Frequently accessed chat keys

    // Key: key_version:{chatId}
    // Type: Integer
    // TTL: 30 days
    // Used: Current encryption key version


Rate Limiting & Security
    // Key: login_attempts:{ip}:{hour}
    // Type: Integer counter
    // TTL: 1 hour
    // Used for: Brute force protection

    // Key: email_otp:{email}
    // Type: String (OTP code)
    // TTL: 10 minutes
    // Used for: Email verification

    // Key: blocked_ips:{ip}
    // Type: String (block reason)
    // TTL: 24 hours
    // Used for: Temporary IP bans

    // Key: ws_auth:{socketId}
    // Type: String (JSON)
    // TTL: 30 seconds
    // Value: {userId, sessionToken, authenticatedAt}
    // Used: WebSocket authentication


Search & Discovery (Sorted Sets)
    // Key: user_search_index
    // Type: Sorted Set
    // Score: timestamp
    // Member: user:{userId}:{rollNo}:{name}
    // Used for: Quick user search

    // Key: group_search_index
    // Type: Sorted Set
    // Score: member count
    // Member: group:{groupId}:{name}
    // Used for: Group discovery

System Health
    // Key: ws_connections
    // Type: Integer
    // Used for: Monitoring active connections

    // Key: message_throughput:{second}
    // Type: Integer
    // TTL: 60 seconds
    // Used for: Performance monitoring

    -- See if below works or not
    // Key: active_polls
    // Type: Set of poll IDs
    // Used for: Quick poll status check


===========================================================================

DATABASE TRIGGERS & FUNCTIONS

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Repeat for all tables...

-- Function to calculate user year from roll_no
CREATE OR REPLACE FUNCTION calculate_year(roll_no VARCHAR)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE 
        WHEN roll_no LIKE 'B21%' THEN 4
        WHEN roll_no LIKE 'B22%' THEN 3
        WHEN roll_no LIKE 'B23%' THEN 2
        WHEN roll_no LIKE 'B24%' THEN 1
        ELSE 1
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to generate anonymous string
CREATE OR REPLACE FUNCTION generate_anonymous_string()
RETURNS VARCHAR AS $$
DECLARE
    random_str VARCHAR(50);
BEGIN
    random_str := 'anon_' || substring(md5(random()::text) from 1 for 8) || 
                  '_' || floor(extract(epoch from now()))::text;
    RETURN random_str;
END;
$$ LANGUAGE plpgsql;


===========================================================================


1. Row Level Security (RLS): Enable RLS on all tables
2. Storage: Use Supabase Storage for media files
3. Realtime: Use Supabase Realtime for database changes
4. Edge Functions: For OTP sending, notifications

-- Example RLS Policy for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data and public profiles
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id OR privacy_profile_public = TRUE);

-- Users can update only their own data
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);


===========================================================================


-- ============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON chat_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-increment group member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_active = TRUE THEN
        UPDATE groups SET current_member_count = current_member_count + 1
        WHERE group_id = NEW.group_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
        UPDATE groups SET current_member_count = current_member_count - 1
        WHERE group_id = NEW.group_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.is_active = FALSE AND NEW.is_active = TRUE THEN
        UPDATE groups SET current_member_count = current_member_count + 1
        WHERE group_id = NEW.group_id;
    ELSIF TG_OP = 'DELETE' AND OLD.is_active = TRUE THEN
        UPDATE groups SET current_member_count = current_member_count - 1
        WHERE group_id = OLD.group_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_group_count_on_member_change
AFTER INSERT OR UPDATE OR DELETE ON group_members
FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- Auto-update poll vote counts
CREATE OR REPLACE FUNCTION update_poll_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE polls 
        SET total_votes = total_votes + 1,
            votes_in_favor = CASE WHEN NEW.vote_choice = 'in_favor' THEN votes_in_favor + 1 ELSE votes_in_favor END,
            votes_against = CASE WHEN NEW.vote_choice = 'against' THEN votes_against + 1 ELSE votes_against END
        WHERE poll_id = NEW.poll_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE polls 
        SET votes_in_favor = CASE 
                WHEN NEW.vote_choice = 'in_favor' AND OLD.vote_choice = 'against' THEN votes_in_favor + 1
                WHEN NEW.vote_choice = 'against' AND OLD.vote_choice = 'in_favor' THEN votes_in_favor - 1
                ELSE votes_in_favor END,
            votes_against = CASE 
                WHEN NEW.vote_choice = 'against' AND OLD.vote_choice = 'in_favor' THEN votes_against + 1
                WHEN NEW.vote_choice = 'in_favor' AND OLD.vote_choice = 'against' THEN votes_against - 1
                ELSE votes_against END
        WHERE poll_id = NEW.poll_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE polls 
        SET total_votes = total_votes - 1,
            votes_in_favor = CASE WHEN OLD.vote_choice = 'in_favor' THEN votes_in_favor - 1 ELSE votes_in_favor END,
            votes_against = CASE WHEN OLD.vote_choice = 'against' THEN votes_against - 1 ELSE votes_against END
        WHERE poll_id = OLD.poll_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_poll_counts_on_vote_change
AFTER INSERT OR UPDATE OR DELETE ON votes
FOR EACH ROW EXECUTE FUNCTION update_poll_vote_counts();

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View for user profiles (public info only)
CREATE VIEW user_profiles AS
SELECT user_id,roll_no,name,gender,branch,year,dp_url,bio,is_active,created_at
FROM users
WHERE is_verified = TRUE AND is_active = TRUE;

-- View for active group memberships
CREATE VIEW active_group_memberships AS
SELECT  gm.membership_id, gm.group_id, gm.user_id, gm.is_admin, gm.is_anonymous, gm.anonymous_identity_id, gm.joined_at, g.group_name, g.is_public, g.group_dp_url
FROM group_members gm
JOIN groups g ON gm.group_id = g.group_id
WHERE gm.is_active = TRUE AND g.is_active = TRUE;

-- View for pending notifications count
CREATE VIEW user_notification_counts AS
SELECT 
    user_id,
    COUNT(*) FILTER (WHERE is_read = FALSE) as unread_count,
    COUNT(*) as total_count
FROM system_notifications
GROUP BY user_id;


===========================================================================



-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -- ============================================
-- -- TABLE 1: users
-- -- ============================================
-- CREATE TABLE users (
--     user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     roll_number TEXT UNIQUE NOT NULL,
--     user_name TEXT NOT NULL,
--     gender TEXT CHECK (gender IN ('M', 'F', 'O', 'N')) NOT NULL,
--     branch TEXT NOT NULL,
--     password_hash TEXT NOT NULL,
--     dob DATE NOT NULL,
--     dp_url TEXT DEFAULT '/default-avatar.png',
--     is_active BOOLEAN DEFAULT TRUE,
--     bio TEXT,
--     failed_login_attempts INT DEFAULT 0,
--     account_locked_until TIMESTAMP,
--     created_at TIMESTAMP DEFAULT NOW(),
--     updated_at TIMESTAMP DEFAULT NOW(),
--     last_seen_at TIMESTAMP DEFAULT NOW(),
--     deleted_at TIMESTAMP
-- );


-- CREATE TABLE otp_verifications (
--     otp_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
--     otp_hash TEXT NOT NULL,
--     purpose TEXT NOT NULL CHECK (purpose IN ('signup', 'password_reset')),
--     attempts INT DEFAULT 0,
--     max_attempts INT DEFAULT 3,
--     expires_at TIMESTAMP NOT NULL,
--     created_at TIMESTAMP DEFAULT NOW(),
--     used_at TIMESTAMP
-- );

-- -- Index for fast cleanup
-- CREATE INDEX idx_otp_expires ON otp_verifications(expires_at);


-- CREATE TABLE refresh_tokens (
--     token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
--     token_hash TEXT NOT NULL,
--     family_id UUID NOT NULL,
--     expires_at TIMESTAMP NOT NULL,
--     revoked BOOLEAN DEFAULT FALSE,
--     created_at TIMESTAMP DEFAULT NOW()
-- );

-- -- Index for user lookups
-- CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);


-- CREATE TABLE auth_audit_logs (
--     log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     user_id UUID REFERENCES users(user_id),
--     roll_number TEXT,
--     event_type TEXT NOT NULL CHECK (event_type IN (
--         'login_success', 
--         'login_failed', 
--         'account_locked', 
--         'password_reset_request',
--         'password_reset_success'
--     )),
--     ip_address INET,
--     user_agent TEXT,
--     created_at TIMESTAMP DEFAULT NOW()
-- );


-- -- ============================================
-- -- TABLE 2: user_keys
-- -- ============================================
-- CREATE TABLE user_keys (
--   user_id UUID PRIMARY KEY,
--   public_key TEXT NOT NULL,
--   private_key_encrypted TEXT NOT NULL,
--   key_salt TEXT NOT NULL,
--   key_algorithm VARCHAR(50) NOT NULL DEFAULT 'RSA-2048',
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   last_rotated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
--   FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
-- );

-- -- ============================================
-- -- TABLE 3: devices
-- -- ============================================
-- CREATE TABLE devices (
--   device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID NOT NULL,
--   device_hash TEXT NOT NULL,
--   device_name VARCHAR(100),
--   device_public_key TEXT,
--   last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
--   FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
--   UNIQUE(user_id, device_hash)
-- );

-- CREATE INDEX idx_devices_user_id ON devices (user_id);
-- CREATE INDEX idx_devices_last_login_at ON devices (last_login_at DESC);

-- -- ============================================
-- -- TABLE 4: conversations
-- -- ============================================
-- CREATE TABLE conversations (
--   conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user1_id UUID NOT NULL,
--   user2_id UUID NOT NULL,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
--   FOREIGN KEY (user1_id) REFERENCES users(user_id) ON DELETE CASCADE,
--   FOREIGN KEY (user2_id) REFERENCES users(user_id) ON DELETE CASCADE,
  
--   UNIQUE(user1_id, user2_id),
--   CHECK (user1_id <> user2_id)
-- );

-- CREATE INDEX idx_conversations_user1 ON conversations (user1_id);
-- CREATE INDEX idx_conversations_user2 ON conversations (user2_id);
-- CREATE INDEX idx_conversations_last_message_at ON conversations (last_message_at DESC);

-- -- ============================================
-- -- TABLE 5: groups
-- -- ============================================
-- CREATE TABLE groups (
--   group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name VARCHAR(100) NOT NULL,
--   admin_id UUID NOT NULL,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   description TEXT,
--   is_public BOOLEAN NOT NULL DEFAULT TRUE,
  
--   FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE
-- );

-- CREATE INDEX idx_groups_admin ON groups (admin_id);

-- -- ============================================
-- -- TABLE 6: group_members
-- -- ============================================
-- CREATE TABLE group_members (
--   group_id UUID NOT NULL,
--   user_id UUID NOT NULL,
--   joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  
--   PRIMARY KEY (group_id, user_id),
--   FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
--   FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
-- );

-- CREATE INDEX idx_group_members_user ON group_members (user_id);
-- CREATE INDEX idx_group_members_group ON group_members (group_id);

-- -- ============================================
-- -- TABLE 7: session_keys
-- -- ============================================
-- CREATE TABLE session_keys (
--   session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   conversation_id UUID,
--   group_id UUID,
--   user_id UUID NOT NULL,
--   session_key_encrypted TEXT NOT NULL,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  
--   FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
--   FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
--   FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  
--   CHECK (
--     (conversation_id IS NOT NULL AND group_id IS NULL) OR
--     (conversation_id IS NULL AND group_id IS NOT NULL)
--   )
-- );

-- -- Partial unique indexes for NULL handling
-- CREATE UNIQUE INDEX idx_unique_conversation_user ON session_keys (conversation_id, user_id) 
--   WHERE conversation_id IS NOT NULL;

-- CREATE UNIQUE INDEX idx_unique_group_user ON session_keys (group_id, user_id) 
--   WHERE group_id IS NOT NULL;

-- CREATE INDEX idx_session_keys_conversation ON session_keys (conversation_id);
-- CREATE INDEX idx_session_keys_group ON session_keys (group_id);
-- CREATE INDEX idx_session_keys_user ON session_keys (user_id);

-- -- ============================================
-- -- TABLE 8: messages
-- -- ============================================
-- CREATE TABLE messages (
--   message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   conversation_id UUID,
--   group_id UUID,
--   sender_id UUID NOT NULL,
--   content_encrypted TEXT NOT NULL,
--   iv TEXT NOT NULL,
--   hmac TEXT NOT NULL,
--   message_type VARCHAR(20) NOT NULL DEFAULT 'text' 
--     CHECK (message_type IN ('text', 'image', 'file', 'video', 'audio')),
--   media_url_encrypted TEXT,
--   status VARCHAR(20) NOT NULL DEFAULT 'sent' 
--     CHECK (status IN ('sent', 'delivered', 'read')),
--   timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   edited_at TIMESTAMPTZ,
  
--   FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
--   FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
--   FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE,
  
--   CHECK (
--     (conversation_id IS NOT NULL AND group_id IS NULL) OR
--     (conversation_id IS NULL AND group_id IS NOT NULL)
--   )
-- );

-- CREATE INDEX idx_messages_conversation ON messages (conversation_id, server_timestamp DESC);
-- CREATE INDEX idx_messages_group ON messages (group_id, server_timestamp DESC);
-- CREATE INDEX idx_messages_sender ON messages (sender_id);
-- CREATE INDEX idx_messages_status ON messages (status);

-- -- ============================================
-- -- TABLE 9: message_status
-- -- ============================================
-- CREATE TABLE message_status (
--   message_id UUID NOT NULL,
--   user_id UUID NOT NULL,
--   status VARCHAR(20) NOT NULL DEFAULT 'sent' 
--     CHECK (status IN ('sent', 'delivered', 'read')),
--   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
--   PRIMARY KEY (message_id, user_id),
--   FOREIGN KEY (message_id) REFERENCES messages(message_id) ON DELETE CASCADE,
--   FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
-- );

-- CREATE INDEX idx_message_status_user ON message_status (user_id, updated_at DESC);

-- -- ============================================
-- -- TABLE 10: group_message_read
-- -- ============================================
-- CREATE TABLE group_message_read (
--   message_id UUID NOT NULL,
--   user_id UUID NOT NULL,
--   read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
--   PRIMARY KEY (message_id, user_id),
--   FOREIGN KEY (message_id) REFERENCES messages(message_id) ON DELETE CASCADE,
--   FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
-- );

-- CREATE INDEX idx_group_message_read_user ON group_message_read (user_id);
-- CREATE INDEX idx_group_message_read_message ON group_message_read (message_id);

-- -- ============================================
-- -- COMPREHENSIVE SAMPLE DATA
-- -- ============================================

-- -- -- Insert 8 sample users
-- -- INSERT INTO users (roll_number, user_name, gender, branch, password_hash, password_salt, dob, dp_url, is_online) VALUES
-- -- ('2024001', 'Alice Johnson', 'Female', 'CSE', '$2a$10$N9qo8uLOickgx2ZMRZoMye', 'salt_001', '2000-05-15', 'https://example.com/alice.jpg', TRUE),
-- -- ('2024002', 'Bob Smith', 'Male', 'ECE', '$2a$10$B6Z5F3pQ9rRk2M7N1VXoYt', 'salt_002', '2001-02-20', 'https://example.com/bob.jpg', FALSE),
-- -- ('2024003', 'Charlie Brown', 'Male', 'CSE', '$2a$10$C7M6N8oLpQrS2T1U9V0WXy', 'salt_003', '2000-11-30', 'https://example.com/charlie.jpg', TRUE),
-- -- ('2024004', 'Diana Prince', 'Female', 'EEE', '$2a$10$D8N9M0pLqOrR3T2V1W2X3y', 'salt_004', '2001-07-10', 'https://example.com/diana.jpg', TRUE),
-- -- ('2024005', 'Ethan Hunt', 'Male', 'ME', '$2a$10$E9O8N1pMqPrS4T3W2X3Y4z', 'salt_005', '2000-09-25', 'https://example.com/ethan.jpg', FALSE),
-- -- ('2024006', 'Fiona Gallagher', 'Female', 'CSE', '$2a$10$F0P9O2qNrQtT5U4X3Y4Z5a', 'salt_006', '2001-04-12', 'https://example.com/fiona.jpg', TRUE),
-- -- ('2024007', 'George Miller', 'Male', 'ECE', '$2a$10$G1Q0P3rOsRuU6V5Y4Z5A6b', 'salt_007', '2000-08-18', 'https://example.com/george.jpg', FALSE),
-- -- ('2024008', 'Hannah Baker', 'Female', 'EEE', '$2a$10$H2R1Q4sPtSvV7W6Z5A6B7c', 'salt_008', '2001-01-05', 'https://example.com/hannah.jpg', TRUE);

-- -- -- Insert user keys for all users
-- -- INSERT INTO user_keys (user_id, public_key, private_key_encrypted, key_salt) VALUES
-- -- ((SELECT user_id FROM users WHERE roll_number = '2024001'), '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFA...AlicePubKey...\n-----END PUBLIC KEY-----', 'U2FsdGVkX1/...EncryptedAlicePrivate...', 'key_salt_a1'),
-- -- ((SELECT user_id FROM users WHERE roll_number = '2024002'), '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFA...BobPubKey...\n-----END PUBLIC KEY-----', 'U2FsdGVkX1/...EncryptedBobPrivate...', 'key_salt_b2'),
-- -- ((SELECT user_id FROM users WHERE roll_number = '2024003'), '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFA...CharliePubKey...\n-----END PUBLIC KEY-----', 'U2FsdGVkX1/...EncryptedCharliePrivate...', 'key_salt_c3'),
-- -- ((SELECT user_id FROM users WHERE roll_number = '2024004'), '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFA...DianaPubKey...\n-----END PUBLIC KEY-----', 'U2FsdGVkX1/...EncryptedDianaPrivate...', 'key_salt_d4'),
-- -- ((SELECT user_id FROM users WHERE roll_number = '2024005'), '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFA...EthanPubKey...\n-----END PUBLIC KEY-----', 'U2FsdGVkX1/...EncryptedEthanPrivate...', 'key_salt_e5'),
-- -- ((SELECT user_id FROM users WHERE roll_number = '2024006'), '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFA...FionaPubKey...\n-----END PUBLIC KEY-----', 'U2FsdGVkX1/...EncryptedFionaPrivate...', 'key_salt_f6'),
-- -- ((SELECT user_id FROM users WHERE roll_number = '2024007'), '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFA...GeorgePubKey...\n-----END PUBLIC KEY-----', 'U2FsdGVkX1/...EncryptedGeorgePrivate...', 'key_salt_g7'),
-- -- ((SELECT user_id FROM users WHERE roll_number = '2024008'), '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFA...HannahPubKey...\n-----END PUBLIC KEY-----', 'U2FsdGVkX1/...EncryptedHannahPrivate...', 'key_salt_h8');

-- -- -- Insert devices for users
-- -- INSERT INTO devices (user_id, device_hash, device_name, device_public_key) VALUES
-- -- ((SELECT user_id FROM users WHERE roll_number = '2024001'), 'iphone_123456', 'iPhone 15', '-----BEGIN DEVICE KEY-----\n...AliceDevice1...\n-----END DEVICE KEY-----'),
-- -- ((SELECT user_id FROM users WHERE roll_number = '2024001'), 'macbook_abcdef', 'MacBook Pro', '-----BEGIN DEVICE KEY-----\n...AliceDevice2...\n-----END DEVICE KEY-----'),
-- -- ((SELECT user_id FROM users WHERE roll_number = '2024002'), 'android_789012', 'Samsung Galaxy', '-----BEGIN DEVICE KEY-----\n...BobDevice1...\n-----END DEVICE KEY-----'),
-- -- ((SELECT user_id FROM users WHERE roll_number = '2024003'), 'windows_pc_xyz', 'Windows Laptop', '-----BEGIN DEVICE KEY-----\n...CharlieDevice1...\n-----END DEVICE KEY-----'),
-- -- ((SELECT user_id FROM users WHERE roll_number = '2024004'), 'iphone_345678', 'iPhone 14', '-----BEGIN DEVICE KEY-----\n...DianaDevice1...\n-----END DEVICE KEY-----');

-- -- -- Create conversations between users
-- -- INSERT INTO conversations (user1_id, user2_id) VALUES
-- -- ((SELECT user_id FROM users WHERE roll_number = '2024001'), (SELECT user_id FROM users WHERE roll_number = '2024002')),
-- -- ((SELECT user_id FROM users WHERE roll_number = '2024001'), (SELECT user_id FROM users WHERE roll_number = '2024003')),
-- -- ((SELECT user_id FROM users WHERE roll_number = '2024002'), (SELECT user_id FROM users WHERE roll_number = '2024004')),
-- -- ((SELECT user_id FROM users WHERE roll_number = '2024003'), (SELECT user_id FROM users WHERE roll_number = '2024005')),
-- -- ((SELECT user_id FROM users WHERE roll_number = '2024006'), (SELECT user_id FROM users WHERE roll_number = '2024007'));

-- -- -- Create groups
-- -- INSERT INTO groups (name, admin_id, description, is_public) VALUES
-- -- ('Project Team Alpha', (SELECT user_id FROM users WHERE roll_number = '2024001'), 'Final year project group', TRUE),
-- -- ('CSE Study Group', (SELECT user_id FROM users WHERE roll_number = '2024003'), 'CSE students study materials', TRUE),
-- -- ('Friends Circle', (SELECT user_id FROM users WHERE roll_number = '2024002'), 'Close friends group', FALSE),
-- -- ('College Events', (SELECT user_id FROM users WHERE roll_number = '2024004'), 'College event announcements', TRUE);

-- -- -- Add members to groups
-- -- INSERT INTO group_members (group_id, user_id, role) VALUES
-- -- -- Project Team Alpha
-- -- ((SELECT group_id FROM groups WHERE name = 'Project Team Alpha'), (SELECT user_id FROM users WHERE roll_number = '2024001'), 'admin'),
-- -- ((SELECT group_id FROM groups WHERE name = 'Project Team Alpha'), (SELECT user_id FROM users WHERE roll_number = '2024002'), 'member'),
-- -- ((SELECT group_id FROM groups WHERE name = 'Project Team Alpha'), (SELECT user_id FROM users WHERE roll_number = '2024003'), 'member'),
-- -- ((SELECT group_id FROM groups WHERE name = 'Project Team Alpha'), (SELECT user_id FROM users WHERE roll_number = '2024006'), 'member'),

-- -- -- CSE Study Group
-- -- ((SELECT group_id FROM groups WHERE name = 'CSE Study Group'), (SELECT user_id FROM users WHERE roll_number = '2024001'), 'member'),
-- -- ((SELECT group_id FROM groups WHERE name = 'CSE Study Group'), (SELECT user_id FROM users WHERE roll_number = '2024003'), 'admin'),
-- -- ((SELECT group_id FROM groups WHERE name = 'CSE Study Group'), (SELECT user_id FROM users WHERE roll_number = '2024006'), 'member'),

-- -- -- Friends Circle
-- -- ((SELECT group_id FROM groups WHERE name = 'Friends Circle'), (SELECT user_id FROM users WHERE roll_number = '2024002'), 'admin'),
-- -- ((SELECT group_id FROM groups WHERE name = 'Friends Circle'), (SELECT user_id FROM users WHERE roll_number = '2024004'), 'member'),
-- -- ((SELECT group_id FROM groups WHERE name = 'Friends Circle'), (SELECT user_id FROM users WHERE roll_number = '2024005'), 'member'),

-- -- -- College Events
-- -- ((SELECT group_id FROM groups WHERE name = 'College Events'), (SELECT user_id FROM users WHERE roll_number = '2024004'), 'admin'),
-- -- ((SELECT group_id FROM groups WHERE name = 'College Events'), (SELECT user_id FROM users WHERE roll_number = '2024001'), 'member'),
-- -- ((SELECT group_id FROM groups WHERE name = 'College Events'), (SELECT user_id FROM users WHERE roll_number = '2024002'), 'member'),
-- -- ((SELECT group_id FROM groups WHERE name = 'College Events'), (SELECT user_id FROM users WHERE roll_number = '2024003'), 'member'),
-- -- ((SELECT group_id FROM groups WHERE name = 'College Events'), (SELECT user_id FROM users WHERE roll_number = '2024006'), 'member'),
-- -- ((SELECT group_id FROM groups WHERE name = 'College Events'), (SELECT user_id FROM users WHERE roll_number = '2024007'), 'member'),
-- -- ((SELECT group_id FROM groups WHERE name = 'College Events'), (SELECT user_id FROM users WHERE roll_number = '2024008'), 'member');

-- -- -- Create session keys for conversations
-- -- INSERT INTO session_keys (conversation_id, user_id, session_key_encrypted, expires_at) VALUES
-- -- -- Alice-Bob conversation keys
-- -- ((SELECT conversation_id FROM conversations WHERE user1_id = (SELECT user_id FROM users WHERE roll_number = '2024001') LIMIT 1), 
-- --  (SELECT user_id FROM users WHERE roll_number = '2024001'), 'U2FsdGVkX1/...AliceSessionKey1...', NOW() + INTERVAL '60 days'),
-- -- ((SELECT conversation_id FROM conversations WHERE user1_id = (SELECT user_id FROM users WHERE roll_number = '2024001') LIMIT 1), 
-- --  (SELECT user_id FROM users WHERE roll_number = '2024002'), 'U2FsdGVkX1/...BobSessionKey1...', NOW() + INTERVAL '60 days'),

-- -- -- Alice-Charlie conversation keys
-- -- ((SELECT conversation_id FROM conversations WHERE user1_id = (SELECT user_id FROM users WHERE roll_number = '2024001') AND user2_id = (SELECT user_id FROM users WHERE roll_number = '2024003')), 
-- --  (SELECT user_id FROM users WHERE roll_number = '2024001'), 'U2FsdGVkX1/...AliceSessionKey2...', NOW() + INTERVAL '60 days'),
-- -- ((SELECT conversation_id FROM conversations WHERE user1_id = (SELECT user_id FROM users WHERE roll_number = '2024001') AND user2_id = (SELECT user_id FROM users WHERE roll_number = '2024003')), 
-- --  (SELECT user_id FROM users WHERE roll_number = '2024003'), 'U2FsdGVkX1/...CharlieSessionKey1...', NOW() + INTERVAL '60 days');

-- -- -- Create session keys for groups
-- -- INSERT INTO session_keys (group_id, user_id, session_key_encrypted) VALUES
-- -- -- Project Team Alpha group keys
-- -- ((SELECT group_id FROM groups WHERE name = 'Project Team Alpha'), (SELECT user_id FROM users WHERE roll_number = '2024001'), 'U2FsdGVkX1/...AliceGroupKey1...'),
-- -- ((SELECT group_id FROM groups WHERE name = 'Project Team Alpha'), (SELECT user_id FROM users WHERE roll_number = '2024002'), 'U2FsdGVkX1/...BobGroupKey1...'),
-- -- ((SELECT group_id FROM groups WHERE name = 'Project Team Alpha'), (SELECT user_id FROM users WHERE roll_number = '2024003'), 'U2FsdGVkX1/...CharlieGroupKey1...'),

-- -- -- CSE Study Group keys
-- -- ((SELECT group_id FROM groups WHERE name = 'CSE Study Group'), (SELECT user_id FROM users WHERE roll_number = '2024001'), 'U2FsdGVkX1/...AliceGroupKey2...'),
-- -- ((SELECT group_id FROM groups WHERE name = 'CSE Study Group'), (SELECT user_id FROM users WHERE roll_number = '2024003'), 'U2FsdGVkX1/...CharlieGroupKey2...');

-- -- -- Insert 1:1 chat messages
-- -- INSERT INTO messages (conversation_id, sender_id, content_encrypted, iv, hmac, message_type, status) VALUES
-- -- -- Alice to Bob
-- -- ((SELECT conversation_id FROM conversations WHERE user1_id = (SELECT user_id FROM users WHERE roll_number = '2024001') LIMIT 1),
-- --  (SELECT user_id FROM users WHERE roll_number = '2024001'),
-- --  'U2FsdGVkX1/...Hello Bob! How are you?...', 'iv_abcdef123456', 'hmac_001', 'text', 'read'),

-- -- -- Bob to Alice
-- -- ((SELECT conversation_id FROM conversations WHERE user1_id = (SELECT user_id FROM users WHERE roll_number = '2024001') LIMIT 1),
-- --  (SELECT user_id FROM users WHERE roll_number = '2024002'),
-- --  'U2FsdGVkX1/...Hi Alice! Im good, working on project...', 'iv_ghijk789012', 'hmac_002', 'text', 'read'),

-- -- -- Alice to Charlie
-- -- ((SELECT conversation_id FROM conversations WHERE user1_id = (SELECT user_id FROM users WHERE roll_number = '2024001') AND user2_id = (SELECT user_id FROM users WHERE roll_number = '2024003')),
-- --  (SELECT user_id FROM users WHERE roll_number = '2024001'),
-- --  'U2FsdGVkX1/...Charlie, are we meeting tomorrow?...', 'iv_lmnop345678', 'hmac_003', 'text', 'delivered'),

-- -- -- Image message from Alice to Bob
-- -- ((SELECT conversation_id FROM conversations WHERE user1_id = (SELECT user_id FROM users WHERE roll_number = '2024001') LIMIT 1),
-- --  (SELECT user_id FROM users WHERE roll_number = '2024001'),
-- --  'U2FsdGVkX1/...encrypted_image_data...', 'iv_qrstu901234', 'hmac_004', 'image', 'sent');

-- -- -- Insert group messages
-- -- INSERT INTO messages (group_id, sender_id, content_encrypted, iv, hmac, message_type, status) VALUES
-- -- -- Project Team Alpha messages
-- -- ((SELECT group_id FROM groups WHERE name = 'Project Team Alpha'),
-- --  (SELECT user_id FROM users WHERE roll_number = '2024001'),
-- --  'U2FsdGVkX1/...Hello team! Lets start the meeting at 3 PM...', 'iv_grp_001', 'hmac_grp_001', 'text', 'delivered'),

-- -- ((SELECT group_id FROM groups WHERE name = 'Project Team Alpha'),
-- --  (SELECT user_id FROM users WHERE roll_number = '2024002'),
-- --  'U2FsdGVkX1/...Ive uploaded the requirements document...', 'iv_grp_002', 'hmac_grp_002', 'file', 'sent'),

-- -- ((SELECT group_id FROM groups WHERE name = 'Project Team Alpha'),
-- --  (SELECT user_id FROM users WHERE roll_number = '2024003'),
-- --  'U2FsdGVkX1/...I found a bug in the authentication module...', 'iv_grp_003', 'hmac_grp_003', 'text', 'sent'),

-- -- -- CSE Study Group messages
-- -- ((SELECT group_id FROM groups WHERE name = 'CSE Study Group'),
-- --  (SELECT user_id FROM users WHERE roll_number = '2024003'),
-- --  'U2FsdGVkX1/...DBMS exam notes are available now...', 'iv_study_001', 'hmac_study_001', 'text', 'delivered'),

-- -- -- College Events announcement
-- -- ((SELECT group_id FROM groups WHERE name = 'College Events'),
-- --  (SELECT user_id FROM users WHERE roll_number = '2024004'),
-- --  'U2FsdGVkX1/...Annual Tech Fest starts next Monday!...', 'iv_event_001', 'hmac_event_001', 'text', 'sent');

-- -- -- Insert message status (read receipts for 1:1 messages)
-- -- INSERT INTO message_status (message_id, user_id, status) VALUES
-- -- -- Bob read Alice's first message
-- -- ((SELECT message_id FROM messages WHERE content_encrypted LIKE '%Hello Bob%'), 
-- --  (SELECT user_id FROM users WHERE roll_number = '2024002'), 'read'),

-- -- -- Alice read Bob's reply
-- -- ((SELECT message_id FROM messages WHERE content_encrypted LIKE '%Hi Alice%'), 
-- --  (SELECT user_id FROM users WHERE roll_number = '2024001'), 'read');

-- -- -- Insert group message read status
-- -- INSERT INTO group_message_read (message_id, user_id) VALUES
-- -- -- Alice read first group message
-- -- ((SELECT message_id FROM messages WHERE content_encrypted LIKE '%Hello team%'), 
-- --  (SELECT user_id FROM users WHERE roll_number = '2024001')),

-- -- -- Bob read first group message
-- -- ((SELECT message_id FROM messages WHERE content_encrypted LIKE '%Hello team%'), 
-- --  (SELECT user_id FROM users WHERE roll_number = '2024002')),

-- -- -- Charlie read DBMS notes message
-- -- ((SELECT message_id FROM messages WHERE content_encrypted LIKE '%DBMS exam%'), 
-- --  (SELECT user_id FROM users WHERE roll_number = '2024003'));

-- -- -- Update conversation last_message_at timestamps
-- -- UPDATE conversations c SET last_message_at = (
-- --   SELECT MAX(timestamp) 
-- --   FROM messages m 
-- --   WHERE m.conversation_id = c.conversation_id
-- -- ) WHERE EXISTS (SELECT 1 FROM messages WHERE conversation_id = c.conversation_id);

-- -- ============================================
-- -- SAMPLE QUERIES TO VERIFY DATA
-- -- ============================================

-- -- -- Query 1: Show all users with online status
-- -- SELECT roll_number, user_name, branch, is_online, last_seen_at 
-- -- FROM users 
-- -- ORDER BY is_online DESC, user_name;

-- -- -- Query 2: Show conversations with participant names
-- -- SELECT 
-- --   c.conversation_id,
-- --   u1.user_name as user1_name,
-- --   u2.user_name as user2_name,
-- --   c.created_at,
-- --   c.last_message_at
-- -- FROM conversations c
-- -- JOIN users u1 ON c.user1_id = u1.user_id
-- -- JOIN users u2 ON c.user2_id = u2.user_id
-- -- ORDER BY c.last_message_at DESC;

-- -- -- Query 3: Show groups with member counts
-- -- SELECT 
-- --   g.name,
-- --   g.description,
-- --   u.user_name as admin_name,
-- --   COUNT(gm.user_id) as member_count,
-- --   g.created_at
-- -- FROM groups g
-- -- JOIN users u ON g.admin_id = u.user_id
-- -- LEFT JOIN group_members gm ON g.group_id = gm.group_id
-- -- GROUP BY g.group_id, u.user_name
-- -- ORDER BY member_count DESC;

-- -- -- Query 4: Show messages in Alice-Bob conversation
-- -- SELECT 
-- --   m.message_id,
-- --   u.user_name as sender,
-- --   m.message_type,
-- --   m.status,
-- --   m.timestamp
-- -- FROM messages m
-- -- JOIN users u ON m.sender_id = u.user_id
-- -- WHERE m.conversation_id = (
-- --   SELECT conversation_id 
-- --   FROM conversations 
-- --   WHERE user1_id = (SELECT user_id FROM users WHERE roll_number = '2024001')
-- --     AND user2_id = (SELECT user_id FROM users WHERE roll_number = '2024002')
-- -- )
-- -- ORDER BY m.timestamp;

-- -- -- Query 5: Show session keys for each user
-- -- SELECT 
-- --   u.user_name,
-- --   COUNT(sk.session_id) as total_session_keys,
-- --   COUNT(sk.conversation_id) as conversation_keys,
-- --   COUNT(sk.group_id) as group_keys
-- -- FROM users u
-- -- LEFT JOIN session_keys sk ON u.user_id = sk.user_id
-- -- GROUP BY u.user_id, u.user_name
-- -- ORDER BY total_session_keys DESC;


===========================================================================


## **1. SESSION & AUTH**

### 1.1 Primary Session Store
```redis
Key: session:{sessionId}
Type: Hash
TTL: 7 days (604800 seconds)
Fields:
  - userId: UUID
  - rollNo: string
  - email: string
  - createdAt: timestamp
  - lastActivity: timestamp
  - ipAddress: string
  - userAgent: string

Example:
HSET session:abc123 userId "uuid-123" rollNo "b23001" email "user@example.com"
EXPIRE session:abc123 604800
```

### 1.2 User Sessions Mapping
```redis
Key: user_sessions:{userId}
Type: Set
TTL: None (managed manually)
Members: sessionId1, sessionId2, ...

Purpose: Track all active sessions for a user (for logout all devices)

Example:
SADD user_sessions:uuid-123 "session-abc" "session-xyz"
```

### 1.3 API Rate Limiting
```redis
Key: rate_limit:{userId}:{endpoint}:{minute}
Type: String (counter)
TTL: 60 seconds
Value: request count

Purpose: Prevent API abuse (e.g., max 100 requests/minute)

Example:
INCR rate_limit:uuid-123:/api/messages:1706342400
EXPIRE rate_limit:uuid-123:/api/messages:1706342400 60
```

### 1.4 Session Encryption Key Cache
```redis
Key: session_cache:{userId}:{chatId}
Type: String
TTL: 1 hour (3600 seconds)
Value: Decrypted AES key (base64)

Purpose: Cache decrypted chat keys to avoid repeated decryption

Example:
SET session_cache:uuid-123:chat-456 "base64-encrypted-key"
EXPIRE session_cache:uuid-123:chat-456 3600
```

---

## **2. REAL-TIME & PRESENCE**

### 2.1 Online Users
```redis
Key: online_users
Type: Set
TTL: None
Members: userId1, userId2, ...

Purpose: Track currently online users

Example:
SADD online_users "uuid-123" "uuid-456"
SREM online_users "uuid-789"
```

### 2.2 User to Socket Mapping
```redis
Key: user_socket:{userId}
Type: String
TTL: None (removed on disconnect)
Value: socketId

Purpose: Find socket connection for a user

Example:
SET user_socket:uuid-123 "socket-abc-xyz"
```

### 2.3 Socket to User Mapping (Reverse)
```redis
Key: socket_user:{socketId}
Type: String
TTL: None
Value: userId

Purpose: Find user from socket connection

Example:
SET socket_user:socket-abc-xyz "uuid-123"
```

### 2.4 Chat Room Members
```redis
Key: room:{chatId}
Type: Set
TTL: None
Members: socketId1, socketId2, ...

Purpose: Track all socket connections in a chat/group room

Example:
SADD room:chat-456 "socket-abc" "socket-xyz"
```

### 2.5 Typing Indicators
```redis
Key: typing:{chatId}:{userId}
Type: String
TTL: 5 seconds
Value: timestamp

Purpose: Show "User is typing..." indicator

Example:
SET typing:chat-456:uuid-123 "1706342400"
EXPIRE typing:chat-456:uuid-123 5
```

---

## **3. MESSAGE QUEUE & CACHING**

### 3.1 Offline Messages Queue
```redis
Key: offline_messages:{userId}
Type: List
TTL: None (cleared when user comes online)
Value: JSON serialized message objects

Purpose: Store messages for offline users

Example:
LPUSH offline_messages:uuid-123 '{"messageId":"msg-1","senderId":"uuid-456","content":"encrypted..."}'
LRANGE offline_messages:uuid-123 0 -1
LTRIM offline_messages:uuid-123 0 0  // Keep only latest
```

### 3.2 Unread Message Counters
```redis
Key: unread_counts:{userId}:{chatId}
Type: String (counter)
TTL: None
Value: unread message count

Purpose: Track unread messages per chat

Example:
INCR unread_counts:uuid-123:chat-456
SET unread_counts:uuid-123:chat-456 0  // Mark as read
```

### 3.3 Recent Messages Cache
```redis
Key: message_cache:{chatId}:recent
Type: List (LRU - max 50 messages)
TTL: None
Value: JSON serialized message objects

Purpose: Cache recent messages to reduce DB queries

Example:
LPUSH message_cache:chat-456:recent '{"messageId":"msg-1","content":"..."}'
LTRIM message_cache:chat-456:recent 0 49  // Keep only 50
LRANGE message_cache:chat-456:recent 0 19  // Get 20 recent
```

### 3.4 User Presence Status
```redis
Key: user_presence:{userId}
Type: Hash
TTL: None
Fields:
  - status: online|offline|away
  - lastSeen: timestamp
  - deviceType: web|mobile

Example:
HSET user_presence:uuid-123 status "online" lastSeen "1706342400" deviceType "web"
```

---

## **4. NOTIFICATIONS**

### 4.1 Pending Notifications
```redis
Key: notifications:{userId}
Type: List
TTL: None
Value: JSON notification objects

Purpose: Store pending notifications for user

Example:
LPUSH notifications:uuid-123 '{"type":"chat_request","from":"uuid-456","timestamp":"..."}'
LRANGE notifications:uuid-123 0 9  // Get 10 latest
```

### 4.2 Unread Notification Counter
```redis
Key: notification_count:{userId}
Type: String (counter)
TTL: None
Value: unread count

Example:
INCR notification_count:uuid-123
SET notification_count:uuid-123 0  // Mark all as read
```

---

## **5. POLL & VOTING CACHE**

### 5.1 Live Poll Vote Counts
```redis
Key: poll_live:{pollId}
Type: Hash
TTL: 6 hours (21600 seconds)
Fields:
  - totalVotes: number
  - votesInFavor: number
  - votesAgainst: number
  - expiresAt: timestamp

Purpose: Real-time vote counting without DB hits

Example:
HSET poll_live:poll-123 totalVotes 10 votesInFavor 7 votesAgainst 3
HINCRBY poll_live:poll-123 votesInFavor 1
EXPIRE poll_live:poll-123 21600
```

### 5.2 Poll Voter Tracking
```redis
Key: user_voted:{pollId}
Type: Set
TTL: 6 hours (21600 seconds)
Members: userId1, userId2, ...

Purpose: Prevent duplicate voting, track who voted

Example:
SADD user_voted:poll-123 "uuid-456"
SISMEMBER user_voted:poll-123 "uuid-456"  // Check if voted
```

---

## **6. ANONYMOUS IDENTITY CACHE**

### 6.1 Anonymous String to User Mapping
```redis
Key: anon_map:{randomString}
Type: String
TTL: None (persistent)
Value: userId

Purpose: Quick lookup of who owns an anonymous identity

Example:
SET anon_map:anon_xyz789 "uuid-123"
GET anon_map:anon_xyz789
```

### 6.2 User to Anonymous String Mapping
```redis
Key: user_anon:{userId}:{targetId}
Type: String
TTL: None (persistent)
Value: randomString

Purpose: Find anonymous identity for user-target pair

Example:
SET user_anon:uuid-123:uuid-456 "anon_xyz789"
GET user_anon:uuid-123:uuid-456
```

### 6.3 Active Anonymous Chat Cache
```redis
Key: anon_cache:{userId}:{chatId}
Type: Hash
TTL: None
Fields:
  - randomString: string
  - gender: string
  - year: number
  - isRevealed: boolean

Purpose: Cache anonymous identity for active chats

Example:
HSET anon_cache:uuid-123:chat-456 randomString "anon_xyz" gender "Male" year 2
```

---

## **7. RATE LIMITING & SECURITY**

### 7.1 Failed Login Attempts
```redis
Key: login_attempts:{ip}:{hour}
Type: String (counter)
TTL: 1 hour (3600 seconds)
Value: attempt count

Purpose: Block IPs after 5 failed login attempts

Example:
INCR login_attempts:192.168.1.1:1706342400
EXPIRE login_attempts:192.168.1.1:1706342400 3600
GET login_attempts:192.168.1.1:1706342400
```

### 7.2 Email OTP Storage
```redis
Key: email_otp:{email}
Type: Hash
TTL: 10 minutes (600 seconds)
Fields:
  - code: 6-digit OTP
  - attempts: number
  - createdAt: timestamp

Purpose: Store OTP for email verification

Example:
HSET email_otp:user@example.com code "123456" attempts 0 createdAt "1706342400"
EXPIRE email_otp:user@example.com 600
```

### 7.3 Blocked IPs
```redis
Key: blocked_ips:{ip}
Type: String
TTL: 24 hours (86400 seconds)
Value: reason

Purpose: Temporarily block abusive IPs

Example:
SET blocked_ips:192.168.1.1 "Too many failed login attempts"
EXPIRE blocked_ips:192.168.1.1 86400
```

### 7.4 WebSocket Authentication Tokens
```redis
Key: ws_auth:{socketId}
Type: String
TTL: 30 seconds
Value: authToken

Purpose: Temporary auth token for WebSocket handshake

Example:
SET ws_auth:socket-abc-xyz "temp-auth-token-123"
EXPIRE ws_auth:socket-abc-xyz 30
```

---

## **8. ENCRYPTION KEY CACHE**

### 8.1 Decrypted AES Key Cache
```redis
Key: key_cache:{userId}:{chatId}
Type: String
TTL: 5 minutes (300 seconds)
Value: Decrypted AES key (base64)

Purpose: Cache decrypted chat encryption keys

Example:
SET key_cache:uuid-123:chat-456 "base64-aes-key"
EXPIRE key_cache:uuid-123:chat-456 300
```

### 8.2 Encryption Key Version
```redis
Key: key_version:{chatId}
Type: String
TTL: None
Value: version number

Purpose: Track current encryption key version for rotation

Example:
SET key_version:chat-456 "1"
INCR key_version:chat-456  // Rotate to version 2
```

---

## **9. SEARCH & DISCOVERY**

### 9.1 User Search Index
```redis
Key: user_search_index
Type: Hash
TTL: None
Fields: rollNo → JSON user data

Purpose: Fast user search by roll number/name

Example:
HSET user_search_index "b23001" '{"userId":"uuid-123","name":"John","rollNo":"b23001"}'
HSCAN user_search_index 0 MATCH "b23*"
```

### 9.2 Group Search Index
```redis
Key: group_search_index
Type: Sorted Set
TTL: None
Score: member count (for popularity sorting)
Member: groupId:groupName

Purpose: Search and discover public groups

Example:
ZADD group_search_index 50 "group-123:Study Group"
ZREVRANGE group_search_index 0 9  // Top 10 popular groups
```

---

## **10. SYSTEM HEALTH & MONITORING**

### 10.1 WebSocket Connection Counter
```redis
Key: ws_connections
Type: String (counter)
TTL: None
Value: active connection count

Purpose: Monitor system load

Example:
INCR ws_connections
DECR ws_connections
GET ws_connections
```

### 10.2 Message Throughput Tracking
```redis
Key: message_throughput:{second}
Type: String (counter)
TTL: 60 seconds
Value: messages sent in this second

Purpose: Monitor messages per second for scaling

Example:
INCR message_throughput:1706342400
EXPIRE message_throughput:1706342400 60
```

---

## **REDIS CONFIGURATION SETTINGS**

### Recommended Redis Config (`redis.conf`)

```conf
# Memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence (for critical data)
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Performance
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Security
requirepass your_strong_password_here
bind 127.0.0.1

# Pub/Sub for real-time events
notify-keyspace-events Ex  # Expire events
```

---

## **REDIS CLIENT USAGE (Node.js)**

### Connection Setup

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

// Pub/Sub client (separate connection)
const redisSub = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: 0
});

module.exports = { redis, redisSub };
```

### Common Operations

```javascript
// Session Management
await redis.hset(`session:${sessionId}`, {
  userId,
  rollNo,
  email,
  createdAt: Date.now()
});
await redis.expire(`session:${sessionId}`, 604800); // 7 days

// Online Status
await redis.sadd('online_users', userId);
await redis.set(`user_socket:${userId}`, socketId);

// Typing Indicator
await redis.setex(`typing:${chatId}:${userId}`, 5, Date.now());

// Unread Counter
await redis.incr(`unread_counts:${userId}:${chatId}`);

// Poll Voting
await redis.hincrby(`poll_live:${pollId}`, 'votesInFavor', 1);
await redis.sadd(`user_voted:${pollId}`, userId);

// Anonymous Identity
await redis.set(`anon_map:${randomString}`, userId);
await redis.set(`user_anon:${userId}:${targetId}`, randomString);

// Rate Limiting
const key = `rate_limit:${userId}:${endpoint}:${currentMinute}`;
const count = await redis.incr(key);
await redis.expire(key, 60);
if (count > 100) throw new Error('Rate limit exceeded');
```

---

## **DATA CLEANUP & MAINTENANCE**

### Scheduled Jobs

```javascript
// Clean expired sessions (daily)
async function cleanExpiredSessions() {
  const keys = await redis.keys('session:*');
  for (const key of keys) {
    const ttl = await redis.ttl(key);
    if (ttl === -1) {
      await redis.expire(key, 604800); // Reset to 7 days
    }
  }
}

// Remove offline users (every 5 minutes)
async function cleanOfflineUsers() {
  const onlineUsers = await redis.smembers('online_users');
  for (const userId of onlineUsers) {
    const socketId = await redis.get(`user_socket:${userId}`);
    if (!socketId) {
      await redis.srem('online_users', userId);
    }
  }
}

// Resolve expired polls (every minute)
async function resolveExpiredPolls() {
  const pollKeys = await redis.keys('poll_live:*');
  const now = Date.now();
  
  for (const key of pollKeys) {
    const expiresAt = await redis.hget(key, 'expiresAt');
    if (expiresAt && now > parseInt(expiresAt)) {
      // Sync final counts to PostgreSQL
      const pollData = await redis.hgetall(key);
      // ... update database ...
      await redis.del(key);
    }
  }
}
```

---

## **MONITORING & DEBUGGING**

### Useful Commands

```bash
# Monitor all commands in real-time
redis-cli MONITOR

# Check memory usage
redis-cli INFO memory

# Count keys by pattern
redis-cli --scan --pattern "session:*" | wc -l

# Get slow queries
redis-cli SLOWLOG GET 10

# Check connected clients
redis-cli CLIENT LIST

# Pub/Sub channels
redis-cli PUBSUB CHANNELS
```

---

## **BACKUP STRATEGY**

1. **RDB Snapshots**: Every 15 minutes for recovery
2. **AOF Log**: For point-in-time recovery
3. **Critical Data**: Also persist in PostgreSQL
   - Session data → `user_sessions` table
   - Anonymous identities → `anonymous_identities` table
   - Poll results → `polls` and `votes` tables

---

## **SCALABILITY NOTES**

- Use **Redis Cluster** for horizontal scaling beyond 2GB RAM
- Separate Redis instances for different purposes:
  - **Instance 1**: Sessions & Auth
  - **Instance 2**: Real-time (presence, typing)
  - **Instance 3**: Caching (messages, keys)
- Use **Redis Sentinel** for high availability
- Consider **KeyDB** (Redis fork) for better multi-threading

---

**Total Redis Keys**: ~30 patterns across 10 categories
**Estimated Memory Usage**: 100-500MB for 1,000 active users
**Recommended Setup**: Redis 7.x with persistence enabled


