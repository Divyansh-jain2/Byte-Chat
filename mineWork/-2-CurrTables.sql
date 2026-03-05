-- ===============================================================================
--                              WORKING MAIN-1
-- ===============================================================================

-- ========== USERS TABLE ==========
CREATE TABLE IF NOT EXISTS users (
    user_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    roll_no VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    branch VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    dp_url TEXT,
    dob DATE,
    bio TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_roll_no ON users(roll_no);
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch);


-- ========== USER_VERIFICATIONS TABLE ==========
CREATE TABLE IF NOT EXISTS user_verifications (
    verification_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    verification_type VARCHAR(20) NOT NULL CHECK (verification_type IN ('signup', 'reset_password', 'change_email')),
    otp_code VARCHAR(6) NOT NULL,
    verification_token VARCHAR(255) UNIQUE,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_verifications_token ON user_verifications(verification_token);
CREATE INDEX IF NOT EXISTS idx_user_verifications_user ON user_verifications(user_id);


-- ========== USER_SESSIONS TABLE ==========
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_info JSONB,
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

-- ========== USER_SETTINGS TABLE ==========
CREATE TABLE IF NOT EXISTS user_settings (
    setting_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    theme VARCHAR(10) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    notification_enabled BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    privacy_profile_public BOOLEAN DEFAULT TRUE,
    privacy_show_online_status BOOLEAN DEFAULT TRUE,
    privacy_allow_anonymous_chats BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settings_user_id ON user_settings(user_id);

-- ========== USER_PASSWORD_RESETS TABLE ==========
CREATE TABLE IF NOT EXISTS user_password_resets (
    reset_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    reset_token VARCHAR(255) UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON user_password_resets(reset_token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON user_password_resets(user_id);


-- ========== TRIGGER FOR UPDATED_AT ==========
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
BEFORE UPDATE ON users 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== ROW LEVEL SECURITY (RLS) ==========
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_password_resets ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- User verifications (only system/admin can access)
CREATE POLICY "System access to verifications" ON user_verifications
    FOR ALL USING (false); -- Restrict all, manage via backend

-- User sessions (users can see own sessions)
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- User settings (users can manage own settings)
CREATE POLICY "Users can manage own settings" ON user_settings
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Password resets (restricted)
CREATE POLICY "System access to password resets" ON user_password_resets
    FOR ALL USING (false);


SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'user_verifications', 'user_sessions', 'user_settings', 'user_password_resets');


-- ===============================================================================
--                              WORKING MAIN-2
-- ===============================================================================


-- ========== CHAT_CONVERSATIONS TABLE ==========
CREATE TABLE IF NOT EXISTS chat_conversations (
    conversation_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    anonymous_initiator_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    is_accepted BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON chat_conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON chat_conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_accepted ON chat_conversations(is_accepted);
CREATE INDEX IF NOT EXISTS idx_conversations_blocked ON chat_conversations(is_blocked);

-- Trigger for updated_at
CREATE TRIGGER update_chat_conversations_updated_at 
BEFORE UPDATE ON chat_conversations 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- Users can view conversations they're part of
CREATE POLICY "Users can view own conversations" ON chat_conversations
    FOR SELECT USING (
        auth.uid()::text = user1_id::text OR 
        auth.uid()::text = user2_id::text
    );

-- Users can create conversations
CREATE POLICY "Users can create conversations" ON chat_conversations
    FOR INSERT WITH CHECK (
        auth.uid()::text = user1_id::text OR 
        auth.uid()::text = user2_id::text
    );

-- Users can update conversations they're part of
CREATE POLICY "Users can update own conversations" ON chat_conversations
    FOR UPDATE USING (
        auth.uid()::text = user1_id::text OR 
        auth.uid()::text = user2_id::text
    );


-- Function to get or create conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(
    p_user1_id UUID,
    p_user2_id UUID
)
RETURNS TABLE (
    conversation_id UUID,
    user1_id UUID,
    user2_id UUID,
    is_anonymous BOOLEAN,
    is_accepted BOOLEAN,
    is_blocked BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_conversation_id UUID;
    v_user1 UUID;
    v_user2 UUID;
BEGIN
    -- Ensure consistent ordering (smaller ID first)
    IF p_user1_id < p_user2_id THEN
        v_user1 := p_user1_id;
        v_user2 := p_user2_id;
    ELSE
        v_user1 := p_user2_id;
        v_user2 := p_user1_id;
    END IF;

    -- Try to find existing conversation
    SELECT c.conversation_id INTO v_conversation_id
    FROM chat_conversations c
    WHERE c.user1_id = v_user1 
      AND c.user2_id = v_user2
      AND c.is_blocked = false;

    -- If not found, create new
    IF v_conversation_id IS NULL THEN
        INSERT INTO chat_conversations (user1_id, user2_id, created_at)
        VALUES (v_user1, v_user2, NOW())
        RETURNING chat_conversations.conversation_id INTO v_conversation_id;
    END IF;

    -- Return the conversation
    RETURN QUERY
    SELECT 
        c.conversation_id,
        c.user1_id,
        c.user2_id,
        c.is_anonymous,
        c.is_accepted,
        c.is_blocked,
        c.created_at
    FROM chat_conversations c
    WHERE c.conversation_id = v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if users can chat (not blocked)
CREATE OR REPLACE FUNCTION can_chat(
    p_user1_id UUID,
    p_user2_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_blocked BOOLEAN;
BEGIN
    -- Check if either user blocked the other
    SELECT EXISTS (
        SELECT 1 FROM user_blocks 
        WHERE (blocker_id = p_user1_id AND blocked_id = p_user2_id)
           OR (blocker_id = p_user2_id AND blocked_id = p_user1_id)
    ) INTO v_blocked;
    
    RETURN NOT v_blocked;
END;
$$ LANGUAGE plpgsql;


-- ==================================================================================


-- Test the table
INSERT INTO users (roll_no, name, gender, branch, password_hash, is_verified)
VALUES 
    ('B23CS001', 'John Doe', 'male', 'CSE', 'hash1', true),
    ('B23CS002', 'Jane Smith', 'female', 'CSE', 'hash2', true)
RETURNING user_id;

-- Get or create conversation
SELECT * FROM get_or_create_conversation(
    (SELECT user_id FROM users WHERE roll_no = 'B23CS001'),
    (SELECT user_id FROM users WHERE roll_no = 'B23CS002')
);


-- ===============================================================================
--                              WORKING MAIN-3
-- ===============================================================================


-- ========== GROUPS TABLE ==========
CREATE TABLE IF NOT EXISTS groups (
    group_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_name VARCHAR(100) NOT NULL,
    group_desc TEXT,
    group_dp_url TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    max_members INTEGER DEFAULT 500,
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_groups_public ON groups(is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_groups_creator ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_active ON groups(is_active);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_groups_updated_at 
BEFORE UPDATE ON groups 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Public groups can be viewed by anyone
CREATE POLICY "Anyone can view public groups" ON groups
    FOR SELECT USING (is_public = true);

-- Group creators can view their own groups (public or private)
CREATE POLICY "Creators can view their groups" ON groups
    FOR SELECT USING (auth.uid()::text = created_by::text);

-- Only authenticated users can create groups
CREATE POLICY "Authenticated users can create groups" ON groups
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only creators can update their groups
CREATE POLICY "Creators can update their groups" ON groups
    FOR UPDATE USING (auth.uid()::text = created_by::text);

-- Only creators can delete their groups
CREATE POLICY "Creators can delete their groups" ON groups
    FOR DELETE USING (auth.uid()::text = created_by::text);

-- ========== HELPER FUNCTION: Get Group Member Count (Safe Version) ==========
CREATE OR REPLACE FUNCTION get_group_member_count(p_group_id UUID)
RETURNS INTEGER AS $$
DECLARE
    member_count INTEGER;
    table_exists BOOLEAN;
BEGIN
    -- Check if group_members table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'group_members'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO member_count
        FROM group_members
        WHERE group_id = p_group_id;
    ELSE
        member_count := 0;
    END IF;
    
    RETURN member_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- ========== HELPER FUNCTION: Is User Group Member (Safe Version) ==========
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_member BOOLEAN;
    table_exists BOOLEAN;
BEGIN
    -- Check if group_members table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'group_members'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = p_group_id AND user_id = p_user_id
        ) INTO is_member;
    ELSE
        is_member := false;
    END IF;
    
    RETURN is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test groups
INSERT INTO groups (group_name, group_desc, is_public, created_by)
VALUES 
    ('CSE 2023 Batch', 'Computer Science 2023 Batch Group', true, (SELECT user_id FROM users WHERE roll_no = 'B23CS001')),
    ('Private Study Group', 'Private study discussions', false, (SELECT user_id FROM users WHERE roll_no = 'B23CS002'))
RETURNING *;


-- ========== ANONYMOUS_IDENTITIES TABLE ==========
CREATE TABLE IF NOT EXISTS anonymous_identities (
    identity_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES chat_conversations(conversation_id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
    
    -- Display info
    random_string VARCHAR(50) UNIQUE NOT NULL,
    display_gender VARCHAR(10) NOT NULL CHECK (display_gender IN ('male', 'female', 'other')),
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    is_revealed BOOLEAN DEFAULT FALSE,
    revealed_at TIMESTAMPTZ,
    
    -- Constraint: either target_user OR group_id, not both
    CONSTRAINT chk_anon_target CHECK (
        (target_user_id IS NOT NULL AND group_id IS NULL) OR
        (target_user_id IS NULL AND group_id IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_anon_identities_user ON anonymous_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_anon_identities_random ON anonymous_identities(random_string);
CREATE INDEX IF NOT EXISTS idx_anon_identities_target ON anonymous_identities(target_user_id);
CREATE INDEX IF NOT EXISTS idx_anon_identities_group ON anonymous_identities(group_id);
CREATE INDEX IF NOT EXISTS idx_anon_identities_conversation ON anonymous_identities(conversation_id);
CREATE INDEX IF NOT EXISTS idx_anon_identities_active ON anonymous_identities(is_active);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE anonymous_identities ENABLE ROW LEVEL SECURITY;

-- Users can only see their own anonymous identities
CREATE POLICY "Users can view own anonymous identities" ON anonymous_identities
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can create anonymous identities
CREATE POLICY "Users can create anonymous identities" ON anonymous_identities
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Users can update their own anonymous identities
CREATE POLICY "Users can update own anonymous identities" ON anonymous_identities
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Users can delete their own anonymous identities
CREATE POLICY "Users can delete own anonymous identities" ON anonymous_identities
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- ========== HELPER FUNCTION: Generate Anonymous String ==========
CREATE OR REPLACE FUNCTION generate_anonymous_string()
RETURNS VARCHAR AS $$
DECLARE
    random_str VARCHAR(50);
BEGIN
    -- Generate unique anonymous string: anon_random_timestamp
    random_str := 'anon_' || substring(md5(random()::text) from 1 for 8) || 
                  '_' || floor(extract(epoch from now()))::text;
    RETURN random_str;
END;
$$ LANGUAGE plpgsql;


-- ==================================================================================


-- Test anonymous identity
INSERT INTO anonymous_identities (
    user_id, 
    target_user_id, 
    random_string, 
    display_gender
)
SELECT 
    (SELECT user_id FROM users WHERE roll_no = 'B23CS001'),
    (SELECT user_id FROM users WHERE roll_no = 'B23CS002'),
    generate_anonymous_string(),
    'male'
RETURNING *;


-- ===============================================================================
--                              WORKING MAIN-4
-- ===============================================================================


-- ========== GROUP_MEMBERS TABLE ==========
CREATE TABLE IF NOT EXISTS group_members (
    member_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_owner BOOLEAN DEFAULT FALSE,
    
    -- Anonymous in group
    is_anonymous BOOLEAN DEFAULT FALSE,
    anonymous_display_name VARCHAR(50),
    anonymous_identity_id UUID REFERENCES anonymous_identities(identity_id) ON DELETE SET NULL,
    
    can_send_messages BOOLEAN DEFAULT TRUE,
    can_add_members BOOLEAN DEFAULT FALSE,
    can_remove_members BOOLEAN DEFAULT FALSE,
    can_edit_group BOOLEAN DEFAULT FALSE,

    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(group_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_admin ON group_members(group_id) WHERE is_admin = TRUE;
CREATE INDEX IF NOT EXISTS idx_group_members_owner ON group_members(group_id) WHERE is_owner = TRUE;
CREATE INDEX IF NOT EXISTS idx_group_members_joined ON group_members(joined_at DESC);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Members can view their own memberships
CREATE POLICY "Users can view own memberships" ON group_members
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Group members can view other members in their groups
CREATE POLICY "Group members can view other members" ON group_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_members.group_id 
            AND gm.user_id::text = auth.uid()::text
        )
    );

-- Only group admins/owners can add members
CREATE POLICY "Admins can add members" ON group_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_members.group_id 
            AND gm.user_id::text = auth.uid()::text
            AND (gm.is_admin = TRUE OR gm.is_owner = TRUE)
        )
    );

-- Members can update their own anonymity
CREATE POLICY "Members can update own anonymity" ON group_members
    FOR UPDATE USING (
        auth.uid()::text = user_id::text
    );

-- Admins can update member roles
CREATE POLICY "Admins can update member roles" ON group_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_members.group_id 
            AND gm.user_id::text = auth.uid()::text
            AND (gm.is_admin = TRUE OR gm.is_owner = TRUE)
        )
    );

-- Admins can remove members
CREATE POLICY "Admins can remove members" ON group_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_members.group_id 
            AND gm.user_id::text = auth.uid()::text
            AND (gm.is_admin = TRUE OR gm.is_owner = TRUE)
        )
    );


-- ========== GROUP_INVITES TABLE ==========
CREATE TABLE IF NOT EXISTS group_invites (
    invite_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    invitee_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    invite_token VARCHAR(255) UNIQUE,
    invite_type VARCHAR(20) DEFAULT 'private' CHECK (invite_type IN ('private', 'public_link')),

    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
    -- UNIQUE(group_id, invitee_id) WHERE status = 'pending'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invite 
ON group_invites(group_id, invitee_id) 
WHERE status = 'pending';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_invites_invitee ON group_invites(invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_group_invites_group ON group_invites(group_id, status);
CREATE INDEX IF NOT EXISTS idx_group_invites_inviter ON group_invites(invited_by);
CREATE INDEX IF NOT EXISTS idx_group_invites_expires ON group_invites(expires_at);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE group_invites ENABLE ROW LEVEL SECURITY;

-- Users can view invites sent to them
CREATE POLICY "Users can view own invites" ON group_invites
    FOR SELECT USING (auth.uid()::text = invitee_id::text);

-- Inviters can view invites they sent
CREATE POLICY "Inviters can view sent invites" ON group_invites
    FOR SELECT USING (auth.uid()::text = invited_by::text);

-- Group admins can view all invites for their group
CREATE POLICY "Admins can view group invites" ON group_invites
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_invites.group_id 
            AND gm.user_id::text = auth.uid()::text
            AND (gm.is_admin = TRUE OR gm.is_owner = TRUE)
        )
    );

-- Only group admins can create invites
CREATE POLICY "Admins can create invites" ON group_invites
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_invites.group_id 
            AND gm.user_id::text = auth.uid()::text
            AND (gm.is_admin = TRUE OR gm.is_owner = TRUE)
        )
    );

-- Invitees can accept/reject their invites
CREATE POLICY "Invitees can respond to invites" ON group_invites
    FOR UPDATE USING (auth.uid()::text = invitee_id::text)
    WITH CHECK (auth.uid()::text = invitee_id::text);

-- Admins can cancel their invites
CREATE POLICY "Admins can cancel invites" ON group_invites
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_invites.group_id 
            AND gm.user_id::text = auth.uid()::text
            AND (gm.is_admin = TRUE OR gm.is_owner = TRUE)
        )
    );

-- ========== GROUP_BANS TABLE ==========
CREATE TABLE IF NOT EXISTS group_bans (
    ban_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    banned_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reason TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),    
    UNIQUE(group_id, user_id)
);

CREATE OR REPLACE VIEW active_group_bans AS
SELECT *,
    (expires_at IS NULL OR expires_at > NOW()) as is_active
FROM group_bans;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_bans_group ON group_bans(group_id);
CREATE INDEX IF NOT EXISTS idx_group_bans_user ON group_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_group_bans_banned_by ON group_bans(banned_by);
CREATE INDEX IF NOT EXISTS idx_group_bans_expires ON group_bans(expires_at);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE group_bans ENABLE ROW LEVEL SECURITY;

-- Banned users can view their own bans
CREATE POLICY "Users can view own bans" ON group_bans
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Group admins can view all bans
CREATE POLICY "Admins can view group bans" ON group_bans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_bans.group_id 
            AND gm.user_id::text = auth.uid()::text
            AND (gm.is_admin = TRUE OR gm.is_owner = TRUE)
        )
    );

-- Only group admins can create bans
CREATE POLICY "Admins can create bans" ON group_bans
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_bans.group_id 
            AND gm.user_id::text = auth.uid()::text
            AND (gm.is_admin = TRUE OR gm.is_owner = TRUE)
        )
    );

-- Only admins can update/remove bans
CREATE POLICY "Admins can manage bans" ON group_bans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_bans.group_id 
            AND gm.user_id::text = auth.uid()::text
            AND (gm.is_admin = TRUE OR gm.is_owner = TRUE)
        )
    );

-- ========== HELPER FUNCTION: Check if user is banned ==========
CREATE OR REPLACE FUNCTION is_user_banned(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_banned BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM group_bans 
        WHERE group_id = p_group_id 
        AND user_id = p_user_id
        AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO is_banned;
    
    RETURN is_banned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ========== Groups with Member Count ==========
CREATE OR REPLACE VIEW groups_with_member_count AS
SELECT 
    g.*,
    (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.group_id) as member_count
FROM groups g;


-- ========== Promote random member as admin ==========
CREATE OR REPLACE FUNCTION promote_random_admin_on_empty()
RETURNS TRIGGER AS $$
DECLARE
    random_member RECORD;
    target_group_id UUID;
BEGIN

    -- Get the group_id from OLD (for DELETE) or NEW (for UPDATE)
    target_group_id := COALESCE(OLD.group_id, NEW.group_id);

    -- Check if no admins left after deletion/update
    IF NOT EXISTS (
        SELECT 1 FROM group_members 
        WHERE group_id = target_group_id 
        AND (is_admin = TRUE OR is_owner = TRUE)
    ) THEN
        -- Find a random non-banned member to promote
        SELECT * INTO random_member
        FROM group_members gm
        WHERE gm.group_id = target_group_id
        AND NOT EXISTS (
            SELECT 1 FROM group_bans gb
            WHERE gb.group_id = gm.group_id
            AND gb.user_id = gm.user_id
            AND (gb.expires_at IS NULL OR gb.expires_at > NOW())
        )
        ORDER BY joined_at ASC -- Promote oldest member first
        LIMIT 1;
        
        IF FOUND THEN
            -- Promote to admin
            UPDATE group_members 
            SET is_admin = TRUE,
                can_add_members = TRUE,
                can_remove_members = TRUE,
                can_edit_group = TRUE
            WHERE member_id = random_member.member_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ========== Update permissions based on admin status ==========
CREATE OR REPLACE FUNCTION update_member_permissions()
RETURNS TRIGGER AS $$
BEGIN
    -- If admin or owner, grant full permissions
    IF NEW.is_admin = TRUE OR NEW.is_owner = TRUE THEN
        NEW.can_add_members := TRUE;
        NEW.can_remove_members := TRUE;
        NEW.can_edit_group := TRUE;
    ELSE
        -- Non-admins have limited permissions
        NEW.can_add_members := FALSE;
        NEW.can_remove_members := FALSE;
        NEW.can_edit_group := FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER set_member_permissions 
BEFORE INSERT OR UPDATE ON group_members 
FOR EACH ROW EXECUTE FUNCTION update_member_permissions();

-- ========== When admin leaves/removed ==========
CREATE TRIGGER auto_promote_on_admin_removal 
AFTER UPDATE OR DELETE ON group_members 
FOR EACH ROW 
EXECUTE FUNCTION promote_random_admin_on_empty();

-- ========== TRIGGER 2: When admin role changed ==========
CREATE TRIGGER auto_promote_on_admin_role_change 
AFTER UPDATE OF is_admin, is_owner OR DELETE ON group_members 
FOR EACH ROW 
EXECUTE FUNCTION promote_random_admin_on_empty();


-- ========== FUNCTION: Get next admin candidate ==========
CREATE OR REPLACE FUNCTION get_next_admin_candidate(p_group_id UUID)
RETURNS TABLE (
    member_id UUID,
    user_id UUID,
    name VARCHAR,
    roll_no VARCHAR,
    joined_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gm.member_id,
        gm.user_id,
        COALESCE(u.name, 'Unknown') as name,
        COALESCE(u.roll_no, '') as roll_no,
        gm.joined_at
    FROM group_members gm
    LEFT JOIN users u ON gm.user_id = u.user_id
    WHERE gm.group_id = p_group_id
    AND gm.is_admin = FALSE
    AND gm.is_owner = FALSE
    AND NOT is_user_banned(p_group_id, gm.user_id)
    ORDER BY gm.joined_at ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==================================================================================


-- Add members to group
INSERT INTO group_members (group_id, user_id, is_admin, is_owner)
SELECT 
    (SELECT group_id FROM groups WHERE group_name = 'CSE 2023 Batch'),
    user_id,
    CASE WHEN roll_no = 'B23CS001' THEN TRUE ELSE FALSE END,
    CASE WHEN roll_no = 'B23CS001' THEN TRUE ELSE FALSE END
FROM users 
WHERE roll_no IN ('B23CS001', 'B23CS002')
RETURNING *;

-- Create invite
INSERT INTO group_invites (group_id, invited_by, invitee_id)
SELECT 
    (SELECT group_id FROM groups WHERE group_name = 'CSE 2023 Batch'),
    (SELECT user_id FROM users WHERE roll_no = 'B23CS001'),
    (SELECT user_id FROM users WHERE roll_no = 'B23CS002')
RETURNING *;

-- Test ban
INSERT INTO group_bans (group_id, user_id, banned_by, reason)
SELECT 
    (SELECT group_id FROM groups WHERE group_name = 'CSE 2023 Batch'),
    (SELECT user_id FROM users WHERE roll_no = 'B23CS002'),
    (SELECT user_id FROM users WHERE roll_no = 'B23CS001'),
    'Test ban'
RETURNING *;


-- ===============================================================================
--                              WORKING MAIN-5
-- ===============================================================================


-- ========== CHAT_MESSAGES TABLE ==========
CREATE TABLE IF NOT EXISTS chat_messages (
    message_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES chat_conversations(conversation_id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'emoji')),
    
    -- Encrypted content
    encrypted_content TEXT NOT NULL,
    content_iv VARCHAR(50) NOT NULL,
    content_auth_tag VARCHAR(50) NOT NULL,
    
    -- For media messages
    media_url TEXT,
    media_size INTEGER,
    media_mime_type VARCHAR(100),
    thumbnail_url TEXT,
    
    -- Anonymous messaging
    is_anonymous BOOLEAN DEFAULT FALSE,
    anonymous_identity_id UUID REFERENCES anonymous_identities(identity_id) ON DELETE SET NULL,
    
    -- Status
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    
    -- Parent message for replies
    parent_message_id UUID REFERENCES chat_messages(message_id) ON DELETE SET NULL,

    -- Encryption info
    encryption_key_version INTEGER DEFAULT 1,
    key_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: Either conversation OR group, not both
    CONSTRAINT chk_conversation_or_group CHECK (
        (conversation_id IS NOT NULL AND group_id IS NULL) OR
        (conversation_id IS NULL AND group_id IS NOT NULL)
    )
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_group ON chat_messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON chat_messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_anonymous ON chat_messages(anonymous_identity_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON chat_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON chat_messages(is_deleted);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_user ON chat_messages(conversation_id, sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_group_user ON chat_messages(group_id, sender_id);

-- Trigger for updated_at
CREATE TRIGGER update_chat_messages_updated_at 
BEFORE UPDATE ON chat_messages 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update conversation's last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.conversation_id IS NOT NULL THEN
        UPDATE chat_conversations 
        SET last_message_at = NEW.created_at,
            updated_at = NOW()
        WHERE conversation_id = NEW.conversation_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_timestamp 
AFTER INSERT ON chat_messages 
FOR EACH ROW 
EXECUTE FUNCTION update_conversation_last_message();

-- Trigger to update group's updated_at
CREATE OR REPLACE FUNCTION update_group_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.group_id IS NOT NULL THEN
        UPDATE groups 
        SET updated_at = NOW()
        WHERE group_id = NEW.group_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_group_timestamp 
AFTER INSERT ON chat_messages 
FOR EACH ROW 
EXECUTE FUNCTION update_group_last_activity();

-- ========== ROW LEVEL SECURITY (RLS) ==========
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view messages in their personal conversations
CREATE POLICY "Users can view personal conversation messages" ON chat_messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT conversation_id FROM chat_conversations 
            WHERE user1_id::text = auth.uid()::text 
            OR user2_id::text = auth.uid()::text
        )
    );

-- Policy 2: Users can view messages in groups they're members of
CREATE POLICY "Users can view group messages" ON chat_messages
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM group_members 
            WHERE user_id::text = auth.uid()::text
        )
    );

-- Policy 3: Users can send messages in personal conversations they're part of
CREATE POLICY "Users can send personal messages" ON chat_messages
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT conversation_id FROM chat_conversations 
            WHERE user1_id::text = auth.uid()::text 
            OR user2_id::text = auth.uid()::text
        )
        AND sender_id::text = auth.uid()::text
    );

-- Policy 4: Users can send messages in groups if they have permission
CREATE POLICY "Users can send group messages" ON chat_messages
    FOR INSERT WITH CHECK (
        group_id IN (
            SELECT gm.group_id FROM group_members gm
            WHERE gm.user_id::text = auth.uid()::text
            AND gm.can_send_messages = TRUE
            AND NOT EXISTS (
                SELECT 1 FROM group_bans gb
                WHERE gb.group_id = gm.group_id
                AND gb.user_id = gm.user_id
                AND (gb.expires_at IS NULL OR gb.expires_at > NOW())
            )
        )
        AND sender_id::text = auth.uid()::text
    );

-- Policy 5: Users can edit their own messages
CREATE POLICY "Users can edit own messages" ON chat_messages
    FOR UPDATE USING (sender_id::text = auth.uid()::text)
    WITH CHECK (sender_id::text = auth.uid()::text);

-- Policy 6: Users can delete their own messages (soft delete)
CREATE POLICY "Users can delete own messages" ON chat_messages
    FOR UPDATE USING (sender_id::text = auth.uid()::text)
    WITH CHECK (sender_id::text = auth.uid()::text);

-- Policy 7: Group admins can delete any message in their group
CREATE POLICY "Admins can delete group messages" ON chat_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = chat_messages.group_id
            AND gm.user_id::text = auth.uid()::text
            AND (gm.is_admin = TRUE OR gm.is_owner = TRUE)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = chat_messages.group_id
            AND gm.user_id::text = auth.uid()::text
            AND (gm.is_admin = TRUE OR gm.is_owner = TRUE)
        )
    );

-- ========== HELPER FUNCTIONS ==========

-- Function to get conversation messages with pagination
CREATE OR REPLACE FUNCTION get_conversation_messages(
    p_conversation_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    message_id UUID,
    sender_id UUID,
    message_type VARCHAR,
    encrypted_content TEXT,
    content_iv VARCHAR,
    content_auth_tag VARCHAR,
    media_url TEXT,
    is_anonymous BOOLEAN,
    anonymous_identity_id UUID,
    is_edited BOOLEAN,
    parent_message_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cm.message_id,
        cm.sender_id,
        cm.message_type,
        cm.encrypted_content,
        cm.content_iv,
        cm.content_auth_tag,
        cm.media_url,
        cm.is_anonymous,
        cm.anonymous_identity_id,
        cm.is_edited,
        cm.parent_message_id,
        cm.created_at,
        cm.updated_at
    FROM chat_messages cm
    WHERE cm.conversation_id = p_conversation_id
    AND cm.is_deleted = FALSE
    AND (p_before IS NULL OR cm.created_at < p_before)
    ORDER BY cm.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get group messages with pagination
CREATE OR REPLACE FUNCTION get_group_messages(
    p_group_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    message_id UUID,
    sender_id UUID,
    message_type VARCHAR,
    encrypted_content TEXT,
    content_iv VARCHAR,
    content_auth_tag VARCHAR,
    media_url TEXT,
    is_anonymous BOOLEAN,
    anonymous_display_name VARCHAR,
    anonymous_display_gender VARCHAR,
    anonymous_display_year INTEGER,
    is_edited BOOLEAN,
    parent_message_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cm.message_id,
        cm.sender_id,
        cm.message_type,
        cm.encrypted_content,
        cm.content_iv,
        cm.content_auth_tag,
        cm.media_url,
        cm.is_anonymous,
        gm.anonymous_display_name,
        ai.display_gender,
        ai.display_year,
        cm.is_edited,
        cm.parent_message_id,
        cm.created_at,
        cm.updated_at
    FROM chat_messages cm
    LEFT JOIN group_members gm ON cm.sender_id = gm.user_id 
        AND cm.group_id = gm.group_id
    LEFT JOIN anonymous_identities ai ON cm.anonymous_identity_id = ai.identity_id
    WHERE cm.group_id = p_group_id
    AND cm.is_deleted = FALSE
    AND (p_before IS NULL OR cm.created_at < p_before)
    ORDER BY cm.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can view message
CREATE OR REPLACE FUNCTION can_view_message(p_message_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_message RECORD;
    v_is_member BOOLEAN;
    v_is_conversation_participant BOOLEAN;
BEGIN
    -- Get message details
    SELECT conversation_id, group_id, sender_id INTO v_message
    FROM chat_messages 
    WHERE message_id = p_message_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check personal conversation
    IF v_message.conversation_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM chat_conversations 
            WHERE conversation_id = v_message.conversation_id
            AND (user1_id = p_user_id OR user2_id = p_user_id)
        ) INTO v_is_conversation_participant;
        
        RETURN v_is_conversation_participant;
    END IF;
    
    -- Check group membership
    IF v_message.group_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = v_message.group_id
            AND user_id = p_user_id
        ) INTO v_is_member;
        
        RETURN v_is_member;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


DROP FUNCTION get_group_messages;

CREATE OR REPLACE FUNCTION get_group_messages(
    p_group_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    message_id UUID,
    sender_id UUID,
    message_type VARCHAR,
    encrypted_content TEXT,
    content_iv VARCHAR,
    content_auth_tag VARCHAR,
    media_url TEXT,
    is_anonymous BOOLEAN,
    anonymous_display_name VARCHAR,
    anonymous_display_gender VARCHAR,
    is_edited BOOLEAN,
    parent_message_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cm.message_id,
        cm.sender_id,
        cm.message_type,
        cm.encrypted_content,
        cm.content_iv,
        cm.content_auth_tag,
        cm.media_url,
        cm.is_anonymous,
        COALESCE(gm.anonymous_display_name, 'Anonymous') as anonymous_display_name,
        ai.display_gender,
        cm.is_edited,
        cm.parent_message_id,
        cm.created_at,
        cm.updated_at
    FROM chat_messages cm
    LEFT JOIN group_members gm ON cm.sender_id = gm.user_id 
        AND cm.group_id = gm.group_id
    LEFT JOIN anonymous_identities ai ON cm.anonymous_identity_id = ai.identity_id
    WHERE cm.group_id = p_group_id
    AND cm.is_deleted = FALSE
    AND (p_before IS NULL OR cm.created_at < p_before)
    ORDER BY cm.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==================================================================================


-- Test inserting a personal message
INSERT INTO chat_messages (
    conversation_id,
    sender_id,
    encrypted_content,
    content_iv,
    content_auth_tag
)
SELECT 
    (SELECT conversation_id FROM chat_conversations LIMIT 1),
    (SELECT user_id FROM users WHERE roll_no = 'B23CS001'),
    'encrypted_content_here',
    'iv_here',
    'auth_tag_here'
RETURNING *;

-- Test inserting a group message
INSERT INTO chat_messages (
    group_id,
    sender_id,
    encrypted_content,
    content_iv,
    content_auth_tag
)
SELECT 
    (SELECT group_id FROM groups LIMIT 1),
    (SELECT user_id FROM users WHERE roll_no = 'B23CS001'),
    'encrypted_group_message',
    'iv_here',
    'auth_tag_here'
RETURNING *;

-- Test pagination functions
SELECT * FROM get_conversation_messages(
    (SELECT conversation_id FROM chat_conversations LIMIT 1),
    10
);

SELECT * FROM get_group_messages(
    (SELECT group_id FROM groups LIMIT 1),
    10
);


-- ===============================================================================
--                              WORKING MAIN-6
-- ===============================================================================

-- ========== MESSAGE_STATUS TABLE ==========
CREATE TABLE IF NOT EXISTS message_status (
    status_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES chat_messages(message_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    read_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(message_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_status_message ON message_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_status_user ON message_status(user_id);
CREATE INDEX IF NOT EXISTS idx_message_status_status ON message_status(status);
CREATE INDEX IF NOT EXISTS idx_message_status_read_at ON message_status(read_at);
CREATE INDEX IF NOT EXISTS idx_message_status_delivered_at ON message_status(delivered_at);
CREATE INDEX IF NOT EXISTS idx_message_status_user_message ON message_status(user_id, message_id);

-- Trigger to auto-create status records for conversation participants
CREATE OR REPLACE FUNCTION create_message_status_for_participants()
RETURNS TRIGGER AS $$
DECLARE
    v_conversation_id UUID;
    v_group_id UUID;
    v_other_user_id UUID;
    v_participants UUID[];
BEGIN
    -- Get conversation or group details
    SELECT conversation_id, group_id INTO v_conversation_id, v_group_id
    FROM chat_messages WHERE message_id = NEW.message_id;
    
    -- Personal conversation
    IF v_conversation_id IS NOT NULL THEN
        -- Get the other user in conversation
        SELECT 
            CASE 
                WHEN user1_id = NEW.user_id THEN user2_id
                ELSE user1_id
            END INTO v_other_user_id
        FROM chat_conversations 
        WHERE conversation_id = v_conversation_id;
        
        -- Create status for sender (sent)
        INSERT INTO message_status (message_id, user_id, status, delivered_at)
        VALUES (NEW.message_id, NEW.user_id, 'sent', NOW())
        ON CONFLICT (message_id, user_id) DO NOTHING;
        
        -- Create status for receiver (pending)
        INSERT INTO message_status (message_id, user_id, status)
        VALUES (NEW.message_id, v_other_user_id, 'sent')
        ON CONFLICT (message_id, user_id) DO NOTHING;
    
    -- Group conversation
    ELSIF v_group_id IS NOT NULL THEN
        -- Create status for sender (sent)
        INSERT INTO message_status (message_id, user_id, status, delivered_at)
        VALUES (NEW.message_id, NEW.user_id, 'sent', NOW())
        ON CONFLICT (message_id, user_id) DO NOTHING;
        
        -- Create status for all group members except sender
        INSERT INTO message_status (message_id, user_id, status)
        SELECT NEW.message_id, gm.user_id, 'sent'
        FROM group_members gm
        WHERE gm.group_id = v_group_id
        AND gm.user_id != NEW.user_id
        ON CONFLICT (message_id, user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_message_status 
AFTER INSERT ON chat_messages 
FOR EACH ROW 
EXECUTE FUNCTION create_message_status_for_participants();

-- Trigger to update message delivery time
CREATE OR REPLACE FUNCTION update_delivery_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When status changes to 'delivered', set delivered_at
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        NEW.delivered_at := NOW();
    END IF;
    
    -- When status changes to 'read', set read_at
    IF NEW.status = 'read' AND OLD.status != 'read' THEN
        NEW.read_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_delivery_timestamps 
BEFORE UPDATE ON message_status 
FOR EACH ROW 
EXECUTE FUNCTION update_delivery_status();

-- ========== ROW LEVEL SECURITY (RLS) ==========
ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;

-- Users can view status of messages they're part of
CREATE POLICY "Users can view message status" ON message_status
    FOR SELECT USING (
        user_id::text = auth.uid()::text OR
        message_id IN (
            SELECT message_id FROM chat_messages 
            WHERE sender_id::text = auth.uid()::text
        )
    );

-- Users can update their own message status (mark as read/delivered)
CREATE POLICY "Users can update own status" ON message_status
    FOR UPDATE USING (user_id::text = auth.uid()::text)
    WITH CHECK (user_id::text = auth.uid()::text);

-- System can insert status records (via trigger)
CREATE POLICY "System can insert status" ON message_status
    FOR INSERT WITH CHECK (true);

-- ========== HELPER FUNCTIONS ==========

-- Function to mark message as read
CREATE OR REPLACE FUNCTION mark_message_as_read(p_message_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE message_status 
    SET status = 'read',
        read_at = NOW()
    WHERE message_id = p_message_id 
    AND user_id = p_user_id
    AND status != 'read';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark message as delivered
CREATE OR REPLACE FUNCTION mark_message_as_delivered(p_message_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE message_status 
    SET status = 'delivered',
        delivered_at = NOW()
    WHERE message_id = p_message_id 
    AND user_id = p_user_id
    AND status = 'sent';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get message read status
CREATE OR REPLACE FUNCTION get_message_read_status(p_message_id UUID)
RETURNS TABLE (
    user_id UUID,
    status VARCHAR,
    read_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ms.user_id,
        ms.status,
        ms.read_at,
        ms.delivered_at
    FROM message_status ms
    WHERE ms.message_id = p_message_id
    ORDER BY ms.read_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===============================================================================
--                              WORKING MAIN-7
-- ===============================================================================

-- ========== CHAT_REQUESTS TABLE ==========
CREATE TABLE IF NOT EXISTS chat_requests (
    request_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    request_type VARCHAR(20) DEFAULT 'normal' CHECK (request_type IN ('normal', 'anonymous')),
    anonymous_identity_id UUID REFERENCES anonymous_identities(identity_id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked', 'expired')),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a partial UNIQUE index for pending requests
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_request 
ON chat_requests(sender_id, receiver_id, request_type) 
WHERE status = 'pending';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_requests_receiver ON chat_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_requests_sender ON chat_requests(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_requests_type ON chat_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_chat_requests_expires ON chat_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_requests_created ON chat_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_requests_sender_receiver ON chat_requests(sender_id, receiver_id);

-- Trigger for updated_at
CREATE TRIGGER update_chat_requests_updated_at 
BEFORE UPDATE ON chat_requests 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-expire requests
CREATE OR REPLACE FUNCTION expire_old_requests()
RETURNS TRIGGER AS $$
BEGIN
    -- Expire requests older than 24 hours
    UPDATE chat_requests 
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending'
    AND expires_at <= NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job or run this function periodically
-- For now, add trigger that runs on insert/update
CREATE TRIGGER check_expired_requests 
BEFORE INSERT OR UPDATE ON chat_requests 
FOR EACH ROW 
EXECUTE FUNCTION expire_old_requests();

-- Trigger to create conversation when request is accepted (safe version)
CREATE OR REPLACE FUNCTION create_conversation_on_accept()
RETURNS TRIGGER AS $$
DECLARE
    chat_conversations_exists BOOLEAN;
    system_notifications_exists BOOLEAN;
BEGIN
    IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
        -- Check if chat_conversations table exists
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'chat_conversations'
        ) INTO chat_conversations_exists;
        
        IF chat_conversations_exists THEN
            -- Create or get existing conversation
            INSERT INTO chat_conversations (user1_id, user2_id, is_anonymous, anonymous_initiator_id, is_accepted)
            VALUES (
                LEAST(NEW.sender_id, NEW.receiver_id),
                GREATEST(NEW.sender_id, NEW.receiver_id),
                NEW.request_type = 'anonymous',
                CASE WHEN NEW.request_type = 'anonymous' THEN NEW.sender_id ELSE NULL END,
                TRUE
            )
            ON CONFLICT (user1_id, user2_id) 
            DO UPDATE SET 
                is_accepted = TRUE,
                is_anonymous = NEW.request_type = 'anonymous',
                anonymous_initiator_id = CASE 
                    WHEN NEW.request_type = 'anonymous' THEN NEW.sender_id 
                    ELSE NULL 
                END,
                updated_at = NOW();
        END IF;
        
        -- Check if system_notifications table exists
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'system_notifications'
        ) INTO system_notifications_exists;
        
        IF system_notifications_exists THEN
            -- Create notification for sender
            INSERT INTO system_notifications (user_id, notification_type, title, body, data)
            VALUES (
                NEW.sender_id,
                'chat_request',
                'Chat request accepted',
                'Your chat request has been accepted.',
                jsonb_build_object(
                    'request_id', NEW.request_id,
                    'receiver_id', NEW.receiver_id,
                    'accepted_at', NOW()
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_accepted_request 
AFTER UPDATE ON chat_requests 
FOR EACH ROW 
EXECUTE FUNCTION create_conversation_on_accept();

-- ========== ROW LEVEL SECURITY (RLS) ==========
ALTER TABLE chat_requests ENABLE ROW LEVEL SECURITY;

-- Users can view requests they sent or received
CREATE POLICY "Users can view own requests" ON chat_requests
    FOR SELECT USING (
        sender_id::text = auth.uid()::text OR 
        receiver_id::text = auth.uid()::text
    );

-- Users can send requests
CREATE POLICY "Users can send requests" ON chat_requests
    FOR INSERT WITH CHECK (sender_id::text = auth.uid()::text);

-- Receivers can accept/reject requests sent to them
CREATE POLICY "Receivers can respond to requests" ON chat_requests
    FOR UPDATE USING (receiver_id::text = auth.uid()::text)
    WITH CHECK (receiver_id::text = auth.uid()::text);

-- Senders can cancel their pending requests
CREATE POLICY "Senders can cancel requests" ON chat_requests
    FOR DELETE USING (
        sender_id::text = auth.uid()::text 
        AND status = 'pending'
    );

-- ========== HELPER FUNCTIONS ==========

-- Function to send chat request (safe version)
CREATE OR REPLACE FUNCTION send_chat_request(
    p_sender_id UUID,
    p_receiver_id UUID,
    p_request_type VARCHAR DEFAULT 'normal',
    p_anonymous_identity_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
    v_blocked BOOLEAN;
    user_blocks_exists BOOLEAN;
    system_notifications_exists BOOLEAN;
BEGIN
    -- Check if user_blocks table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_blocks'
    ) INTO user_blocks_exists;
    
    IF user_blocks_exists THEN
        -- Check if blocked
        SELECT EXISTS (
            SELECT 1 FROM user_blocks 
            WHERE (blocker_id = p_receiver_id AND blocked_id = p_sender_id)
               OR (blocker_id = p_sender_id AND blocked_id = p_receiver_id)
        ) INTO v_blocked;
        
        IF v_blocked THEN
            RAISE EXCEPTION 'Cannot send request: user is blocked';
        END IF;
    END IF;
    
    -- Check if chat_conversations table exists and if already have conversation
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'chat_conversations'
    ) AND EXISTS (
        SELECT 1 FROM chat_conversations 
        WHERE (user1_id = LEAST(p_sender_id, p_receiver_id) 
               AND user2_id = GREATEST(p_sender_id, p_receiver_id))
        AND is_accepted = TRUE
    ) THEN
        RAISE EXCEPTION 'Already have an active conversation';
    END IF;
    
    -- Insert request
    INSERT INTO chat_requests (
        sender_id,
        receiver_id,
        request_type,
        anonymous_identity_id,
        status,
        expires_at
    ) VALUES (
        p_sender_id,
        p_receiver_id,
        p_request_type,
        p_anonymous_identity_id,
        'pending',
        NOW() + INTERVAL '24 hours'
    )
    ON CONFLICT (sender_id, receiver_id, request_type) 
    WHERE status = 'pending'
    DO UPDATE SET 
        anonymous_identity_id = EXCLUDED.anonymous_identity_id,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
    RETURNING request_id INTO v_request_id;
    
    -- Check if system_notifications table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'system_notifications'
    ) INTO system_notifications_exists;
    
    IF system_notifications_exists THEN
        -- Create notification for receiver
        INSERT INTO system_notifications (user_id, notification_type, title, body, data)
        VALUES (
            p_receiver_id,
            'chat_request',
            CASE 
                WHEN p_request_type = 'anonymous' THEN 'Anonymous chat request'
                ELSE 'New chat request'
            END,
            CASE 
                WHEN p_request_type = 'anonymous' THEN 'You have received an anonymous chat request'
                ELSE 'You have received a chat request'
            END,
            jsonb_build_object(
                'request_id', v_request_id,
                'sender_id', p_sender_id,
                'request_type', p_request_type,
                'received_at', NOW()
            )
        );
    END IF;
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for pending requests (safe version)
CREATE OR REPLACE FUNCTION get_pending_requests(p_user_id UUID)
RETURNS TABLE (
    request_id UUID,
    sender_id UUID,
    receiver_id UUID,
    request_type VARCHAR,
    anonymous_identity_id UUID,
    anonymous_display_gender VARCHAR,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
) AS $$
DECLARE
    anonymous_identities_exists BOOLEAN;
BEGIN
    -- Check if anonymous_identities table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'anonymous_identities'
    ) INTO anonymous_identities_exists;
    
    IF anonymous_identities_exists THEN
        RETURN QUERY
        SELECT 
            cr.request_id,
            cr.sender_id,
            cr.receiver_id,
            cr.request_type,
            cr.anonymous_identity_id,
            ai.display_gender,
            cr.created_at,
            cr.expires_at
        FROM chat_requests cr
        LEFT JOIN anonymous_identities ai ON cr.anonymous_identity_id = ai.identity_id
        WHERE cr.receiver_id = p_user_id
        AND cr.status = 'pending'
        ORDER BY cr.created_at DESC;
    ELSE
        RETURN QUERY
        SELECT 
            cr.request_id,
            cr.sender_id,
            cr.receiver_id,
            cr.request_type,
            cr.anonymous_identity_id,
            NULL::VARCHAR as display_gender,
            cr.created_at,
            cr.expires_at
        FROM chat_requests cr
        WHERE cr.receiver_id = p_user_id
        AND cr.status = 'pending'
        ORDER BY cr.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Fixed trigger: Create status records when a new message is created
CREATE OR REPLACE FUNCTION create_message_status_for_participants()
RETURNS TRIGGER AS $$
DECLARE
    v_other_user_id UUID;
BEGIN
    -- Personal conversation
    IF NEW.conversation_id IS NOT NULL THEN
        -- Get the other user in conversation
        SELECT 
            CASE 
                WHEN user1_id = NEW.sender_id THEN user2_id  -- Changed: NEW.sender_id
                ELSE user1_id
            END INTO v_other_user_id
        FROM chat_conversations 
        WHERE conversation_id = NEW.conversation_id;
        
        -- Create status for sender (sent)
        INSERT INTO message_status (message_id, user_id, status, delivered_at)
        VALUES (NEW.message_id, NEW.sender_id, 'sent', NOW())  -- Changed: NEW.sender_id
        ON CONFLICT (message_id, user_id) DO NOTHING;
        
        -- Create status for receiver (sent)
        IF v_other_user_id IS NOT NULL THEN
            INSERT INTO message_status (message_id, user_id, status)
            VALUES (NEW.message_id, v_other_user_id, 'sent')
            ON CONFLICT (message_id, user_id) DO NOTHING;
        END IF;
    
    -- Group conversation
    ELSIF NEW.group_id IS NOT NULL THEN
        -- Create status for sender (sent)
        INSERT INTO message_status (message_id, user_id, status, delivered_at)
        VALUES (NEW.message_id, NEW.sender_id, 'sent', NOW())  -- Changed: NEW.sender_id
        ON CONFLICT (message_id, user_id) DO NOTHING;
        
        -- Create status for all group members except sender
        INSERT INTO message_status (message_id, user_id, status)
        SELECT NEW.message_id, gm.user_id, 'sent'
        FROM group_members gm
        WHERE gm.group_id = NEW.group_id
        AND gm.user_id != NEW.sender_id  -- Changed: NEW.sender_id
        ON CONFLICT (message_id, user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_message_status ON chat_messages;

-- Recreate the trigger with fixed function
CREATE TRIGGER auto_create_message_status 
AFTER INSERT ON chat_messages 
FOR EACH ROW 
EXECUTE FUNCTION create_message_status_for_participants();


-- ========== Fixed Function: Create message status for participants ==========
CREATE OR REPLACE FUNCTION create_message_status_for_participants()
RETURNS TRIGGER AS $$
BEGIN
    -- Personal conversation
    IF NEW.conversation_id IS NOT NULL THEN
        -- Get the other user in conversation
        DECLARE
            v_other_user_id UUID;
        BEGIN
            SELECT 
                CASE 
                    WHEN user1_id = NEW.sender_id THEN user2_id
                    ELSE user1_id
                END INTO v_other_user_id
            FROM chat_conversations 
            WHERE conversation_id = NEW.conversation_id;
            
            -- Create status for sender (sent)
            INSERT INTO message_status (message_id, user_id, status, delivered_at)
            VALUES (NEW.message_id, NEW.sender_id, 'sent', NOW())
            ON CONFLICT (message_id, user_id) DO NOTHING;
            
            -- Create status for receiver (sent)
            IF v_other_user_id IS NOT NULL THEN
                INSERT INTO message_status (message_id, user_id, status)
                VALUES (NEW.message_id, v_other_user_id, 'sent')
                ON CONFLICT (message_id, user_id) DO NOTHING;
            END IF;
        END;
    
    -- Group conversation
    ELSIF NEW.group_id IS NOT NULL THEN
        -- Create status for sender (sent)
        INSERT INTO message_status (message_id, user_id, status, delivered_at)
        VALUES (NEW.message_id, NEW.sender_id, 'sent', NOW())
        ON CONFLICT (message_id, user_id) DO NOTHING;
        
        -- Create status for all group members except sender
        INSERT INTO message_status (message_id, user_id, status)
        SELECT NEW.message_id, gm.user_id, 'sent'
        FROM group_members gm
        WHERE gm.group_id = NEW.group_id
        AND gm.user_id != NEW.sender_id
        ON CONFLICT (message_id, user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS auto_create_message_status ON chat_messages;
CREATE TRIGGER auto_create_message_status 
AFTER INSERT ON chat_messages 
FOR EACH ROW 
EXECUTE FUNCTION create_message_status_for_participants();


-- ==================================================================================


-- Test message status trigger
INSERT INTO chat_messages (
    conversation_id,
    sender_id,
    encrypted_content,
    content_iv,
    content_auth_tag
)
SELECT 
    (SELECT conversation_id FROM chat_conversations LIMIT 1),
    (SELECT user_id FROM users WHERE roll_no = 'B23CS001'),
    'test_message',
    'iv123',
    'auth123'
RETURNING message_id;

-- Check auto-created status records
SELECT * FROM message_status 
WHERE message_id = (SELECT message_id FROM chat_messages LIMIT 1);

-- Test chat request
SELECT send_chat_request(
    (SELECT user_id FROM users WHERE roll_no = 'B23CS001'),
    (SELECT user_id FROM users WHERE roll_no = 'B23CS002'),
    'normal'
);

-- Check pending requests
SELECT * FROM get_pending_requests(
    (SELECT user_id FROM users WHERE roll_no = 'B23CS002')
);

-- Accept request
UPDATE chat_requests 
SET status = 'accepted'
WHERE receiver_id = (SELECT user_id FROM users WHERE roll_no = 'B23CS002')
AND status = 'pending';

-- Check created conversation
SELECT * FROM chat_conversations;


-- ===============================================================================
--                              WORKING MAIN-8
-- ===============================================================================

-- ========== POLLS TABLE ==========
CREATE TABLE IF NOT EXISTS polls (
    poll_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    
    poll_type VARCHAR(20) NOT NULL CHECK (poll_type IN (
        'kick_member', 'make_admin', 'remove_admin', 
        'change_group_name', 'object_removal'
    )),
    
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Voting stats
    votes_required INTEGER,
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    total_voters INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'passed', 'failed', 'cancelled', 'expired')),
    is_executed BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    executed_at TIMESTAMPTZ,
    
    -- For objection polls
    parent_poll_id UUID REFERENCES polls(poll_id) ON DELETE SET NULL,
    objection_reason TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_polls_group ON polls(group_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_polls_creator ON polls(created_by);
CREATE INDEX IF NOT EXISTS idx_polls_target ON polls(target_user_id);
CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status);
CREATE INDEX IF NOT EXISTS idx_polls_expires ON polls(expires_at);
CREATE INDEX IF NOT EXISTS idx_polls_type ON polls(poll_type);
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON polls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_parent ON polls(parent_poll_id);

-- Trigger for updated_at
CREATE TRIGGER update_polls_updated_at 
BEFORE UPDATE ON polls 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== VOTES TABLE ==========
CREATE TABLE IF NOT EXISTS votes (
    vote_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID NOT NULL REFERENCES polls(poll_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    anonymous_identity_id UUID,  -- Will add reference later
    vote_value BOOLEAN NOT NULL,  -- TRUE = for, FALSE = against
    voted_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- User can vote once per poll (either directly or anonymously)
    CONSTRAINT check_vote_source CHECK (
        (user_id IS NOT NULL AND anonymous_identity_id IS NULL) OR
        (user_id IS NULL AND anonymous_identity_id IS NOT NULL)
    )
);

-- Add partial unique indexes for the constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_vote_user 
ON votes(poll_id, user_id) 
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_vote_anonymous 
ON votes(poll_id, anonymous_identity_id) 
WHERE anonymous_identity_id IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_votes_poll ON votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_anonymous ON votes(anonymous_identity_id);
CREATE INDEX IF NOT EXISTS idx_votes_value ON votes(vote_value);
CREATE INDEX IF NOT EXISTS idx_votes_voted_at ON votes(voted_at DESC);

-- Single combined trigger for poll lifecycle management
CREATE OR REPLACE FUNCTION manage_poll_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
    v_system_notifications_exists BOOLEAN;
    v_group_bans_exists BOOLEAN;
BEGIN
    -- Check for expired polls
    IF NEW.status = 'active' AND NEW.expires_at <= NOW() THEN
        NEW.status := 'expired';
        NEW.updated_at := NOW();
    END IF;
    
    -- Execute passed polls
    IF NEW.status = 'passed' AND OLD.status != 'passed' AND NEW.is_executed = FALSE THEN
        -- Execute based on poll type
        CASE NEW.poll_type
            WHEN 'kick_member' THEN
                -- Remove user from group
                DELETE FROM group_members 
                WHERE group_id = NEW.group_id 
                AND user_id = NEW.target_user_id;
                
                -- Add to bans table if exists
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'group_bans'
                ) INTO v_group_bans_exists;
                
                IF v_group_bans_exists THEN
                    INSERT INTO group_bans (group_id, user_id, banned_by, reason)
                    VALUES (NEW.group_id, NEW.target_user_id, NEW.created_by, 
                           'Removed by poll vote: ' || COALESCE(NEW.description, 'No reason provided'));
                END IF;
            
            WHEN 'make_admin' THEN
                -- Make user admin
                UPDATE group_members 
                SET is_admin = TRUE,
                    can_add_members = TRUE,
                    can_remove_members = TRUE,
                    can_edit_group = TRUE
                WHERE group_id = NEW.group_id 
                AND user_id = NEW.target_user_id;
            
            WHEN 'remove_admin' THEN
                -- Remove admin privileges
                UPDATE group_members 
                SET is_admin = FALSE,
                    can_add_members = FALSE,
                    can_remove_members = FALSE,
                    can_edit_group = FALSE
                WHERE group_id = NEW.group_id 
                AND user_id = NEW.target_user_id;
            
            WHEN 'object_removal' THEN
                -- Re-add user if they were removed
                INSERT INTO group_members (group_id, user_id, joined_at)
                VALUES (NEW.group_id, NEW.target_user_id, NOW())
                ON CONFLICT (group_id, user_id) 
                DO UPDATE SET 
                    is_admin = FALSE,
                    joined_at = NOW();
            
            -- Add more cases as needed
        END CASE;
        
        -- Mark as executed
        NEW.is_executed := TRUE;
        NEW.executed_at := NOW();
        
        -- Check if system_notifications exists
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'system_notifications'
        ) INTO v_system_notifications_exists;
        
        IF v_system_notifications_exists AND NEW.target_user_id IS NOT NULL THEN
            -- Create notification for affected user
            INSERT INTO system_notifications (user_id, notification_type, title, body, data)
            VALUES (
                NEW.target_user_id,
                'vote_result',
                'Poll Result: ' || NEW.title,
                CASE NEW.poll_type
                    WHEN 'kick_member' THEN 'You have been removed from the group by poll vote.'
                    WHEN 'make_admin' THEN 'You have been promoted to admin by poll vote.'
                    WHEN 'remove_admin' THEN 'Your admin privileges have been removed by poll vote.'
                    WHEN 'object_removal' THEN 'Your objection was successful. You have been re-added to the group.'
                    ELSE 'A poll affecting you has been completed.'
                END,
                jsonb_build_object(
                    'poll_id', NEW.poll_id,
                    'group_id', NEW.group_id,
                    'poll_type', NEW.poll_type,
                    'result', 'passed',
                    'executed_at', NOW()
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_poll_expiration ON polls;
DROP TRIGGER IF EXISTS trigger_execute_polls ON polls;

CREATE TRIGGER trigger_manage_poll_lifecycle 
BEFORE UPDATE ON polls 
FOR EACH ROW 
EXECUTE FUNCTION manage_poll_lifecycle();

-- Trigger to update poll stats after vote
CREATE OR REPLACE FUNCTION update_poll_stats_after_vote()
RETURNS TRIGGER AS $$
DECLARE
    v_votes_for INTEGER;
    v_votes_against INTEGER;
    v_total_voters INTEGER;
    v_votes_required INTEGER;
BEGIN
    -- Calculate new stats
    SELECT 
        COUNT(CASE WHEN vote_value = TRUE THEN 1 END),
        COUNT(CASE WHEN vote_value = FALSE THEN 1 END),
        COUNT(*)
    INTO v_votes_for, v_votes_against, v_total_voters
    FROM votes
    WHERE poll_id = COALESCE(NEW.poll_id, OLD.poll_id);
    
    -- Get required votes
    SELECT votes_required INTO v_votes_required
    FROM polls WHERE poll_id = COALESCE(NEW.poll_id, OLD.poll_id);
    
    -- Update poll stats
    UPDATE polls 
    SET 
        votes_for = v_votes_for,
        votes_against = v_votes_against,
        total_voters = v_total_voters,
        status = CASE 
            WHEN v_votes_for >= v_votes_required THEN 'passed'
            WHEN v_votes_against >= v_votes_required THEN 'failed'
            ELSE 'active'
        END,
        updated_at = NOW()
    WHERE poll_id = COALESCE(NEW.poll_id, OLD.poll_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_poll_stats 
AFTER INSERT OR UPDATE OR DELETE ON votes 
FOR EACH ROW 
EXECUTE FUNCTION update_poll_stats_after_vote();

-- ========== ROW LEVEL SECURITY (RLS) ==========
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

-- Group members can view polls in their groups
CREATE POLICY "Group members can view polls" ON polls
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM group_members 
            WHERE user_id::text = auth.uid()::text
        )
    );

-- Group members can create polls (with restrictions)
CREATE POLICY "Group members can create polls" ON polls
    FOR INSERT WITH CHECK (
        group_id IN (
            SELECT gm.group_id FROM group_members gm
            WHERE gm.user_id::text = auth.uid()::text
            AND gm.is_admin = TRUE  -- Only admins can create polls
        )
    );

-- Poll creators can update their polls (if active)
CREATE POLICY "Creators can update own polls" ON polls
    FOR UPDATE USING (
        created_by::text = auth.uid()::text
        AND status = 'active'
    );

-- Admins can cancel polls in their groups
CREATE POLICY "Admins can cancel polls" ON polls
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = polls.group_id
            AND gm.user_id::text = auth.uid()::text
            AND gm.is_admin = TRUE
        )
    );

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Group members can view votes in their group's polls
CREATE POLICY "Group members can view votes" ON votes
    FOR SELECT USING (
        poll_id IN (
            SELECT p.poll_id FROM polls p
            JOIN group_members gm ON p.group_id = gm.group_id
            WHERE gm.user_id::text = auth.uid()::text
        )
    );

-- Group members can vote in polls (once per poll)
CREATE POLICY "Group members can vote" ON votes
    FOR INSERT WITH CHECK (
        poll_id IN (
            SELECT p.poll_id FROM polls p
            JOIN group_members gm ON p.group_id = gm.group_id
            WHERE gm.user_id::text = auth.uid()::text
            AND p.status = 'active'
        )
        AND (user_id::text = auth.uid()::text OR anonymous_identity_id IS NOT NULL)
    );

-- Users can only delete their own votes (if poll is still active)
CREATE POLICY "Users can delete own votes" ON votes
    FOR DELETE USING (
        user_id::text = auth.uid()::text
        AND poll_id IN (
            SELECT poll_id FROM polls 
            WHERE status = 'active'
        )
    );

-- ========== HELPER FUNCTIONS ==========

-- Function to create a poll (safe version)
CREATE OR REPLACE FUNCTION create_poll(
    p_group_id UUID,
    p_created_by UUID,
    p_target_user_id UUID,
    p_poll_type VARCHAR,
    p_title VARCHAR,
    p_description TEXT DEFAULT NULL,
    p_duration_hours INTEGER DEFAULT 6
)
RETURNS UUID AS $$
DECLARE
    v_poll_id UUID;
    v_group_members INTEGER;
    v_is_admin BOOLEAN;
    v_target_is_member BOOLEAN;
    v_system_notifications_exists BOOLEAN;
BEGIN
    -- Check if creator is admin
    SELECT EXISTS (
        SELECT 1 FROM group_members 
        WHERE group_id = p_group_id 
        AND user_id = p_created_by
        AND is_admin = TRUE
    ) INTO v_is_admin;
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Only admins can create polls';
    END IF;
    
    -- Check if target is group member (for member-related polls)
    IF p_poll_type IN ('kick_member', 'make_admin', 'remove_admin', 'object_removal') THEN
        SELECT EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = p_group_id 
            AND user_id = p_target_user_id
        ) INTO v_target_is_member;
        
        IF NOT v_target_is_member THEN
            RAISE EXCEPTION 'Target user is not a group member';
        END IF;
    END IF;
    
    -- Get total group members for votes required
    SELECT COUNT(*) INTO v_group_members
    FROM group_members 
    WHERE group_id = p_group_id;
    
    -- Create poll (votes required = majority)
    INSERT INTO polls (
        group_id,
        created_by,
        target_user_id,
        poll_type,
        title,
        description,
        votes_required,
        expires_at
    ) VALUES (
        p_group_id,
        p_created_by,
        p_target_user_id,
        p_poll_type,
        p_title,
        p_description,
        CEIL(v_group_members / 2.0),  -- Simple majority
        NOW() + (p_duration_hours || ' hours')::INTERVAL
    )
    RETURNING poll_id INTO v_poll_id;
    
    -- Check if system_notifications exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'system_notifications'
    ) INTO v_system_notifications_exists;
    
    IF v_system_notifications_exists THEN
        -- Create notifications for all group members
        INSERT INTO system_notifications (user_id, notification_type, title, body, data)
        SELECT 
            gm.user_id,
            'poll_created',
            'New Poll: ' || p_title,
            CASE 
                WHEN gm.user_id = p_target_user_id THEN 'A poll has been created about you in the group.'
                ELSE 'A new poll has been created in the group.'
            END,
            jsonb_build_object(
                'poll_id', v_poll_id,
                'group_id', p_group_id,
                'poll_type', p_poll_type,
                'created_by', p_created_by,
                'target_user_id', p_target_user_id,
                'expires_at', NOW() + (p_duration_hours || ' hours')::INTERVAL
            )
        FROM group_members gm
        WHERE gm.group_id = p_group_id
        AND gm.user_id != p_created_by;  -- Don't notify creator
    END IF;
    
    RETURN v_poll_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active polls for group (safe version)
CREATE OR REPLACE FUNCTION get_active_polls(p_group_id UUID)
RETURNS TABLE (
    poll_id UUID,
    created_by UUID,
    target_user_id UUID,
    poll_type VARCHAR,
    title VARCHAR,
    description TEXT,
    votes_for INTEGER,
    votes_against INTEGER,
    total_voters INTEGER,
    votes_required INTEGER,
    status VARCHAR,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    time_remaining INTERVAL,
    creator_name VARCHAR,
    target_name VARCHAR,
    has_voted BOOLEAN
) AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid()::UUID;
    
    RETURN QUERY
    SELECT 
        p.poll_id,
        p.created_by,
        p.target_user_id,
        p.poll_type,
        p.title,
        p.description,
        p.votes_for,
        p.votes_against,
        p.total_voters,
        p.votes_required,
        p.status,
        p.created_at,
        p.expires_at,
        p.expires_at - NOW() as time_remaining,
        uc.name as creator_name,
        ut.name as target_name,
        EXISTS (
            SELECT 1 FROM votes v 
            WHERE v.poll_id = p.poll_id 
            AND (v.user_id = current_user_id OR v.anonymous_identity_id IN (
                SELECT identity_id FROM anonymous_identities 
                WHERE user_id = current_user_id AND group_id = p.group_id
            ))
        ) as has_voted
    FROM polls p
    JOIN users uc ON p.created_by = uc.user_id
    LEFT JOIN users ut ON p.target_user_id = ut.user_id
    WHERE p.group_id = p_group_id
    AND p.status = 'active'
    ORDER BY p.expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cast a vote (safe version)
CREATE OR REPLACE FUNCTION cast_vote(
    p_poll_id UUID,
    p_user_id UUID,
    p_vote_value BOOLEAN,
    p_anonymous_identity_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_vote_id UUID;
    v_poll_status VARCHAR;
    v_is_group_member BOOLEAN;
    v_anonymous_owner UUID;
    v_anonymous_identities_exists BOOLEAN;
BEGIN
    -- Check poll status
    SELECT status INTO v_poll_status
    FROM polls WHERE poll_id = p_poll_id;
    
    IF v_poll_status != 'active' THEN
        RAISE EXCEPTION 'Cannot vote on inactive poll';
    END IF;
    
    -- Check if voting anonymously
    IF p_anonymous_identity_id IS NOT NULL THEN
        -- Check if anonymous_identities table exists
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'anonymous_identities'
        ) INTO v_anonymous_identities_exists;
        
        IF v_anonymous_identities_exists THEN
            -- Verify anonymous identity belongs to user
            SELECT user_id INTO v_anonymous_owner
            FROM anonymous_identities 
            WHERE identity_id = p_anonymous_identity_id;
            
            IF v_anonymous_owner != p_user_id THEN
                RAISE EXCEPTION 'Anonymous identity does not belong to user';
            END IF;
            
            -- Check if user is group member (using anonymous identity's group)
            SELECT EXISTS (
                SELECT 1 FROM polls p
                JOIN group_members gm ON p.group_id = gm.group_id
                JOIN anonymous_identities ai ON gm.group_id = ai.group_id
                WHERE p.poll_id = p_poll_id
                AND ai.identity_id = p_anonymous_identity_id
                AND ai.user_id = p_user_id
            ) INTO v_is_group_member;
        ELSE
            RAISE EXCEPTION 'Cannot vote anonymously: anonymous identities not available';
        END IF;
    ELSE
        -- Check if user is group member
        SELECT EXISTS (
            SELECT 1 FROM polls p
            JOIN group_members gm ON p.group_id = gm.group_id
            WHERE p.poll_id = p_poll_id
            AND gm.user_id = p_user_id
        ) INTO v_is_group_member;
    END IF;
    
    IF NOT v_is_group_member THEN
        RAISE EXCEPTION 'User is not a member of the group';
    END IF;
    
    -- Cast vote
    INSERT INTO votes (poll_id, user_id, anonymous_identity_id, vote_value)
    VALUES (p_poll_id, 
            CASE WHEN p_anonymous_identity_id IS NULL THEN p_user_id ELSE NULL END,
            p_anonymous_identity_id,
            p_vote_value)
    ON CONFLICT (poll_id, COALESCE(user_id, anonymous_identity_id)) 
    DO UPDATE SET 
        vote_value = EXCLUDED.vote_value,
        voted_at = NOW()
    RETURNING vote_id INTO v_vote_id;
    
    RETURN v_vote_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get poll results with voter details (safe version)
CREATE OR REPLACE FUNCTION get_poll_results(p_poll_id UUID)
RETURNS TABLE (
    vote_id UUID,
    voter_type VARCHAR,
    voter_id UUID,
    voter_name VARCHAR,
    vote_value BOOLEAN,
    voted_at TIMESTAMPTZ,
    is_anonymous BOOLEAN,
    anonymous_display_name VARCHAR,
    anonymous_display_gender VARCHAR
) AS $$
DECLARE
    v_anonymous_identities_exists BOOLEAN;
BEGIN
    -- Check if anonymous_identities table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'anonymous_identities'
    ) INTO v_anonymous_identities_exists;
    
    IF v_anonymous_identities_exists THEN
        RETURN QUERY
        SELECT 
            v.vote_id,
            CASE 
                WHEN v.user_id IS NOT NULL THEN 'user'
                WHEN v.anonymous_identity_id IS NOT NULL THEN 'anonymous'
                ELSE 'unknown'
            END as voter_type,
            COALESCE(v.user_id, ai.user_id) as voter_id,
            u.name as voter_name,
            v.vote_value,
            v.voted_at,
            v.anonymous_identity_id IS NOT NULL as is_anonymous,
            gm.anonymous_display_name,
            ai.display_gender
        FROM votes v
        LEFT JOIN users u ON v.user_id = u.user_id
        LEFT JOIN anonymous_identities ai ON v.anonymous_identity_id = ai.identity_id
        LEFT JOIN group_members gm ON ai.user_id = gm.user_id 
            AND EXISTS (
                SELECT 1 FROM polls p 
                WHERE p.poll_id = v.poll_id 
                AND p.group_id = gm.group_id
            )
        WHERE v.poll_id = p_poll_id
        ORDER BY v.voted_at DESC;
    ELSE
        RETURN QUERY
        SELECT 
            v.vote_id,
            'user' as voter_type,
            v.user_id as voter_id,
            u.name as voter_name,
            v.vote_value,
            v.voted_at,
            FALSE as is_anonymous,
            NULL::VARCHAR as anonymous_display_name,
            NULL::VARCHAR as anonymous_display_gender
        FROM votes v
        JOIN users u ON v.user_id = u.user_id
        WHERE v.poll_id = p_poll_id
        ORDER BY v.voted_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -- ===============================================================================
-- --                              WORKING MAIN-9
-- -- ===============================================================================

-- ========== MEDIA_UPLOADS TABLE ==========
CREATE TABLE IF NOT EXISTS media_uploads (
    media_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES chat_conversations(conversation_id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
    message_id UUID REFERENCES chat_messages(message_id) ON DELETE SET NULL,
    
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
    expires_at TIMESTAMPTZ,
    
    -- Status
    upload_status VARCHAR(20) DEFAULT 'uploading' CHECK (upload_status IN ('uploading', 'completed', 'failed', 'deleted')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Fixed constraint: If conversation or group is specified, message must also be specified
    CONSTRAINT chk_media_context CHECK (
        (conversation_id IS NOT NULL AND group_id IS NULL) OR
        (conversation_id IS NULL AND group_id IS NOT NULL) OR
        (conversation_id IS NULL AND group_id IS NULL)
    ),
    
    -- Fixed constraint: Message required for chat media
    CONSTRAINT chk_message_required CHECK (
        (conversation_id IS NULL AND group_id IS NULL) OR 
        (message_id IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_uploads_user ON media_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_message ON media_uploads(message_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_conversation ON media_uploads(conversation_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_group ON media_uploads(group_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_status ON media_uploads(upload_status);
CREATE INDEX IF NOT EXISTS idx_media_uploads_created ON media_uploads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_uploads_expires ON media_uploads(expires_at);
CREATE INDEX IF NOT EXISTS idx_media_uploads_bucket ON media_uploads(storage_bucket, storage_path);

-- Trigger for updated_at
CREATE TRIGGER update_media_uploads_updated_at 
BEFORE UPDATE ON media_uploads 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-delete expired media
CREATE OR REPLACE FUNCTION delete_expired_media()
RETURNS TRIGGER AS $$
BEGIN
    -- Soft delete expired media
    UPDATE media_uploads 
    SET upload_status = 'deleted',
        updated_at = NOW(),
        access_url = NULL,
        thumbnail_url = NULL
    WHERE upload_status IN ('uploading', 'completed')
    AND expires_at <= NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_expired_media 
BEFORE INSERT OR UPDATE ON media_uploads 
FOR EACH ROW 
EXECUTE FUNCTION delete_expired_media();

-- Trigger to validate file size (max 5MB)
CREATE OR REPLACE FUNCTION validate_file_size()
RETURNS TRIGGER AS $$
BEGIN
    -- Max 5MB (5 * 1024 * 1024 = 5242880 bytes)
    IF NEW.file_size > 5242880 THEN
        RAISE EXCEPTION 'File size exceeds 5MB limit';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_file_size 
BEFORE INSERT OR UPDATE ON media_uploads 
FOR EACH ROW 
EXECUTE FUNCTION validate_file_size();

-- ========== ROW LEVEL SECURITY (RLS) ==========
ALTER TABLE media_uploads ENABLE ROW LEVEL SECURITY;

-- Users can view their own media
CREATE POLICY "Users can view own media" ON media_uploads
    FOR SELECT USING (user_id::text = auth.uid()::text);

-- Conversation participants can view media in their conversations
CREATE POLICY "Conversation participants can view media" ON media_uploads
    FOR SELECT USING (
        conversation_id IN (
            SELECT conversation_id FROM chat_conversations 
            WHERE user1_id::text = auth.uid()::text 
            OR user2_id::text = auth.uid()::text
        )
    );

-- Group members can view media in their groups
CREATE POLICY "Group members can view media" ON media_uploads
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM group_members 
            WHERE user_id::text = auth.uid()::text
        )
    );

-- Users can upload media (must be owner)
CREATE POLICY "Users can upload media" ON media_uploads
    FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- Users can update their own media (status, etc.)
CREATE POLICY "Users can update own media" ON media_uploads
    FOR UPDATE USING (user_id::text = auth.uid()::text)
    WITH CHECK (user_id::text = auth.uid()::text);

-- Users can delete their own media
CREATE POLICY "Users can delete own media" ON media_uploads
    FOR DELETE USING (user_id::text = auth.uid()::text);

-- Group admins can delete any media in their group
CREATE POLICY "Admins can delete group media" ON media_uploads
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = media_uploads.group_id
            AND gm.user_id::text = auth.uid()::text
            AND (gm.is_admin = TRUE OR gm.is_owner = TRUE)
        )
    );

-- ========== HELPER FUNCTIONS ==========
CREATE OR REPLACE FUNCTION create_media_upload( 
  p_user_id UUID, 
  p_file_name VARCHAR, 
  p_file_type VARCHAR, 
  p_file_size BIGINT, 
  p_conversation_id UUID DEFAULT NULL, 
  p_group_id UUID DEFAULT NULL, 
  p_message_id UUID DEFAULT NULL, 
  p_storage_path TEXT DEFAULT NULL, 
  p_mime_type VARCHAR DEFAULT NULL, 
  p_file_key_encrypted TEXT DEFAULT NULL, 
  p_file_key_iv VARCHAR DEFAULT NULL 
  )


RETURNS UUID AS $$
DECLARE
    v_media_id UUID;
    v_can_upload BOOLEAN;
    v_context_valid BOOLEAN;
    v_group_bans_exists BOOLEAN;
BEGIN
    
    -- Validate required parameters
    IF p_user_id IS NULL OR p_file_name IS NULL OR p_file_type IS NULL OR p_file_size IS NULL THEN
        RAISE EXCEPTION 'Required parameters missing: user_id, file_name, file_type, file_size';
    END IF;

    -- Validate context
    IF p_conversation_id IS NOT NULL THEN
        -- Check if conversation exists
        IF NOT EXISTS (
            SELECT 1 FROM chat_conversations 
            WHERE conversation_id = p_conversation_id
        ) THEN
            RAISE EXCEPTION 'Conversation does not exist';
        END IF;
        
        -- Check if user is part of conversation
        SELECT EXISTS (
            SELECT 1 FROM chat_conversations 
            WHERE conversation_id = p_conversation_id
            AND (user1_id = p_user_id OR user2_id = p_user_id)
        ) INTO v_can_upload;
        
        v_context_valid := TRUE;
    ELSIF p_group_id IS NOT NULL THEN
        -- Check if group exists
        IF NOT EXISTS (SELECT 1 FROM groups WHERE group_id = p_group_id) THEN
            RAISE EXCEPTION 'Group does not exist';
        END IF;
        
        -- Check if group_bans table exists
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'group_bans'
        ) INTO v_group_bans_exists;
        
        -- Check if user is group member with send permissions
        SELECT EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = p_group_id
            AND user_id = p_user_id
            AND can_send_messages = TRUE
            AND NOT (
                v_group_bans_exists AND EXISTS (
                    SELECT 1 FROM group_bans 
                    WHERE group_id = p_group_id
                    AND user_id = p_user_id
                    AND (expires_at IS NULL OR expires_at > NOW())
                )
            )
        ) INTO v_can_upload;
        
        v_context_valid := TRUE;
    ELSE
        -- Profile picture or other non-chat media
        v_can_upload := TRUE;
        v_context_valid := TRUE;
    END IF;
    
    IF NOT v_context_valid THEN
        RAISE EXCEPTION 'Invalid media context';
    END IF;
    
    IF NOT v_can_upload THEN
        RAISE EXCEPTION 'User cannot upload media in this context';
    END IF;

    -- Validate storage_path
    IF p_storage_path IS NULL THEN
        RAISE EXCEPTION 'Storage path is required';
    END IF;
    
    -- Create media upload record
    INSERT INTO media_uploads (
        user_id,
        conversation_id,
        group_id,
        message_id,
        file_name,
        file_type,
        file_size,
        mime_type,
        storage_path,
        file_key_encrypted,
        file_key_iv,
        upload_status
    ) VALUES (
        p_user_id,
        p_conversation_id,
        p_group_id,
        p_message_id,
        p_file_name,
        p_file_type,
        p_file_size,
        p_mime_type,
        p_storage_path,
        p_file_key_encrypted,
        p_file_key_iv,
        'uploading'
    )
    RETURNING media_id INTO v_media_id;
    
    RETURN v_media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete media upload
CREATE OR REPLACE FUNCTION complete_media_upload(
    p_media_id UUID,
    p_access_url TEXT,
    p_thumbnail_url TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE media_uploads 
    SET upload_status = 'completed',
        access_url = p_access_url,
        thumbnail_url = p_thumbnail_url,
        updated_at = NOW()
    WHERE media_id = p_media_id
    AND upload_status = 'uploading';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Media not found or not in uploading status';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get media for conversation (safe version)
CREATE OR REPLACE FUNCTION get_conversation_media(
    p_conversation_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    media_id UUID,
    message_id UUID,
    file_name VARCHAR,
    file_type VARCHAR,
    file_size BIGINT,
    mime_type VARCHAR,
    thumbnail_url TEXT,
    access_url TEXT,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    sender_id UUID,
    is_anonymous BOOLEAN,
    anonymous_display_gender VARCHAR
) AS $$
DECLARE
    v_anonymous_identities_exists BOOLEAN;
BEGIN
    -- Check if anonymous_identities table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'anonymous_identities'
    ) INTO v_anonymous_identities_exists;
    
    IF v_anonymous_identities_exists THEN
        RETURN QUERY
        SELECT 
            mu.media_id,
            mu.message_id,
            mu.file_name,
            mu.file_type,
            mu.file_size,
            mu.mime_type,
            mu.thumbnail_url,
            mu.access_url,
            mu.created_at,
            mu.expires_at,
            cm.sender_id,
            cm.is_anonymous,
            ai.display_gender
        FROM media_uploads mu
        JOIN chat_messages cm ON mu.message_id = cm.message_id
        LEFT JOIN anonymous_identities ai ON cm.anonymous_identity_id = ai.identity_id
        WHERE mu.conversation_id = p_conversation_id
        AND mu.upload_status = 'completed'
        AND mu.expires_at > NOW()
        ORDER BY mu.created_at DESC
        LIMIT p_limit
        OFFSET p_offset;
    ELSE
        RETURN QUERY
        SELECT 
            mu.media_id,
            mu.message_id,
            mu.file_name,
            mu.file_type,
            mu.file_size,
            mu.mime_type,
            mu.thumbnail_url,
            mu.access_url,
            mu.created_at,
            mu.expires_at,
            cm.sender_id,
            cm.is_anonymous,
            NULL::VARCHAR as display_gender
        FROM media_uploads mu
        JOIN chat_messages cm ON mu.message_id = cm.message_id
        WHERE mu.conversation_id = p_conversation_id
        AND mu.upload_status = 'completed'
        AND mu.expires_at > NOW()
        ORDER BY mu.created_at DESC
        LIMIT p_limit
        OFFSET p_offset;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get media for group (safe version)
CREATE OR REPLACE FUNCTION get_group_media(
    p_group_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    media_id UUID,
    message_id UUID,
    file_name VARCHAR,
    file_type VARCHAR,
    file_size BIGINT,
    mime_type VARCHAR,
    thumbnail_url TEXT,
    access_url TEXT,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    sender_id UUID,
    is_anonymous BOOLEAN,
    anonymous_display_name VARCHAR,
    anonymous_display_gender VARCHAR
) AS $$
DECLARE
    v_anonymous_identities_exists BOOLEAN;
BEGIN
    -- Check if anonymous_identities table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'anonymous_identities'
    ) INTO v_anonymous_identities_exists;
    
    IF v_anonymous_identities_exists THEN
        RETURN QUERY
        SELECT 
            mu.media_id,
            mu.message_id,
            mu.file_name,
            mu.file_type,
            mu.file_size,
            mu.mime_type,
            mu.thumbnail_url,
            mu.access_url,
            mu.created_at,
            mu.expires_at,
            cm.sender_id,
            cm.is_anonymous,
            gm.anonymous_display_name,
            ai.display_gender
        FROM media_uploads mu
        JOIN chat_messages cm ON mu.message_id = cm.message_id
        LEFT JOIN anonymous_identities ai ON cm.anonymous_identity_id = ai.identity_id
        LEFT JOIN group_members gm ON cm.sender_id = gm.user_id 
            AND gm.group_id = p_group_id
        WHERE mu.group_id = p_group_id
        AND mu.upload_status = 'completed'
        AND mu.expires_at > NOW()
        ORDER BY mu.created_at DESC
        LIMIT p_limit
        OFFSET p_offset;
    ELSE
        RETURN QUERY
        SELECT 
            mu.media_id,
            mu.message_id,
            mu.file_name,
            mu.file_type,
            mu.file_size,
            mu.mime_type,
            mu.thumbnail_url,
            mu.access_url,
            mu.created_at,
            mu.expires_at,
            cm.sender_id,
            cm.is_anonymous,
            gm.anonymous_display_name,
            NULL::VARCHAR as display_gender
        FROM media_uploads mu
        JOIN chat_messages cm ON mu.message_id = cm.message_id
        LEFT JOIN group_members gm ON cm.sender_id = gm.user_id 
            AND gm.group_id = p_group_id
        WHERE mu.group_id = p_group_id
        AND mu.upload_status = 'completed'
        AND mu.expires_at > NOW()
        ORDER BY mu.created_at DESC
        LIMIT p_limit
        OFFSET p_offset;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's media
CREATE OR REPLACE FUNCTION get_user_media(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    media_id UUID,
    conversation_id UUID,
    group_id UUID,
    file_name VARCHAR,
    file_type VARCHAR,
    file_size BIGINT,
    mime_type VARCHAR,
    thumbnail_url TEXT,
    access_url TEXT,
    upload_status VARCHAR,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mu.media_id,
        mu.conversation_id,
        mu.group_id,
        mu.file_name,
        mu.file_type,
        mu.file_size,
        mu.mime_type,
        mu.thumbnail_url,
        mu.access_url,
        mu.upload_status,
        mu.created_at,
        mu.expires_at
    FROM media_uploads mu
    WHERE mu.user_id = p_user_id
    AND mu.upload_status IN ('uploading', 'completed')
    ORDER BY mu.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate signed URL (safe version)
CREATE OR REPLACE FUNCTION generate_signed_url(
    p_media_id UUID,
    p_user_id UUID,
    p_expires_in_minutes INTEGER DEFAULT 60
)
RETURNS TEXT AS $$
DECLARE
    v_media RECORD;
    v_can_access BOOLEAN;
BEGIN
    -- Get media details
    SELECT * INTO v_media
    FROM media_uploads 
    WHERE media_id = p_media_id
    AND upload_status = 'completed'
    AND (expires_at IS NULL OR expires_at > NOW());
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Check access permissions
    v_can_access := FALSE;
    
    IF v_media.user_id = p_user_id THEN
        v_can_access := TRUE;
    ELSIF v_media.conversation_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM chat_conversations 
            WHERE conversation_id = v_media.conversation_id
            AND (user1_id = p_user_id OR user2_id = p_user_id)
        ) INTO v_can_access;
    ELSIF v_media.group_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = v_media.group_id
            AND user_id = p_user_id
        ) INTO v_can_access;
    END IF;
    
    IF NOT v_can_access THEN
        RETURN NULL;
    END IF;
    
    -- In production, integrate with S3/Cloudinary signed URL generation
    -- For now, return the access_url if it exists
    RETURN v_media.access_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==================================================================================

-- Test creating media upload for conversation
SELECT create_media_upload(
    (SELECT user_id FROM users WHERE roll_no = 'B23CS001'), -- p_user_id
    'test_image.jpg',                                      -- p_file_name
    'image',                                               -- p_file_type
    1048576,                                               -- p_file_size
    (SELECT conversation_id FROM chat_conversations LIMIT 1), -- p_conversation_id
    NULL,                                                  -- p_group_id
    (SELECT message_id FROM chat_messages LIMIT 1),        -- p_message_id
    'conversations/chat123/test_image.jpg',                -- p_storage_path
    'image/jpeg',                                          -- p_mime_type
    'encrypted_key_here',                                  -- p_file_key_encrypted
    'iv_here'                                              -- p_file_key_iv
);

-- Complete the upload
SELECT complete_media_upload(
    (SELECT media_id FROM media_uploads LIMIT 1),
    'https://storage.example.com/test_image.jpg',
    'https://storage.example.com/test_image_thumb.jpg'
);

-- Get conversation media
SELECT * FROM get_conversation_media(
    (SELECT conversation_id FROM chat_conversations LIMIT 1),
    10, 0
);

-- Get user media
SELECT * FROM get_user_media(
    (SELECT user_id FROM users WHERE roll_no = 'B23CS001'),
    10, 0
);

-- Generate signed URL
SELECT generate_signed_url(
    (SELECT media_id FROM media_uploads LIMIT 1),
    (SELECT user_id FROM users WHERE roll_no = 'B23CS002')
);

-- -- ===============================================================================
-- --                              WORKING MAIN-10
-- -- ===============================================================================


-- ========== AUDIT_LOGS TABLE ==========
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    
    -- Before/after state (JSON)
    old_values JSONB,
    new_values JSONB,
    
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_logs_json_old ON audit_logs USING gin(old_values);
CREATE INDEX IF NOT EXISTS idx_audit_logs_json_new ON audit_logs USING gin(new_values);

-- ========== ROW LEVEL SECURITY (RLS) ==========
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins/system can view audit logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (false);  -- Restrict all, manage via backend

-- System can insert audit logs (via triggers/backend)
CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- No updates or deletions allowed
CREATE POLICY "No updates to audit logs" ON audit_logs
    FOR UPDATE USING (false);

CREATE POLICY "No deletions from audit logs" ON audit_logs
    FOR DELETE USING (false);

-- ========== AUDIT TRIGGERS ==========

-- Function to log user actions
CREATE OR REPLACE FUNCTION log_user_action()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action_type,
        entity_type,
        entity_id,
        old_values,
        new_values
    ) VALUES (
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.user_id
            ELSE COALESCE(NEW.user_id, OLD.user_id)
        END,
        TG_OP,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.user_id
            ELSE COALESCE(NEW.user_id, OLD.user_id)
        END,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to key tables
CREATE TRIGGER audit_users 
AFTER INSERT OR UPDATE OR DELETE ON users 
FOR EACH ROW EXECUTE FUNCTION log_user_action();

CREATE TRIGGER audit_groups 
AFTER INSERT OR UPDATE OR DELETE ON groups 
FOR EACH ROW EXECUTE FUNCTION log_user_action();

-- ========== HELPER FUNCTIONS ==========

-- Function to log custom audit event
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_action_type VARCHAR,
    p_entity_type VARCHAR DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action_type,
        entity_type,
        entity_id,
        old_values,
        new_values,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_action_type,
        p_entity_type,
        p_entity_id,
        p_old_values,
        p_new_values,
        p_ip_address,
        p_user_agent
    )
    RETURNING log_id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get audit logs (admin only)
CREATE OR REPLACE FUNCTION get_audit_logs(
    p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMPTZ DEFAULT NOW(),
    p_user_id UUID DEFAULT NULL,
    p_action_type VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    log_id UUID,
    user_id UUID,
    user_name VARCHAR,
    user_roll_no VARCHAR,
    action_type VARCHAR,
    entity_type VARCHAR,
    entity_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.log_id,
        al.user_id,
        u.name as user_name,
        u.roll_no as user_roll_no,
        al.action_type,
        al.entity_type,
        al.entity_id,
        al.ip_address,
        al.user_agent,
        al.created_at
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.user_id
    WHERE al.created_at BETWEEN p_start_date AND p_end_date
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (p_action_type IS NULL OR al.action_type = p_action_type)
    ORDER BY al.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== REPORTS TABLE ==========
CREATE TABLE IF NOT EXISTS reports (
    report_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    reported_group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
    reported_message_id UUID REFERENCES chat_messages(message_id) ON DELETE CASCADE,
    
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN (
        'spam', 'harassment', 'inappropriate_content', 'impersonating',
        'fake_profile', 'other'
    )),
    
    description TEXT NOT NULL,
    evidence_urls TEXT[] DEFAULT '{}',
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
    resolved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    resolution_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_group ON reports(reported_group_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_message ON reports(reported_message_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_resolved ON reports(resolved_at);

-- ========== ROW LEVEL SECURITY (RLS) ==========
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON reports
    FOR SELECT USING (reporter_user_id::text = auth.uid()::text);

-- Users can create reports
CREATE POLICY "Users can create reports" ON reports
    FOR INSERT WITH CHECK (reporter_user_id::text = auth.uid()::text);

-- Users can update their own pending reports
CREATE POLICY "Users can update own pending reports" ON reports
    FOR UPDATE USING (
        reporter_user_id::text = auth.uid()::text 
        AND status = 'pending'
    );

-- Only admins can resolve reports
CREATE POLICY "Admins can resolve reports" ON reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.user_id::text = auth.uid()::text
            AND u.is_verified = TRUE
            -- Add admin check if you have admin users table
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.user_id::text = auth.uid()::text
            AND u.is_verified = TRUE
        )
    );

-- ========== HELPER FUNCTIONS ==========

-- Function to create a report
CREATE OR REPLACE FUNCTION create_report(
    p_reporter_user_id UUID,
    p_report_type VARCHAR,
    p_description TEXT,
    p_reported_user_id UUID DEFAULT NULL,
    p_reported_group_id UUID DEFAULT NULL,
    p_reported_message_id UUID DEFAULT NULL,
    p_evidence_urls TEXT[] DEFAULT '{}'
)

RETURNS UUID AS $$
DECLARE
    v_report_id UUID;
    v_context_valid BOOLEAN;
BEGIN
    -- Validate context: must report at least one thing
    v_context_valid := (
        p_reported_user_id IS NOT NULL OR
        p_reported_group_id IS NOT NULL OR
        p_reported_message_id IS NOT NULL
    );
    
    IF NOT v_context_valid THEN
        RAISE EXCEPTION 'Must report a user, group, or message';
    END IF;
    
    -- Check if reporter is reporting themselves
    IF p_reported_user_id = p_reporter_user_id THEN
        RAISE EXCEPTION 'Cannot report yourself';
    END IF;
    
    -- Check if already reported (pending)
    IF EXISTS (
        SELECT 1 FROM reports 
        WHERE reporter_user_id = p_reporter_user_id
        AND (
            (reported_user_id = p_reported_user_id AND p_reported_user_id IS NOT NULL) OR
            (reported_group_id = p_reported_group_id AND p_reported_group_id IS NOT NULL) OR
            (reported_message_id = p_reported_message_id AND p_reported_message_id IS NOT NULL)
        )
        AND status = 'pending'
    ) THEN
        RAISE EXCEPTION 'Already reported this with a pending report';
    END IF;
    
    -- Create report
    INSERT INTO reports (
        reporter_user_id,
        reported_user_id,
        reported_group_id,
        reported_message_id,
        report_type,
        description,
        evidence_urls,
        status
    ) VALUES (
        p_reporter_user_id,
        p_reported_user_id,
        p_reported_group_id,
        p_reported_message_id,
        p_report_type,
        p_description,
        p_evidence_urls,
        'pending'
    )
    RETURNING report_id INTO v_report_id;
    
    -- Create notification for admins (simplified)
    -- In production, you'd have an admin notification system
    
    RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's reports
CREATE OR REPLACE FUNCTION get_user_reports(p_user_id UUID)
RETURNS TABLE (
    report_id UUID,
    report_type VARCHAR,
    description TEXT,
    status VARCHAR,
    created_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    reported_user_name VARCHAR,
    reported_group_name VARCHAR,
    reported_message_preview TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.report_id,
        r.report_type,
        r.description,
        r.status,
        r.created_at,
        r.resolved_at,
        u.name as reported_user_name,
        g.group_name as reported_group_name,
        LEFT(cm.encrypted_content, 100) as reported_message_preview
    FROM reports r
    LEFT JOIN users u ON r.reported_user_id = u.user_id
    LEFT JOIN groups g ON r.reported_group_id = g.group_id
    LEFT JOIN chat_messages cm ON r.reported_message_id = cm.message_id
    WHERE r.reporter_user_id = p_user_id
    ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resolve a report (admin only)
CREATE OR REPLACE FUNCTION resolve_report(
    p_report_id UUID,
    p_resolved_by UUID,
    p_status VARCHAR,
    p_resolution_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Validate status
    IF p_status NOT IN ('resolved', 'dismissed') THEN
        RAISE EXCEPTION 'Invalid resolution status';
    END IF;
    
    -- Update report
    UPDATE reports 
    SET status = p_status,
        resolved_by = p_resolved_by,
        resolution_notes = p_resolution_notes,
        resolved_at = NOW()
    WHERE report_id = p_report_id
    AND status IN ('pending', 'reviewing');
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report not found or already resolved';
    END IF;
    
    -- Notify reporter
    INSERT INTO system_notifications (
        user_id,
        notification_type,
        title,
        body,
        data
    )
    SELECT 
        r.reporter_user_id,
        'system_alert',
        'Report ' || p_status,
        'Your report has been ' || p_status || '. ' || COALESCE(p_resolution_notes, ''),
        jsonb_build_object(
            'report_id', p_report_id,
            'resolution_status', p_status,
            'resolved_by', p_resolved_by,
            'resolved_at', NOW()
        )
    FROM reports r
    WHERE r.report_id = p_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==================================================================================


-- ========== SYSTEM_NOTIFICATIONS TABLE ==========
CREATE TABLE IF NOT EXISTS system_notifications (
    notification_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'chat_request', 'group_invite', 'poll_created', 
        'vote_result', 'message', 'system_alert'
    )),
    
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON system_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON system_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON system_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON system_notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON system_notifications(user_id) WHERE is_read = FALSE;

-- Trigger to auto-expire notifications
CREATE OR REPLACE FUNCTION expire_old_notifications()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete expired notifications
    DELETE FROM system_notifications 
    WHERE expires_at <= NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job or run this function periodically
CREATE TRIGGER trigger_expire_notifications 
BEFORE INSERT OR UPDATE ON system_notifications 
FOR EACH ROW 
EXECUTE FUNCTION expire_old_notifications();

-- ========== ROW LEVEL SECURITY (RLS) ==========
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON system_notifications
    FOR SELECT USING (user_id::text = auth.uid()::text);

-- System can create notifications
CREATE POLICY "System can create notifications" ON system_notifications
    FOR INSERT WITH CHECK (true);  -- Backend/system only

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON system_notifications
    FOR UPDATE USING (user_id::text = auth.uid()::text)
    WITH CHECK (user_id::text = auth.uid()::text);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON system_notifications
    FOR DELETE USING (user_id::text = auth.uid()::text);

-- ========== HELPER FUNCTIONS ==========

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_notification_type VARCHAR,
    p_title VARCHAR,
    p_body TEXT,
    p_data JSONB DEFAULT NULL,
    p_expires_in_days INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO system_notifications (
        user_id,
        notification_type,
        title,
        body,
        data,
        expires_at
    ) VALUES (
        p_user_id,
        p_notification_type,
        p_title,
        p_body,
        p_data,
        NOW() + (p_expires_in_days || ' days')::INTERVAL
    )
    RETURNING notification_id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user notifications
CREATE OR REPLACE FUNCTION get_user_notifications(
    p_user_id UUID,
    p_unread_only BOOLEAN DEFAULT FALSE,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    notification_id UUID,
    notification_type VARCHAR,
    title VARCHAR,
    body TEXT,
    data JSONB,
    is_read BOOLEAN,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sn.notification_id,
        sn.notification_type,
        sn.title,
        sn.body,
        sn.data,
        sn.is_read,
        sn.read_at,
        sn.created_at,
        sn.expires_at
    FROM system_notifications sn
    WHERE sn.user_id = p_user_id
    AND sn.expires_at > NOW()
    AND (NOT p_unread_only OR sn.is_read = FALSE)
    ORDER BY sn.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(p_notification_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE system_notifications 
    SET is_read = TRUE,
        read_at = NOW()
    WHERE notification_id = p_notification_id
    AND user_id = p_user_id
    AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    WITH updated AS (
        UPDATE system_notifications 
        SET is_read = TRUE,
            read_at = NOW()
        WHERE user_id = p_user_id
        AND is_read = FALSE
        AND expires_at > NOW()
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_updated_count FROM updated;
    
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM system_notifications 
    WHERE user_id = p_user_id
    AND is_read = FALSE
    AND expires_at > NOW();
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==================================================================================

-- Test creating a report
SELECT create_report(
  (SELECT user_id::uuid FROM users WHERE roll_no = 'B23CS001'),
  'harassment'::text,
  'User is sending inappropriate messages'::text,
    (SELECT user_id::uuid FROM users WHERE roll_no = 'B23CS002'),
    NULL::uuid,                 -- group_id (explicitly cast to uuid)
    NULL::uuid,                 -- message_id (explicitly cast to uuid)
  ARRAY['https://example.com/evidence1.jpg']::text[]  -- explicit text[] cast
);

-- Get user reports
SELECT * FROM get_user_reports(
  (SELECT user_id::uuid FROM users WHERE roll_no = 'B23CS001')
);

-- Create notification
SELECT create_notification(
  (SELECT user_id::uuid FROM users WHERE roll_no = 'B23CS001'),
  'message'::text,
  'New Message'::text,
  'You have received a new message'::text,
  '{"chat_id": "123", "sender": "test"}'::jsonb
);

-- Get notifications
SELECT * FROM get_user_notifications(
  (SELECT user_id::uuid FROM users WHERE roll_no = 'B23CS001'),
  FALSE,       -- include_read boolean
  10,          -- limit integer
  0            -- offset integer
);

-- Mark as read
SELECT mark_notification_as_read(
  (SELECT notification_id::uuid FROM system_notifications LIMIT 1),
  (SELECT user_id::uuid FROM users WHERE roll_no = 'B23CS001')
);

-- Get unread count
SELECT get_unread_notification_count(
  (SELECT user_id::uuid FROM users WHERE roll_no = 'B23CS001')
);

-- Test audit log
SELECT log_audit_event(
  (SELECT user_id::uuid FROM users WHERE roll_no = 'B23CS001'), -- actor_id
  'login'::varchar,          -- action
  'users'::varchar,          -- object_table
  (SELECT user_id::uuid FROM users WHERE roll_no = 'B23CS001'), -- object_id
  NULL::jsonb,             -- related_id
  '{"action": "login", "ip": "127.0.0.1"}'::jsonb, -- metadata
  '127.0.0.1'::inet,      -- ip
  'Mozilla/5.0'::text     -- user_agent
);


-- ==================================================================================


ALTER TABLE chat_requests 
ADD CONSTRAINT fk_chat_requests_anonymous_identity 
FOREIGN KEY (anonymous_identity_id) 
REFERENCES anonymous_identities(identity_id) 
ON DELETE SET NULL;


-- ==================================================================================


-- ========== USER_ENCRYPTION_KEYS TABLE ==========
CREATE TABLE IF NOT EXISTS user_encryption_keys (
    user_encrypt_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Only store public key (private key stays on client)
    public_key TEXT NOT NULL, -- RSA public key in PEM format
    
    key_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_keys_user ON user_encryption_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_keys_version ON user_encryption_keys(key_version);

-- Trigger for updated_at
CREATE TRIGGER update_user_keys_updated_at 
BEFORE UPDATE ON user_encryption_keys 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to ensure only one active key per user
CREATE OR REPLACE FUNCTION enforce_single_active_key()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user already has a key (on insert)
    IF TG_OP = 'INSERT' THEN
        IF EXISTS (
            SELECT 1 FROM user_encryption_keys 
            WHERE user_id = NEW.user_id
        ) THEN
            RAISE EXCEPTION 'User already has an encryption key';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_key_per_user 
BEFORE INSERT ON user_encryption_keys 
FOR EACH ROW EXECUTE FUNCTION enforce_single_active_key();

-- ========== ROW LEVEL SECURITY (RLS) ==========
ALTER TABLE user_encryption_keys ENABLE ROW LEVEL SECURITY;

-- Users can view their own public key
CREATE POLICY "Users can view own public key" ON user_encryption_keys
    FOR SELECT USING (user_id::text = auth.uid()::text);

-- Users can view public keys of other users (for encryption)
CREATE POLICY "Users can view other public keys" ON user_encryption_keys
    FOR SELECT USING (true); -- Public keys are meant to be shared

-- Only system can insert/update keys (via backend during registration)
CREATE POLICY "System can manage keys" ON user_encryption_keys
    FOR ALL USING (false); -- Manage via backend

-- ========== HELPER FUNCTIONS ==========

-- Function to get user's public key
CREATE OR REPLACE FUNCTION get_user_public_key(p_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    public_key TEXT,
    key_version INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uek.user_id,
        uek.public_key,
        uek.key_version,
        uek.created_at
    FROM user_encryption_keys uek
    WHERE uek.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get multiple users' public keys
CREATE OR REPLACE FUNCTION get_users_public_keys(p_user_ids UUID[])
RETURNS TABLE (
    user_id UUID,
    public_key TEXT,
    key_version INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uek.user_id,
        uek.public_key,
        uek.key_version
    FROM user_encryption_keys uek
    WHERE uek.user_id = ANY(p_user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create/update user encryption key (backend only)
CREATE OR REPLACE FUNCTION set_user_public_key(
    p_user_id UUID,
    p_public_key TEXT,
    p_key_version INTEGER DEFAULT 1
)
RETURNS UUID AS $$
DECLARE
    v_key_id UUID;
BEGIN
    INSERT INTO user_encryption_keys (
        user_id,
        public_key,
        key_version
    ) VALUES (
        p_user_id,
        p_public_key,
        p_key_version
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        public_key = EXCLUDED.public_key,
        key_version = EXCLUDED.key_version + 1,
        updated_at = NOW()
    RETURNING user_encrypt_id INTO v_key_id;
    
    RETURN v_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==================================================================================


-- ========== CHAT_SESSION_KEYS TABLE ==========
CREATE TABLE IF NOT EXISTS chat_session_keys (
    session_key_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES chat_conversations(conversation_id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(group_id) ON DELETE CASCADE,
    
    -- Single AES key for this chat/group (encrypted for each member)
    aes_key_encrypted TEXT NOT NULL, -- Base64 encoded
    aes_key_iv VARCHAR(50) NOT NULL, -- IV for AES key encryption
    
    -- Who encrypted this key copy
    encrypted_for_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_chat_keys_conversation ON chat_session_keys(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_keys_group ON chat_session_keys(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_keys_user ON chat_session_keys(encrypted_for_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_keys_composite ON chat_session_keys(conversation_id, group_id, encrypted_for_user_id);

-- Trigger for updated_at
CREATE TRIGGER update_chat_keys_updated_at 
BEFORE UPDATE ON chat_session_keys 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to ensure proper key assignment
CREATE OR REPLACE FUNCTION validate_chat_session_key()
RETURNS TRIGGER AS $$
DECLARE
    v_is_member BOOLEAN;
    v_is_participant BOOLEAN;
BEGIN
    -- For conversation keys
    IF NEW.conversation_id IS NOT NULL THEN
        -- Check if user is part of conversation
        SELECT EXISTS (
            SELECT 1 FROM chat_conversations 
            WHERE conversation_id = NEW.conversation_id
            AND (user1_id = NEW.encrypted_for_user_id OR user2_id = NEW.encrypted_for_user_id)
        ) INTO v_is_participant;
        
        IF NOT v_is_participant THEN
            RAISE EXCEPTION 'User is not part of this conversation';
        END IF;
    
    -- For group keys
    ELSIF NEW.group_id IS NOT NULL THEN
        -- Check if user is group member
        SELECT EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = NEW.group_id
            AND user_id = NEW.encrypted_for_user_id
        ) INTO v_is_member;
        
        IF NOT v_is_member THEN
            RAISE EXCEPTION 'User is not a member of this group';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_session_key 
BEFORE INSERT OR UPDATE ON chat_session_keys 
FOR EACH ROW EXECUTE FUNCTION validate_chat_session_key();

-- ========== ROW LEVEL SECURITY (RLS) ==========
ALTER TABLE chat_session_keys ENABLE ROW LEVEL SECURITY;

-- Users can only view keys encrypted for them
CREATE POLICY "Users can view own encrypted keys" ON chat_session_keys
    FOR SELECT USING (encrypted_for_user_id::text = auth.uid()::text);

-- System can create keys (via backend)
CREATE POLICY "System can manage keys" ON chat_session_keys
    FOR ALL USING (false); -- Manage via backend

-- ========== HELPER FUNCTIONS ==========

-- Function to get conversation AES key for user
CREATE OR REPLACE FUNCTION get_conversation_key(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    session_key_id UUID,
    aes_key_encrypted TEXT,
    aes_key_iv VARCHAR,
    encrypted_with_key_version INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        csk.session_key_id,
        csk.aes_key_encrypted,
        csk.aes_key_iv,
        csk.encrypted_with_key_version,
        csk.created_at
    FROM chat_session_keys csk
    WHERE csk.conversation_id = p_conversation_id
    AND csk.encrypted_for_user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get group AES key for user
CREATE OR REPLACE FUNCTION get_group_key(
    p_group_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    session_key_id UUID,
    aes_key_encrypted TEXT,
    aes_key_iv VARCHAR,
    encrypted_with_key_version INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        csk.session_key_id,
        csk.aes_key_encrypted,
        csk.aes_key_iv,
        csk.encrypted_with_key_version,
        csk.created_at
    FROM chat_session_keys csk
    WHERE csk.group_id = p_group_id
    AND csk.encrypted_for_user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set conversation keys (backend only)
CREATE OR REPLACE FUNCTION set_conversation_keys(
    p_conversation_id UUID,
    p_user1_id UUID,
    p_user1_key_encrypted TEXT,
    p_user1_key_iv VARCHAR,
    p_user2_id UUID,
    p_user2_key_encrypted TEXT,
    p_user2_key_iv VARCHAR,
    p_key_version INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
    -- Delete any existing keys for this conversation
    DELETE FROM chat_session_keys 
    WHERE conversation_id = p_conversation_id;
    
    -- Insert keys for both users
    INSERT INTO chat_session_keys (
        conversation_id,
        aes_key_encrypted,
        aes_key_iv,
        encrypted_for_user_id,
        encrypted_with_key_version
    ) VALUES 
    (
        p_conversation_id,
        p_user1_key_encrypted,
        p_user1_key_iv,
        p_user1_id,
        p_key_version
    ),
    (
        p_conversation_id,
        p_user2_key_encrypted,
        p_user2_key_iv,
        p_user2_id,
        p_key_version
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set group keys (backend only)
CREATE OR REPLACE FUNCTION set_group_keys(
    p_group_id UUID,
    p_keys_data JSONB  -- Format: [{"user_id": "...", "encrypted_key": "...", "key_iv": "..."}, ...]
)
RETURNS INTEGER AS $$
DECLARE
    v_key_record JSONB;
    v_keys_set INTEGER := 0;
BEGIN
    -- Delete any existing keys for this group
    DELETE FROM chat_session_keys 
    WHERE group_id = p_group_id;
    
    -- Insert new keys for all members
    FOR v_key_record IN SELECT * FROM jsonb_array_elements(p_keys_data)
    LOOP
        INSERT INTO chat_session_keys (
            group_id,
            aes_key_encrypted,
            aes_key_iv,
            encrypted_for_user_id,
            encrypted_with_key_version
        ) VALUES (
            p_group_id,
            v_key_record->>'encrypted_key',
            v_key_record->>'key_iv',
            (v_key_record->>'user_id')::UUID,
            1
        );
        
        v_keys_set := v_keys_set + 1;
    END LOOP;
    
    RETURN v_keys_set;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rotate group keys (when member joins/leaves)
CREATE OR REPLACE FUNCTION rotate_group_keys(
    p_group_id UUID,
    p_new_keys_data JSONB
)
RETURNS INTEGER AS $$
DECLARE
    v_old_version INTEGER;
BEGIN
    -- Get current max key version
    SELECT COALESCE(MAX(encrypted_with_key_version), 0) INTO v_old_version
    FROM chat_session_keys 
    WHERE group_id = p_group_id;
    
    -- Delete old keys
    DELETE FROM chat_session_keys 
    WHERE group_id = p_group_id;
    
    -- Insert new keys with incremented version
    PERFORM set_group_keys(
        p_group_id,
        jsonb_set(
            p_new_keys_data,
            '{0,version}',
            to_jsonb(v_old_version + 1)
        )
    );
    
    -- Update messages to use new key version
    UPDATE chat_messages 
    SET encryption_key_version = v_old_version + 1
    WHERE group_id = p_group_id;
    
    RETURN v_old_version + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has key for chat
CREATE OR REPLACE FUNCTION has_chat_key(
    p_user_id UUID,
    p_conversation_id UUID DEFAULT NULL,
    p_group_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_key BOOLEAN;
BEGIN
    IF p_conversation_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM chat_session_keys 
            WHERE conversation_id = p_conversation_id
            AND encrypted_for_user_id = p_user_id
        ) INTO v_has_key;
    ELSIF p_group_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM chat_session_keys 
            WHERE group_id = p_group_id
            AND encrypted_for_user_id = p_user_id
        ) INTO v_has_key;
    ELSE
        v_has_key := FALSE;
    END IF;
    
    RETURN v_has_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==================================================================================


-- Test user encryption key (backend)
SELECT set_user_public_key(
    (SELECT user_id FROM users WHERE roll_no = 'B23CS001'),
    '-----BEGIN PUBLIC KEY-----...-----END PUBLIC KEY-----',
    1
);

-- Get user public key
SELECT * FROM get_user_public_key((SELECT user_id FROM users WHERE roll_no = 'B23CS001'));

-- Test conversation keys (backend)
SELECT set_conversation_keys(
    (SELECT conversation_id FROM chat_conversations LIMIT 1),
    (SELECT user_id FROM users WHERE roll_no = 'B23CS001'),
    'encrypted_key_for_user1',
    'iv1',
    (SELECT user_id FROM users WHERE roll_no = 'B23CS002'),
    'encrypted_key_for_user2',
    'iv2',
    1
);

-- Get conversation key for user
SELECT * FROM get_conversation_key(
    (SELECT conversation_id FROM chat_conversations LIMIT 1),
    (SELECT user_id FROM users WHERE roll_no = 'B23CS001')
);

-- Test group keys (backend)
SELECT set_group_keys(
  (SELECT group_id FROM groups LIMIT 1),
  jsonb_build_array(
    jsonb_build_object(
      'user_id', (SELECT user_id::text FROM users WHERE roll_no = 'B23CS001'),
      'encrypted_key', 'key1',
      'key_iv', 'iv1'
    ),
    jsonb_build_object(
      'user_id', (SELECT user_id::text FROM users WHERE roll_no = 'B23CS002'),
      'encrypted_key', 'key2',
      'key_iv', 'iv2'
    )
  )
);

-- Get group key for user
SELECT * FROM get_group_key(
    (SELECT group_id FROM groups LIMIT 1),
    (SELECT user_id FROM users WHERE roll_no = 'B23CS001')
);

-- Check if user has key
SELECT has_chat_key(
    (SELECT user_id FROM users WHERE roll_no = 'B23CS001'),
    (SELECT conversation_id FROM chat_conversations LIMIT 1),
    NULL
);

-- ==================================================================================

-- Step 3: Add foreign key constraint
ALTER TABLE chat_messages 
ADD CONSTRAINT fk_chat_messages_session_key 
FOREIGN KEY (key_id) 
REFERENCES chat_session_keys(session_key_id) 
ON DELETE SET NULL;

-- ==================================================================================

-- ========== USER_BLOCKS TABLE ==========
CREATE TABLE IF NOT EXISTS user_blocks (
    block_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    block_type VARCHAR(20) DEFAULT 'permanent' CHECK (block_type IN ('permanent', 'temporary')),
    expires_at TIMESTAMPTZ,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(blocker_id, blocked_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_expires ON user_blocks(expires_at);

-- Trigger for auto-unblock temporary blocks
CREATE OR REPLACE FUNCTION unblock_expired_users()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete expired temporary blocks
    DELETE FROM user_blocks 
    WHERE block_type = 'temporary'
    AND expires_at <= NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_unblock_expired 
BEFORE INSERT OR UPDATE ON user_blocks 
FOR EACH ROW 
EXECUTE FUNCTION unblock_expired_users();

-- ========== ROW LEVEL SECURITY (RLS) ==========
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Users can view blocks they created
CREATE POLICY "Users can view own blocks" ON user_blocks
    FOR SELECT USING (blocker_id::text = auth.uid()::text);

-- Users can create blocks
CREATE POLICY "Users can create blocks" ON user_blocks
    FOR INSERT WITH CHECK (blocker_id::text = auth.uid()::text);

-- Users can update their own blocks
CREATE POLICY "Users can update own blocks" ON user_blocks
    FOR UPDATE USING (blocker_id::text = auth.uid()::text)
    WITH CHECK (blocker_id::text = auth.uid()::text);

-- Users can delete their own blocks
CREATE POLICY "Users can delete own blocks" ON user_blocks
    FOR DELETE USING (blocker_id::text = auth.uid()::text);

-- ========== HELPER FUNCTIONS ==========

-- Function to check if user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(
    p_blocker_id UUID,
    p_blocked_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_blocked BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM user_blocks 
        WHERE blocker_id = p_blocker_id 
        AND blocked_id = p_blocked_id
        AND (
            block_type = 'permanent' 
            OR (block_type = 'temporary' AND expires_at > NOW())
        )
    ) INTO v_is_blocked;
    
    RETURN v_is_blocked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to block a user
CREATE OR REPLACE FUNCTION block_user(
    p_blocker_id UUID,
    p_blocked_id UUID,
    p_block_type VARCHAR DEFAULT 'permanent',
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_block_id UUID;
    v_already_blocked BOOLEAN;
BEGIN
    -- Check if already blocked
    SELECT is_user_blocked(p_blocker_id, p_blocked_id) INTO v_already_blocked;
    
    IF v_already_blocked THEN
        RAISE EXCEPTION 'User is already blocked';
    END IF;
    
    -- Validate temporary block has expiry
    IF p_block_type = 'temporary' AND p_expires_at IS NULL THEN
        RAISE EXCEPTION 'Temporary blocks must have expiry date';
    END IF;
    
    -- Create block
    INSERT INTO user_blocks (
        blocker_id,
        blocked_id,
        block_type,
        expires_at,
        reason
    ) VALUES (
        p_blocker_id,
        p_blocked_id,
        p_block_type,
        p_expires_at,
        p_reason
    )
    ON CONFLICT (blocker_id, blocked_id) 
    DO UPDATE SET 
        block_type = EXCLUDED.block_type,
        expires_at = EXCLUDED.expires_at,
        reason = EXCLUDED.reason,
        created_at = NOW()
    RETURNING block_id INTO v_block_id;
    
    -- Close any existing conversations
    UPDATE chat_conversations 
    SET is_blocked = TRUE,
        blocked_by_user_id = p_blocker_id
    WHERE (user1_id = p_blocker_id AND user2_id = p_blocked_id)
       OR (user1_id = p_blocked_id AND user2_id = p_blocker_id)
    AND is_blocked = FALSE;
    
    -- Reject any pending chat requests
    UPDATE chat_requests 
    SET status = 'blocked'
    WHERE (sender_id = p_blocker_id AND receiver_id = p_blocked_id)
       OR (sender_id = p_blocked_id AND receiver_id = p_blocker_id)
    AND status = 'pending';
    
    RETURN v_block_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ================================================


-- -- Show foreign key relationships between tables
SELECT
    tc.table_schema || '.' || tc.table_name as from_table,
    kcu.column_name as from_column,
    ccu.table_schema || '.' || ccu.table_name as to_table,
    ccu.column_name as to_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;


TRUNCATE TABLE
  public.message_status,
  public.chat_messages,
  public.media_uploads,
  public.chat_session_keys,
  public.chat_requests,
  public.chat_conversations,
  public.anonymous_identities,
  public.group_members,
  public.group_invites,
  public.group_bans,
  public.votes,
  public.polls,
  public.reports,
  public.system_notifications,
  public.audit_logs,
  public.user_encryption_keys,
  public.user_verifications,
  public.user_sessions,
  public.user_settings,
  public.user_password_resets,
  public.groups,
  public.users
RESTART IDENTITY CASCADE;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'user_settings'
ORDER BY ordinal_position;

SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

SELECT
  table_schema,
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  character_maximum_length,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

SELECT
  tc.constraint_name,
  tc.table_schema || '.' || tc.table_name AS from_table,
  kcu.column_name AS from_column,
  ccu.table_schema || '.' || ccu.table_name AS to_table,
  ccu.column_name AS to_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;


-- ========================================
-- Migration: Allow 3 conversations between same users
-- 1. Normal (both know each other)
-- 2. A→B anonymous (A knows B, B doesn't know A)
-- 3. B→A anonymous (B knows A, A doesn't know B)
-- Date: 2026-02-02
-- ========================================

-- -- Step 1: Drop the existing unique constraint
ALTER TABLE chat_conversations 
DROP CONSTRAINT IF EXISTS chat_conversations_user1_id_user2_id_key;

-- Also drop if the previous migration constraint exists
ALTER TABLE chat_conversations 
DROP CONSTRAINT IF EXISTS chat_conversations_user1_user2_anonymous_key;

-- Step 2: Add new composite unique constraint including anonymous_initiator_id
-- This allows multiple anonymous conversations with different initiators
-- COALESCE converts NULL to a UUID so it's included in uniqueness
ALTER TABLE chat_conversations 
ADD CONSTRAINT chat_conversations_users_initiator_key 
UNIQUE (user1_id, user2_id, COALESCE(anonymous_initiator_id, '00000000-0000-0000-0000-000000000000'));

CREATE UNIQUE INDEX 
CONCURRENTLY IF NOT EXISTS chat_conversations_users_initiator_unique_idx 
ON public.chat_conversations (user1_id, user2_id, COALESCE(anonymous_initiator_id, '00000000-0000-0000-0000-000000000000'::uuid));


-- Step 3: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_users_initiator 
ON chat_conversations(user1_id, user2_id, anonymous_initiator_id);

-- Step 4: Update existing conversations to set is_accepted = true (remove request concept)
UPDATE chat_conversations 
SET is_accepted = true 
WHERE is_accepted = false;

-- ===========================================================
--          3rd feb 5AM
-- ===========================================================

-- -- Fix Foreign Key Constraint
ALTER TABLE chat_conversations 
DROP CONSTRAINT IF EXISTS chat_conversations_anonymous_initiator_id_fkey;

ALTER TABLE chat_conversations 
ADD CONSTRAINT chat_conversations_anonymous_initiator_id_fkey 
FOREIGN KEY (anonymous_initiator_id) 
REFERENCES anonymous_identities(identity_id) 
ON DELETE SET NULL;

-- -- Verify the constraint
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as foreign_table,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'chat_conversations_anonymous_initiator_id_fkey';


-- ===========================================================
--          10th feb 5PM
-- ===========================================================

UPDATE users 
SET dp_url = 'https://res.cloudinary.com/dboibrtkv/image/upload/v1/defaults/m0.jpg'
WHERE dp_url IS NULL AND LOWER(gender) = 'male';

UPDATE users 
SET dp_url = 'https://res.cloudinary.com/dboibrtkv/image/upload/v1/defaults/f0.jpg'
WHERE dp_url IS NULL AND LOWER(gender) = 'female';

UPDATE "users"
SET dp_url = CASE
  WHEN LOWER(COALESCE(gender, '')) = 'female' THEN 'https://res.cloudinary.com/dboibrtkv/image/upload/v1770722710/ahvxgdh0shutx72okak0.jpg'
  WHEN LOWER(COALESCE(gender, '')) = 'male' THEN 'https://res.cloudinary.com/dboibrtkv/image/upload/v1770722710/syqrnws7rzkjxxvullsa.jpg'
  ELSE 'https://res.cloudinary.com/dboibrtkv/image/upload/v1770722710/syqrnws7rzkjxxvullsa.jpg' -- default for other/NULL genders
END;

SELECT 
    gender,
    COUNT(*) as count,
    COUNT(CASE WHEN dp_url LIKE '%m0%' THEN 1 END) as default_male,
    COUNT(CASE WHEN dp_url LIKE '%f0%' THEN 1 END) as default_female,
    COUNT(CASE WHEN dp_url NOT LIKE '%d0%' AND dp_url IS NOT NULL THEN 1 END) as custom_images
FROM users
GROUP BY gender;


-- ==============================================================================
--                    14th FEB, 12 PM
-- ==============================================================================

-- -- Add field to mark messages that came from anonymous chat
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS was_anonymous_message BOOLEAN DEFAULT FALSE;


-- ==============================================================================
--                    15th FEB, 3 PM
-- ==============================================================================

-- Function to unblock a user
CREATE OR REPLACE FUNCTION unblock_user(
    p_blocker_id UUID,
    p_blocked_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    can_message_now BOOLEAN,
    remaining_blocker_id UUID
) AS $$
DECLARE
    v_deleted_count INTEGER;
    v_remaining_blocks INTEGER;
    v_remaining_blocker_id UUID;
BEGIN
    -- Delete the block
    DELETE FROM user_blocks 
    WHERE blocker_id = p_blocker_id 
    AND blocked_id = p_blocked_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count = 0 THEN
        RAISE EXCEPTION 'Block not found';
    END IF;
    
    -- Check if ANY blocks remain between these two users (in either direction)
    SELECT COUNT(*), MAX(blocker_id)
    INTO v_remaining_blocks, v_remaining_blocker_id
    FROM user_blocks 
    WHERE (blocker_id = p_blocker_id AND blocked_id = p_blocked_id)
       OR (blocker_id = p_blocked_id AND blocked_id = p_blocker_id);
    
    IF v_remaining_blocks = 0 THEN
        -- No blocks remain - fully unblock the conversation
        UPDATE chat_conversations 
        SET is_blocked = FALSE, 
            blocked_by_user_id = NULL,
            updated_at = NOW()
        WHERE (user1_id = p_blocker_id AND user2_id = p_blocked_id) 
           OR (user1_id = p_blocked_id AND user2_id = p_blocker_id)
           OR (user1_id = LEAST(p_blocker_id, p_blocked_id) AND user2_id = GREATEST(p_blocker_id, p_blocked_id));
        
        RETURN QUERY SELECT TRUE, TRUE, NULL::UUID;
    ELSE
        -- Blocks still exist - update who is blocking
        UPDATE chat_conversations 
        SET is_blocked = TRUE,
            blocked_by_user_id = v_remaining_blocker_id,
            updated_at = NOW()
        WHERE (user1_id = p_blocker_id AND user2_id = p_blocked_id) 
           OR (user1_id = p_blocked_id AND user2_id = p_blocker_id)
           OR (user1_id = LEAST(p_blocker_id, p_blocked_id) AND user2_id = GREATEST(p_blocker_id, p_blocked_id));
        
        RETURN QUERY SELECT TRUE, FALSE, v_remaining_blocker_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION after_unblock_sync()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversations
  SET is_blocked = FALSE,
      blocked_by_user_id = NULL,
      updated_at = NOW()
  WHERE user1_id = LEAST(OLD.blocker_id, OLD.blocked_id)
    AND user2_id = GREATEST(OLD.blocker_id, OLD.blocked_id);

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_unblock_sync
AFTER DELETE ON user_blocks
FOR EACH ROW
EXECUTE FUNCTION after_unblock_sync();


-- ==============================================================================
--                    16th FEB, 5:20 PM
-- ==============================================================================

Update the poll lifecycle management function
CREATE OR REPLACE FUNCTION manage_poll_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
    v_system_notifications_exists BOOLEAN;
    v_group_bans_exists BOOLEAN;
BEGIN
    -- Check for expired polls
    IF NEW.status = 'active' AND NEW.expires_at <= NOW() THEN
        NEW.status := 'expired';
        NEW.updated_at := NOW();
    END IF;
    
    -- Execute passed polls
    IF NEW.status = 'passed' AND OLD.status != 'passed' AND NEW.is_executed = FALSE THEN
        -- Execute based on poll type
        CASE NEW.poll_type
            WHEN 'remove_user' THEN
                -- Remove user from group (without banning)
                DELETE FROM group_members 
                WHERE group_id = NEW.group_id 
                AND user_id = NEW.target_user_id;
            
            WHEN 'kick_member' THEN
                -- Remove user from group
                DELETE FROM group_members 
                WHERE group_id = NEW.group_id 
                AND user_id = NEW.target_user_id;
                
                -- Add to bans table if exists
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'group_bans'
                ) INTO v_group_bans_exists;
                
                IF v_group_bans_exists THEN
                    INSERT INTO group_bans (group_id, user_id, banned_by, reason)
                    VALUES (NEW.group_id, NEW.target_user_id, NEW.created_by, 
                           'Removed by poll vote: ' || COALESCE(NEW.description, 'No reason provided'));
                END IF;
            
            WHEN 'make_admin' THEN
                -- Make user admin
                UPDATE group_members 
                SET is_admin = TRUE,
                    can_add_members = TRUE,
                    can_remove_members = TRUE,
                    can_edit_group = TRUE
                WHERE group_id = NEW.group_id 
                AND user_id = NEW.target_user_id;
            
            WHEN 'remove_admin' THEN
                -- Remove admin privileges
                UPDATE group_members 
                SET is_admin = FALSE,
                    can_add_members = FALSE,
                    can_remove_members = FALSE,
                    can_edit_group = FALSE
                WHERE group_id = NEW.group_id 
                AND user_id = NEW.target_user_id;
            
            WHEN 'object_removal' THEN
                -- Re-add user if they were removed
                INSERT INTO group_members (group_id, user_id, joined_at)
                VALUES (NEW.group_id, NEW.target_user_id, NOW())
                ON CONFLICT (group_id, user_id) 
                DO UPDATE SET 
                    is_admin = FALSE,
                    joined_at = NOW();
            
            -- Add more cases as needed
        END CASE;
        
        -- Mark as executed
        NEW.is_executed := TRUE;
        NEW.executed_at := NOW();
        
        -- Check if system_notifications exists
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'system_notifications'
        ) INTO v_system_notifications_exists;
        
        IF v_system_notifications_exists AND NEW.target_user_id IS NOT NULL THEN
            -- Create notification for affected user
            INSERT INTO system_notifications (user_id, notification_type, title, body, data)
            VALUES (
                NEW.target_user_id,
                'vote_result',
                'Poll Result: ' || NEW.title,
                CASE NEW.poll_type
                    WHEN 'remove_user' THEN 'You have been removed from the group by poll vote.'
                    WHEN 'kick_member' THEN 'You have been removed and banned from the group by poll vote.'
                    WHEN 'make_admin' THEN 'You have been promoted to admin by poll vote.'
                    WHEN 'remove_admin' THEN 'Your admin privileges have been removed by poll vote.'
                    WHEN 'object_removal' THEN 'Your objection was successful. You have been re-added to the group.'
                    ELSE 'A poll affecting you has been completed.'
                END,
                jsonb_build_object(
                    'poll_id', NEW.poll_id,
                    'group_id', NEW.group_id,
                    'poll_type', NEW.poll_type,
                    'result', 'passed',
                    'executed_at', NOW()
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 1. Admin creates poll with poll_type = 'remove_user' and target_user_id set
-- 2. Users vote on the poll
-- 3. When votes_for >= votes_required, poll status changes to 'passed'
-- 4. This trigger automatically:
--    - Deletes user from group_members table
--    - Marks poll as executed
--    - Sends notification to removed user
-- 5. User is removed from group immediately after poll passes

-- ==============================================================================
--                    16th FEB, 6:40 PM
-- ==============================================================================

SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'votes'
ORDER BY ordinal_position;

-- Drop the old constraint
ALTER TABLE polls DROP CONSTRAINT IF EXISTS polls_poll_type_check;

-- Add the new constraint with 'remove_user' included
ALTER TABLE polls 
ADD CONSTRAINT polls_poll_type_check 
CHECK (poll_type IN (
    'remove_user',      -- Remove member (no ban, can rejoin)
    'kick_member',      -- Kick member (with ban, cannot rejoin easily)
    'make_admin',       -- Promote to admin
    'remove_admin',     -- Demote from admin
    'change_group_name', -- Change group name
    'object_removal'    -- Appeal/object to a removal poll
));

-- ==============================================================================
--                    16th FEB, 7 PM
-- ==============================================================================

-- UPDATE POLL VOTING LOGIC
-- Drop the old function
DROP FUNCTION IF EXISTS manage_poll_lifecycle() CASCADE;

-- Create new function with updated voting logic
CREATE OR REPLACE FUNCTION manage_poll_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
    v_system_notifications_exists BOOLEAN;
    v_group_bans_exists BOOLEAN;
    v_random_value INTEGER;
    v_decision TEXT;
BEGIN
    -- ====================================================================
    -- HANDLE EXPIRED POLLS - Decide winner based on vote counts
    -- ====================================================================
    IF NEW.status = 'active' AND NEW.expires_at <= NOW() THEN
        -- Check vote counts and decide
        IF NEW.votes_for > NEW.votes_against THEN
            -- More FOR votes - Poll passes
            NEW.status := 'passed';
            v_decision := 'majority_for';
        ELSIF NEW.votes_for < NEW.votes_against THEN
            -- More AGAINST votes - Poll fails
            NEW.status := 'failed';
            v_decision := 'majority_against';
        ELSE
            -- Tie - Coin flip (random 0 or 1)
            v_random_value := floor(random() * 2)::INTEGER; -- 0 or 1
            
            IF v_random_value = 0 THEN
                -- Coin flip says REMOVE
                NEW.status := 'passed';
                v_decision := 'tie_coinflip_remove';
                
                -- Add a note to description about coin flip
                IF NEW.description IS NULL THEN
                    NEW.description := '[TIE BROKEN BY COIN FLIP - REMOVE]';
                ELSE
                    NEW.description := NEW.description || ' [TIE BROKEN BY COIN FLIP - REMOVE]';
                END IF;
            ELSE
                -- Coin flip says KEEP
                NEW.status := 'failed';
                v_decision := 'tie_coinflip_keep';
                
                -- Add a note to description about coin flip
                IF NEW.description IS NULL THEN
                    NEW.description := '[TIE BROKEN BY COIN FLIP - KEEP]';
                ELSE
                    NEW.description := NEW.description || ' [TIE BROKEN BY COIN FLIP - KEEP]';
                END IF;
            END IF;
        END IF;
        
        NEW.updated_at := NOW();
    END IF;
    
--     -- ====================================================================
--     -- EXECUTE PASSED POLLS - Take action based on poll type
--     -- ====================================================================
    IF NEW.status = 'passed' AND OLD.status != 'passed' AND NEW.is_executed = FALSE THEN
        -- Execute based on poll type
        CASE NEW.poll_type
            WHEN 'remove_user' THEN
                -- Remove user from group (NO BAN - they can rejoin if invited)
                DELETE FROM group_members 
                WHERE group_id = NEW.group_id 
                AND user_id = NEW.target_user_id;
                
                -- NO ban added - this is soft removal
            
            WHEN 'kick_member' THEN
                -- Remove user from group AND ban them
                DELETE FROM group_members 
                WHERE group_id = NEW.group_id 
                AND user_id = NEW.target_user_id;
                
                -- Add to bans table if exists
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'group_bans'
                ) INTO v_group_bans_exists;
                
                IF v_group_bans_exists THEN
                    INSERT INTO group_bans (group_id, user_id, banned_by, reason)
                    VALUES (NEW.group_id, NEW.target_user_id, NEW.created_by, 
                           'Kicked by poll vote: ' || COALESCE(NEW.description, 'No reason provided'))
                    ON CONFLICT (group_id, user_id) DO NOTHING;
                END IF;
            
            WHEN 'make_admin' THEN
                -- Promote user to admin
                UPDATE group_members 
                SET is_admin = TRUE,
                    can_add_members = TRUE,
                    can_remove_members = TRUE,
                    can_edit_group = TRUE
                WHERE group_id = NEW.group_id 
                AND user_id = NEW.target_user_id;
            
            WHEN 'remove_admin' THEN
                -- Demote user from admin
                UPDATE group_members 
                SET is_admin = FALSE,
                    can_add_members = FALSE,
                    can_remove_members = FALSE,
                    can_edit_group = FALSE
                WHERE group_id = NEW.group_id 
                AND user_id = NEW.target_user_id
                AND is_owner = FALSE; -- Cannot demote owner
            
            WHEN 'change_group_name' THEN
                -- Change group name (title contains new name)
                UPDATE groups 
                SET group_name = NEW.title,
                    updated_at = NOW()
                WHERE group_id = NEW.group_id;
            
            WHEN 'object_removal' THEN
                -- Re-add user if objection to removal passes
                INSERT INTO group_members (group_id, user_id, joined_at)
                VALUES (NEW.group_id, NEW.target_user_id, NOW())
                ON CONFLICT (group_id, user_id) 
                DO UPDATE SET 
                    is_admin = FALSE,
                    joined_at = NOW();
                
                -- Remove ban if it exists
                DELETE FROM group_bans
                WHERE group_id = NEW.group_id 
                AND user_id = NEW.target_user_id;
        END CASE;
        
        -- Mark as executed
        NEW.is_executed := TRUE;
        NEW.executed_at := NOW();
        
        -- Check if system_notifications exists
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'system_notifications'
        ) INTO v_system_notifications_exists;
        
        IF v_system_notifications_exists AND NEW.target_user_id IS NOT NULL THEN
            -- Create notification for affected user
            INSERT INTO system_notifications (user_id, notification_type, title, body, data)
            VALUES (
                NEW.target_user_id,
                'vote_result',
                'Poll Result: ' || NEW.title,
                CASE NEW.poll_type
                    WHEN 'remove_user' THEN 'You have been removed from the group by poll vote (soft removal).'
                    WHEN 'kick_member' THEN 'You have been kicked from the group by poll vote.'
                    WHEN 'make_admin' THEN 'You have been promoted to admin by poll vote!'
                    WHEN 'remove_admin' THEN 'Your admin privileges have been removed by poll vote.'
                    WHEN 'change_group_name' THEN 'The group name has been changed by poll vote.'
                    WHEN 'object_removal' THEN 'Your objection was successful! You have been re-added to the group.'
                    ELSE 'A poll affecting you has been completed.'
                END,
                jsonb_build_object(
                    'poll_id', NEW.poll_id,
                    'group_id', NEW.group_id,
                    'poll_type', NEW.poll_type,
                    'result', 'passed',
                    'decision_method', v_decision,
                    'votes_for', NEW.votes_for,
                    'votes_against', NEW.votes_against,
                    'executed_at', NOW()
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_manage_poll_lifecycle ON polls;

CREATE TRIGGER trigger_manage_poll_lifecycle 
BEFORE UPDATE ON polls 
FOR EACH ROW 
EXECUTE FUNCTION manage_poll_lifecycle();

-- ==================================================================================
-- SUMMARY OF CHANGES
-- ==================================================================================
-- 1. Removed 50% majority requirement during voting
-- 2. When poll expires:
--    - If votes_for > votes_against: Poll PASSES
--    - If votes_for < votes_against: Poll FAILS  
--    - If votes_for = votes_against: COIN FLIP (random 0 or 1)
--      * 0 = Remove (poll passes)
--      * 1 = Keep (poll fails)
-- 3. Coin flip result is noted in poll description
-- 4. Added support for 'remove_user' poll type (soft removal, no ban)
-- ==================================================================================

-- ==================================================================================
-- HELPER FUNCTION: Check and expire polls
-- ==================================================================================
-- Call this function periodically (e.g., every minute) to auto-expire polls
-- Or call it when fetching polls to ensure up-to-date status

CREATE OR REPLACE FUNCTION check_and_expire_polls()
RETURNS TABLE (
    poll_id UUID,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    decision_method TEXT
) AS $$
BEGIN
    RETURN QUERY
    UPDATE polls
    SET updated_at = NOW() -- This triggers the manage_poll_lifecycle function
    WHERE status = 'active' 
    AND expires_at <= NOW()
    RETURNING 
        polls.poll_id,
        'active'::VARCHAR(20) as old_status,
        polls.status as new_status,
        CASE 
            WHEN votes_for > votes_against THEN 'majority_for'
            WHEN votes_for < votes_against THEN 'majority_against'
            ELSE 'coin_flip'
        END as decision_method;
END;
$$ LANGUAGE plpgsql;


SELECT 'Poll voting logic updated successfully!' as status;


-- ==============================================================================
--                    16th FEB, 7 PM
-- ==============================================================================


-- 1) Find tables named 'polls' or like
SELECT table_schema, table_name, table_type
FROM information_schema.tables
WHERE table_name ILIKE 'polls' OR table_name ILIKE '%polls%';

-- 2) List triggers referencing 'polls'
SELECT event_object_schema, event_object_table, trigger_name, action_timing, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table ILIKE 'polls' OR event_object_table ILIKE '%polls%';

-- 3) List row-level security policies on 'polls'
SELECT pol.policyname, pol.tablename, pol.schemaname, pol.policytype, pg_get_ruledef(pol.oid) as definition
FROM (SELECT oid, polname as policyname, tablename, schemaname, policytype FROM pg_policies WHERE tablename ILIKE 'polls' OR tablename ILIKE '%polls%') pol;

-- 4) Find functions that reference 'polls' in their source
SELECT n.nspname as schema, p.proname as function_name, pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) ILIKE '%polls%';

-- 5) Check for foreign keys referencing polls
SELECT tc.constraint_name, tc.table_schema, tc.table_name, kcu.column_name, ccu.table_schema AS foreign_table_schema,
       ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND (ccu.table_name ILIKE 'polls' OR ccu.table_name ILIKE '%polls%');

-- 6) Check for indexes on polls
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename ILIKE 'polls' OR tablename ILIKE '%polls%';


-- ==============================================================================
--                    18th FEB, 12 PM
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION manage_poll_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-expire if time crossed
    IF NEW.status = 'active'
       AND NEW.expires_at <= NOW() THEN
        NEW.status := 'expired';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_manage_poll_lifecycle ON polls;

CREATE TRIGGER trigger_manage_poll_lifecycle
BEFORE UPDATE ON polls
FOR EACH ROW
EXECUTE FUNCTION manage_poll_lifecycle();

SELECT cron.schedule(
  'expire_polls_every_10_minute',
  '*/10 * * * *',
  $$
  UPDATE polls
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at <= NOW();
  $$
);

SELECT * FROM cron.job;


-- ==============================================================================
--                    28th Feb, 10:50PM
-- ==============================================================================

ALTER TABLE users
ADD COLUMN instagram_url TEXT,
ADD COLUMN twitter_url TEXT,
ADD COLUMN linkedin_url TEXT;
COMMENT ON COLUMN users.instagram_url IS 'Instagram profile URL';
COMMENT ON COLUMN users.twitter_url IS 'Twitter/X profile URL';
COMMENT ON COLUMN users.linkedin_url IS 'LinkedIn profile URL';


-- ==============================================================================
--                    28th Feb, 11:30PM
-- ==============================================================================

-- -- -- ========== MESSAGE_REACTIONS TABLE ==========
CREATE TABLE IF NOT EXISTS message_reactions (
    reaction_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES chat_messages(message_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions (message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON public.message_reactions (user_id);


-- -- ========== MESSAGE_EDIT_HISTORY TABLE ==========
CREATE TABLE IF NOT EXISTS message_edit_history (
    edit_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES chat_messages(message_id) ON DELETE CASCADE,
    previous_encrypted_content TEXT NOT NULL,
    previous_content_iv VARCHAR(50) NOT NULL,
    previous_content_auth_tag VARCHAR(50) NOT NULL,
    previous_media_url TEXT,
    edited_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_edit_history_message ON message_edit_history(message_id, edited_at DESC);



-- -- ========== UPDATE CHAT_MESSAGES TABLE ==========
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Add comment to clarify deletion types
COMMENT ON COLUMN chat_messages.is_deleted IS 'Message deleted for self (soft delete)';
COMMENT ON COLUMN chat_messages.deleted_for_everyone IS 'Message deleted for everyone (hard delete)';
COMMENT ON COLUMN chat_messages.edited_at IS 'Last edit timestamp';

-- Update index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_deleted_for_everyone ON chat_messages(deleted_for_everyone);

-- ========== FUNCTION: Get Reaction Counts ==========
CREATE OR REPLACE FUNCTION get_message_reaction_counts(msg_id UUID)
RETURNS TABLE(emoji VARCHAR, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT mr.emoji, COUNT(*)::BIGINT as count
    FROM message_reactions mr
    WHERE mr.message_id = msg_id
    GROUP BY mr.emoji
    ORDER BY count DESC, mr.emoji;
END;
$$ LANGUAGE plpgsql;

-- -- ========== FUNCTION: Check User Reaction ==========
CREATE OR REPLACE FUNCTION has_user_reacted(msg_id UUID, usr_id UUID, reaction_emoji VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM message_reactions
        WHERE message_id = msg_id 
        AND user_id = usr_id 
        AND emoji = reaction_emoji
    );
END;
$$ LANGUAGE plpgsql;

-- -- ========== TRIGGER: Update edited_at on message edit ==========
CREATE OR REPLACE FUNCTION update_message_edited_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_edited = TRUE AND OLD.is_edited = FALSE THEN
        NEW.edited_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_edited_at
BEFORE UPDATE ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_message_edited_at();


-- ==============================================================================
--                    2nd March, 7:15PM
-- ==============================================================================

-- Add per-user soft-delete tracking column
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS deleted_for_user_ids UUID[] DEFAULT '{}';


-- ==============================================================================
--                    4th March, 11.25PM
-- ==============================================================================

-- ================================================================================
--  POLLS v2 MIGRATION — Member Removal Redesign
--  Architecture:
--    • DB trigger handles ALL execution side-effects (removal, bans, etc.)
--      → works even when backend is offline
--    • DB trigger also handles vote-count updates
--    • Backend: only upserts votes, reads result, emits socket events
--    • Backend: 60s sweeper marks expired polls → emits socket events
-- ================================================================================

BEGIN;

-- ================================================================================
-- STEP 1: Drop the old COMBINED trigger (it mixed expiry + execution + bad
--         ON CONFLICT syntax). We replace it with two clean, focused triggers.
-- ================================================================================

DROP TRIGGER IF EXISTS trigger_manage_poll_lifecycle     ON polls;
DROP TRIGGER IF EXISTS trigger_poll_expiration           ON polls;
DROP TRIGGER IF EXISTS trigger_execute_polls             ON polls;
DROP TRIGGER IF EXISTS trigger_update_poll_stats         ON votes;

DROP FUNCTION IF EXISTS manage_poll_lifecycle()                       CASCADE;
DROP FUNCTION IF EXISTS update_poll_stats_after_vote()                CASCADE;

-- Drop old helper functions (now handled in backend with clean SQL)
DROP FUNCTION IF EXISTS create_poll(UUID,UUID,UUID,VARCHAR,VARCHAR,TEXT,INTEGER) CASCADE;
DROP FUNCTION IF EXISTS cast_vote(UUID,UUID,BOOLEAN,UUID)              CASCADE;
DROP FUNCTION IF EXISTS get_active_polls(UUID)                         CASCADE;
DROP FUNCTION IF EXISTS get_poll_results(UUID)                         CASCADE;

-- ================================================================================
-- STEP 2: TRIGGER 1 — Auto-execute poll action when status → 'passed'
--
--   Fires: BEFORE UPDATE OF status ON polls
--   Guards: OLD.status != 'passed' AND NEW.status = 'passed' AND NOT is_executed
--   Side-effects (inside same transaction as the status change):
--     kick_member  → DELETE from group_members, UPSERT into group_bans
--     make_admin   → UPDATE group_members SET is_admin = TRUE
--     remove_admin → UPDATE group_members SET is_admin = FALSE
--   Also sets: NEW.is_executed = TRUE, NEW.executed_at = NOW()
-- ================================================================================

CREATE OR REPLACE FUNCTION fn_execute_passed_poll()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger on the first transition to 'passed' and if not already executed
  IF NEW.status = 'passed'
     AND OLD.status IS DISTINCT FROM 'passed'
     AND NEW.is_executed = FALSE
  THEN
    CASE NEW.poll_type

      WHEN 'kick_member' THEN
        -- Remove the target from the group
        DELETE FROM group_members
        WHERE group_id = NEW.group_id
          AND user_id  = NEW.target_user_id;

        -- Record in bans (upsert to handle rare pre-existing ban gracefully)
        INSERT INTO group_bans (group_id, user_id, banned_by, reason)
        VALUES (
          NEW.group_id,
          NEW.target_user_id,
          NEW.created_by,
          'Removed by group vote: ' || COALESCE(NEW.description, 'No reason provided')
        )
        ON CONFLICT (group_id, user_id) DO UPDATE
          SET reason     = EXCLUDED.reason,
              banned_by  = EXCLUDED.banned_by;

      WHEN 'make_admin' THEN
        UPDATE group_members
        SET is_admin          = TRUE,
            can_add_members   = TRUE,
            can_remove_members = TRUE,
            can_edit_group    = TRUE
        WHERE group_id = NEW.group_id
          AND user_id  = NEW.target_user_id;

      WHEN 'remove_admin' THEN
        UPDATE group_members
        SET is_admin          = FALSE,
            can_add_members   = FALSE,
            can_remove_members = FALSE,
            can_edit_group    = FALSE
        WHERE group_id = NEW.group_id
          AND user_id  = NEW.target_user_id;

      ELSE
        -- change_group_name, object_removal, etc. — handled by backend if needed
        NULL;

    END CASE;

    -- Mark executed (modifies NEW row in-place — BEFORE trigger)
    NEW.is_executed  := TRUE;
    NEW.executed_at  := NOW();
    NEW.updated_at   := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger — fires BEFORE the UPDATE commits, so is_executed=TRUE is saved
-- in the same row update that changed status to 'passed'. Atomic. No race.
DROP TRIGGER IF EXISTS trg_execute_passed_poll ON polls;
CREATE TRIGGER trg_execute_passed_poll
  BEFORE UPDATE OF status ON polls
  FOR EACH ROW
  EXECUTE FUNCTION fn_execute_passed_poll();


-- ================================================================================
-- STEP 3: TRIGGER 2 — Keep vote statistics in sync after every vote change
--
--   Fires: AFTER INSERT OR UPDATE OR DELETE ON votes
--   Recalculates: votes_for, votes_against, total_voters, status
--   Also promotes poll to 'passed' / 'failed' when threshold is met,
--   which will re-fire trg_execute_passed_poll via the status change.
-- ================================================================================

CREATE OR REPLACE FUNCTION fn_update_poll_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_poll_id       UUID;
  v_votes_for     INT;
  v_votes_against INT;
  v_total         INT;
  v_required      INT;
  v_new_status    VARCHAR(20);
BEGIN
  -- Determine which poll changed
  v_poll_id := COALESCE(NEW.poll_id, OLD.poll_id);

  -- Recalculate fresh stats from the votes table
  SELECT
    COUNT(*) FILTER (WHERE vote_value = TRUE),
    COUNT(*) FILTER (WHERE vote_value = FALSE),
    COUNT(*)
  INTO v_votes_for, v_votes_against, v_total
  FROM votes
  WHERE poll_id = v_poll_id;

  -- Get threshold
  SELECT votes_required, status
  INTO v_required, v_new_status
  FROM polls
  WHERE poll_id = v_poll_id;

  -- Only change status if poll is still active (don't re-open a closed poll)
  IF v_new_status = 'active' THEN
    IF v_votes_for >= v_required THEN
      v_new_status := 'passed';
    ELSIF v_votes_against >= v_required THEN
      v_new_status := 'failed';
    END IF;
  END IF;

  -- Single UPDATE — if status changes to 'passed', trg_execute_passed_poll fires
  UPDATE polls
  SET votes_for    = v_votes_for,
      votes_against = v_votes_against,
      total_voters  = v_total,
      status        = v_new_status,
      updated_at    = NOW()
  WHERE poll_id = v_poll_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_poll_stats ON votes;
CREATE TRIGGER trg_update_poll_stats
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_poll_stats();

-- ================================================================================
-- STEP 4: Integrity constraints
-- ================================================================================

-- No two active polls of the same type for the same target in the same group
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_poll_per_target
  ON polls(group_id, target_user_id, poll_type)
  WHERE status = 'active' AND target_user_id IS NOT NULL;

-- No two active polls of the same type with no target (e.g. change_group_name)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_group_poll_no_target
  ON polls(group_id, poll_type)
  WHERE status = 'active' AND target_user_id IS NULL;

-- Ensure vote unique indexes exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_vote_user
  ON votes(poll_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_vote_anonymous
  ON votes(poll_id, anonymous_identity_id)
  WHERE anonymous_identity_id IS NOT NULL;

-- ================================================================================
-- STEP 5: New columns on polls (for cancel tracking)
-- ================================================================================

ALTER TABLE polls ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(user_id) ON DELETE SET NULL;

-- ================================================================================
-- STEP 6: Update RLS — poll cancellation
-- ================================================================================

DROP POLICY IF EXISTS "Creators can update own polls"          ON polls;
DROP POLICY IF EXISTS "Admins can cancel polls"                ON polls;
DROP POLICY IF EXISTS "Creator can cancel own active poll"     ON polls;
DROP POLICY IF EXISTS "Admin can cancel any active poll in group" ON polls;

CREATE POLICY "Creator can cancel own active poll" ON polls
  FOR UPDATE USING (
    created_by::text = auth.uid()::text
    AND status = 'active'
  );

CREATE POLICY "Admin can cancel any active poll in group" ON polls
  FOR UPDATE USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id   = polls.group_id
        AND gm.user_id::text = auth.uid()::text
        AND (gm.is_admin = TRUE OR gm.is_owner = TRUE)
    )
  );

COMMIT;


-- ==============================================================================
--                    5th March, 2:45PM
-- ==============================================================================

-- ================================================================================
--  POLLS v3 MIGRATION — Time-Based Resolution & Coin Toss
--  Architecture:
--    • Resolution only happens at expiry (enforced by backend sweeper)
--    • Tie results in a random "coin toss" (handled by backend sweeper)
--    • DB trigger handles side-effects when status is set to 'passed'
--    • Backend: only upserts votes, reads result, emits socket events
--    • Backend sweeper: marks 'passed'/'failed' based on majority vote at expiry
-- ================================================================================

BEGIN;

-- 1. Remove the vote threshold column
ALTER TABLE polls DROP COLUMN IF EXISTS votes_required;

-- 2. Update the stats trigger to remove automatic status transitions
--    Now it only maintains the counters.
CREATE OR REPLACE FUNCTION fn_update_poll_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_poll_id       UUID;
  v_votes_for     INT;
  v_votes_against INT;
  v_total         INT;
BEGIN
  -- Determine which poll changed
  v_poll_id := COALESCE(NEW.poll_id, OLD.poll_id);

  -- Recalculate fresh stats from the votes table
  SELECT
    COUNT(*) FILTER (WHERE vote_value = TRUE),
    COUNT(*) FILTER (WHERE vote_value = FALSE),
    COUNT(*)
  INTO v_votes_for, v_votes_against, v_total
  FROM votes
  WHERE poll_id = v_poll_id;

  -- Update count stats only. 
  -- Status is now strictly resolved by time (backend sweeper).
  UPDATE polls
  SET votes_for     = v_votes_for,
      votes_against = v_votes_against,
      total_voters  = v_total,
      updated_at    = NOW()
  WHERE poll_id = v_poll_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure fn_execute_passed_poll is ready for side-effects
--    (Basically keeping the same logic from v2, but ensuring it's defined correctly)
CREATE OR REPLACE FUNCTION fn_execute_passed_poll()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger on transition to 'passed' and if not already executed
  IF NEW.status = 'passed'
     AND OLD.status IS DISTINCT FROM 'passed'
     AND NEW.is_executed = FALSE
  THEN
    CASE NEW.poll_type
      WHEN 'kick_member' THEN
        -- Remove the target from the group
        DELETE FROM group_members
        WHERE group_id = NEW.group_id
          AND user_id  = NEW.target_user_id;

        -- Record in bans
        INSERT INTO group_bans (group_id, user_id, banned_by, reason)
        VALUES (
          NEW.group_id,
          NEW.target_user_id,
          NEW.created_by,
          'Removed by group vote: ' || COALESCE(NEW.description, 'No reason provided')
        )
        ON CONFLICT (group_id, user_id) DO UPDATE
          SET reason     = EXCLUDED.reason,
              banned_by  = EXCLUDED.banned_by;

      -- make_admin, remove_admin can be added here...
      WHEN 'make_admin' THEN
        UPDATE group_members
        SET is_admin = TRUE,
            can_add_members = TRUE,
            can_remove_members = TRUE,
            can_edit_group = TRUE
        WHERE group_id = NEW.group_id AND user_id = NEW.target_user_id;

      WHEN 'remove_admin' THEN
        UPDATE group_members
        SET is_admin = FALSE,
            can_add_members = FALSE,
            can_remove_members = FALSE,
            can_edit_group = FALSE
        WHERE group_id = NEW.group_id AND user_id = NEW.target_user_id;

      ELSE
        NULL;
    END CASE;

    NEW.is_executed  := TRUE;
    NEW.executed_at  := NOW();
    NEW.updated_at   := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ==============================================================================
--                    5th March, 2:45PM
-- ==============================================================================

SELECT
    tg.tgname AS trigger_name,
    p.proname AS function_name,
    pg_get_triggerdef(tg.oid) AS trigger_definition
FROM pg_trigger tg
JOIN pg_proc p ON p.oid = tg.tgfoid
JOIN pg_class c ON c.oid = tg.tgrelid
WHERE c.relname = 'votes'
AND NOT tg.tgisinternal;


SELECT
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname IN (
    SELECT proname
    FROM pg_proc
    WHERE oid IN (
        SELECT tgfoid
        FROM pg_trigger tg
        JOIN pg_class c ON c.oid = tg.tgrelid
        WHERE c.relname = 'votes'
        AND NOT tg.tgisinternal
    )
);


SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname ILIKE '%vote%';


SELECT
    c.relname AS table_name,
    tg.tgname AS trigger_name,
    p.proname AS function_name,
    pg_get_triggerdef(tg.oid)
FROM pg_trigger tg
JOIN pg_class c ON c.oid = tg.tgrelid
JOIN pg_proc p ON p.oid = tg.tgfoid
WHERE c.relname = 'votes'
AND NOT tg.tgisinternal;

DROP TRIGGER IF EXISTS trigger_update_poll_stats ON votes;
DROP FUNCTION IF EXISTS update_poll_stats_after_vote();

CREATE OR REPLACE FUNCTION public.create_poll(
    p_group_id uuid,
    p_created_by uuid,
    p_target_user_id uuid,
    p_poll_type character varying,
    p_title character varying,
    p_description text DEFAULT NULL,
    p_duration_hours integer DEFAULT 6
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_poll_id UUID;
    v_group_members INTEGER;
    v_is_admin BOOLEAN;
    v_target_is_member BOOLEAN;
BEGIN
    -- Check if creator is admin
    SELECT EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = p_group_id
        AND user_id = p_created_by
        AND is_admin = TRUE
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Only admins can create polls';
    END IF;

    -- Check target membership
    IF p_poll_type IN ('kick_member','make_admin','remove_admin','object_removal') THEN
        SELECT EXISTS (
            SELECT 1 FROM group_members
            WHERE group_id = p_group_id
            AND user_id = p_target_user_id
        ) INTO v_target_is_member;

        IF NOT v_target_is_member THEN
            RAISE EXCEPTION 'Target user is not a group member';
        END IF;
    END IF;

    -- Create poll (NO votes_required anymore)
    INSERT INTO polls (
        group_id,
        created_by,
        target_user_id,
        poll_type,
        title,
        description,
        expires_at
    )
    VALUES (
        p_group_id,
        p_created_by,
        p_target_user_id,
        p_poll_type,
        p_title,
        p_description,
        NOW() + (p_duration_hours || ' hours')::INTERVAL
    )
    RETURNING poll_id INTO v_poll_id;

    RETURN v_poll_id;
END;
$$;

DROP FUNCTION IF EXISTS public.get_active_polls(uuid);

CREATE FUNCTION public.get_active_polls(p_group_id uuid)
RETURNS TABLE(
    poll_id uuid,
    created_by uuid,
    target_user_id uuid,
    poll_type character varying,
    title character varying,
    description text,
    votes_for integer,
    votes_against integer,
    total_voters integer,
    status character varying,
    created_at timestamp with time zone,
    expires_at timestamp with time zone,
    time_remaining interval,
    creator_name character varying,
    target_name character varying,
    has_voted boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid()::UUID;

    RETURN QUERY
    SELECT
        p.poll_id,
        p.created_by,
        p.target_user_id,
        p.poll_type,
        p.title,
        p.description,
        p.votes_for,
        p.votes_against,
        p.total_voters,
        p.status,
        p.created_at,
        p.expires_at,
        p.expires_at - NOW(),
        uc.name,
        ut.name,
        EXISTS (
            SELECT 1
            FROM votes v
            WHERE v.poll_id = p.poll_id
            AND v.user_id = current_user_id
        )
    FROM polls p
    JOIN users uc ON p.created_by = uc.user_id
    LEFT JOIN users ut ON p.target_user_id = ut.user_id
    WHERE p.group_id = p_group_id
    AND p.status = 'active'
    ORDER BY p.expires_at ASC;
END;
$$;


SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.prosrc ILIKE '%votes_required%';



CREATE OR REPLACE FUNCTION public.check_and_expire_polls()
RETURNS TABLE(
    poll_id uuid,
    old_status character varying,
    new_status character varying,
    decision_method text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    UPDATE polls
    SET status =
        CASE
            WHEN votes_for > votes_against THEN 'passed'
            WHEN votes_for < votes_against THEN 'failed'
            ELSE CASE
                    WHEN random() < 0.5 THEN 'passed'
                    ELSE 'failed'
                 END
        END,
        updated_at = NOW()
    WHERE status = 'active'
    AND expires_at <= NOW()
    RETURNING
        polls.poll_id,
        'active'::VARCHAR,
        polls.status,
        CASE
            WHEN votes_for > votes_against THEN 'majority_for'
            WHEN votes_for < votes_against THEN 'majority_against'
            ELSE 'coin_flip'
        END;
END;
$$;



CREATE OR REPLACE FUNCTION public.manage_poll_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Prevent updates on expired polls unless status is being resolved
    IF OLD.status = 'active'
       AND OLD.expires_at <= NOW()
       AND NEW.status = 'active'
    THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;






