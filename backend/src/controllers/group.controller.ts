// ============================================================
// Get poll results (for General polls: aggregate votes per option)
// ============================================================
export const getPollResults = async (req: Request, res: Response) => {
  const { groupId, pollId } = req.params;
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  // Confirm user is a group member
  const memberCheck = await query(
    `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );
  if (memberCheck.rows.length === 0) throw new ApiError(403, 'You are not a member of this group');

  // Get poll
  const pollRes = await query(`SELECT * FROM polls WHERE poll_id = $1 AND group_id = $2`, [pollId, groupId]);
  if (pollRes.rows.length === 0) throw new ApiError(404, 'Poll not found');
  const poll = pollRes.rows[0];

  if (poll.poll_type === 'General') {
    // Get options
    const optionsRes = await query(`SELECT * FROM poll_options WHERE poll_id = $1 ORDER BY option_order`, [pollId]);
    const options = optionsRes.rows;
    // Get vote counts per option
    const votesRes = await query(
      `SELECT option_id, COUNT(*) as votes FROM votes WHERE poll_id = $1 GROUP BY option_id`,
      [pollId]
    );
    const voteCounts: Record<string, number> = {};
    for (const v of votesRes.rows) voteCounts[v.option_id] = Number(v.votes);
    // Attach vote counts to options
    const optionsWithVotes = options.map(opt => ({ ...opt, votes: voteCounts[opt.option_id] || 0 }));
    res.json({ success: true, data: { poll, options: optionsWithVotes } });
  } else {
    // For non-General polls, return yes/no counts
    const votesRes = await query(
      `SELECT vote_value, COUNT(*) as votes FROM votes WHERE poll_id = $1 GROUP BY vote_value`,
      [pollId]
    );
    const counts: Record<string, number> = {};
    for (const v of votesRes.rows) counts[String(v.vote_value)] = Number(v.votes);
    res.json({ success: true, data: { poll, votes: counts } });
  }
};
import type { Request, Response } from 'express';
import { pool, query } from '../lib/db.js';
import { ApiError } from '../utils/error.util.js';
import { uploadToCloudinary, deleteFromCloudinary, extractPublicId, getDefaultGroupDP } from '../utils/cloudinary.util.js';
import { getAvatarUrl, isValidPresetAvatar, getRandomAvatar } from '../utils/avatar.util.js';
import { io } from '../index.js';
import multer from 'multer';

// Create a new group (public or private)
export const createGroup = async (req: Request, res: Response) => {
  const { group_name, group_desc, group_dp_url, is_public, max_members = 500 } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  if (!group_name || group_name.trim().length === 0) {
    throw new ApiError(400, 'Group name is required');
  }

  if (max_members < 2 || max_members > 500) {
    throw new ApiError(400, 'Max members must be between 2 and 500');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create the group
    const groupResult = await client.query(
      `INSERT INTO groups (
        group_name, 
        group_desc, 
        group_dp_url,
        is_public, 
        created_by, 
        max_members
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        group_name.trim(),
        group_desc?.trim() || '',
        group_dp_url?.trim() || getDefaultGroupDP(),
        is_public === true,
        userId,
        max_members
      ]
    );

    const group = groupResult.rows[0];

    // Add creator as owner and admin
    await client.query(
      `INSERT INTO group_members (
        group_id,
        user_id,
        is_admin,
        is_owner,
        is_anonymous
      ) VALUES ($1, $2, true, true, false)`,
      [group.group_id, userId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: { group }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating group:', error);
    throw new ApiError(500, error.message || 'Failed to create group');
  } finally {
    client.release();
  }
};

// Get all public groups
export const getPublicGroups = async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT 
        g.group_id,
        g.group_name,
        g.group_desc,
        g.group_dp_url,
        g.is_public,
        g.max_members,
        g.created_at,
        g.updated_at,
        u.name as creator_name,
        u.roll_no as creator_roll_no,
        COUNT(DISTINCT gm.member_id) as member_count
      FROM groups g
      LEFT JOIN users u ON g.created_by = u.user_id
      LEFT JOIN group_members gm ON g.group_id = gm.group_id
      WHERE g.is_public = true AND g.is_active = true
      GROUP BY g.group_id, u.name, u.roll_no
      ORDER BY g.created_at DESC`
    );

    res.json({
      success: true,
      data: { groups: result.rows }
    });
  } catch (error: any) {
    console.error('Error fetching public groups:', error);
    throw new ApiError(500, error.message || 'Failed to fetch public groups');
  }
};

// Get groups the user is a member of
export const getMyGroups = async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  try {
    const result = await query(
      `SELECT 
        g.group_id,
        g.group_name,
        g.group_desc,
        g.group_dp_url,
        g.is_public,
        g.max_members,
        g.created_at,
        gm.is_admin,
        gm.is_owner,
        gm.is_anonymous,
        gm.joined_at,
        COUNT(DISTINCT gm2.member_id) as member_count
      FROM groups g
      INNER JOIN group_members gm ON g.group_id = gm.group_id
      LEFT JOIN group_members gm2 ON g.group_id = gm2.group_id
      WHERE gm.user_id = $1 AND g.is_active = true
      GROUP BY g.group_id, gm.is_admin, gm.is_owner, gm.is_anonymous, gm.joined_at
      ORDER BY gm.joined_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: { groups: result.rows }
    });
  }
  catch (error: any) {
    console.error('Error fetching user groups:', error);
    throw new ApiError(500, error.message || 'Failed to fetch groups');
  }
};

// Get group details
export const getGroupDetails = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  try {
    // Get group info
    const groupResult = await query(
      `SELECT 
        g.*,
        u.name as creator_name,
        u.roll_no as creator_roll_no,
        COUNT(DISTINCT gm.member_id) as member_count,
        CASE 
          WHEN gm_user.user_id IS NOT NULL THEN true 
          ELSE false 
        END as is_member,
        COALESCE(gm_user.is_admin, false) as user_is_admin,
        COALESCE(gm_user.is_owner, false) as user_is_owner
      FROM groups g
      LEFT JOIN users u ON g.created_by = u.user_id
      LEFT JOIN group_members gm ON g.group_id = gm.group_id
      LEFT JOIN group_members gm_user ON g.group_id = gm_user.group_id AND gm_user.user_id = $2
      WHERE g.group_id = $1 AND g.is_active = true
      GROUP BY g.group_id, u.name, u.roll_no, gm_user.user_id, gm_user.is_admin, gm_user.is_owner`,
      [groupId, userId]
    );

    if (groupResult.rows.length === 0) {
      throw new ApiError(404, 'Group not found');
    }

    const group = groupResult.rows[0];

    // If group is private and user is not a member, don't show details
    if (!group.is_public && !group.is_member) {
      throw new ApiError(403, 'Access denied');
    }

    res.json({
      success: true,
      data: { group }
    });
  } catch (error: any) {
    console.error('Error fetching group details:', error);
    throw error;
  }
};

// Join a public group
export const joinGroup = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { is_anonymous = false } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if group exists and is public
    const groupResult = await client.query(
      `SELECT * FROM groups WHERE group_id = $1 AND is_active = true`,
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      throw new ApiError(404, 'Group not found');
    }

    const group = groupResult.rows[0];

    if (!group.is_public) {
      throw new ApiError(403, 'Cannot join private group without invitation');
    }

    // Check if already a member
    const memberCheck = await client.query(
      `SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (memberCheck.rows.length > 0) {
      throw new ApiError(400, 'Already a member of this group');
    }

    // Check member count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM group_members WHERE group_id = $1`,
      [groupId]
    );

    if (parseInt(countResult.rows[0].count) >= group.max_members) {
      throw new ApiError(400, 'Group is full');
    }

    // Create anonymous identity if joining anonymously
    let anonymousIdentityId = null;
    if (is_anonymous) {
      const userResult = await client.query(
        `SELECT gender FROM users WHERE user_id = $1`,
        [userId]
      );

      const anonymousResult = await client.query(
        `INSERT INTO anonymous_identities (
          user_id,
          group_id,
          random_string,
          display_gender
        ) VALUES ($1, $2, $3, $4)
        RETURNING identity_id`,
        [
          userId,
          groupId,
          `anon_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`,
          userResult.rows[0].gender
        ]
      );

      anonymousIdentityId = anonymousResult.rows[0].identity_id;
    }

    // Add user as member
    await client.query(
      `INSERT INTO group_members (
        group_id,
        user_id,
        is_admin,
        is_owner,
        is_anonymous,
        anonymous_identity_id
      ) VALUES ($1, $2, false, false, $3, $4)`,
      [groupId, userId, is_anonymous, anonymousIdentityId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Joined group successfully'
    });
  }
  catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error joining group:', error);
    throw error;
  }
  finally {
    client.release();
  }
};

// Add member to group (for private groups or admin invites)
export const addMemberToGroup = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { user_id, is_anonymous = false } = req.body;
  const adminUserId = req.user?.userId;

  if (!adminUserId) {
    throw new ApiError(401, 'Unauthorized');
  }

  if (!user_id) {
    throw new ApiError(400, 'User ID is required');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if group exists
    const groupResult = await client.query(
      `SELECT * FROM groups WHERE group_id = $1 AND is_active = true`,
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      throw new ApiError(404, 'Group not found');
    }

    const group = groupResult.rows[0];

    // Check if requester is admin or owner of the group
    const adminCheck = await client.query(
      `SELECT is_admin, is_owner FROM group_members 
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, adminUserId]
    );

    if (adminCheck.rows.length === 0 || (!adminCheck.rows[0].is_admin && !adminCheck.rows[0].is_owner)) {
      throw new ApiError(403, 'Only group admins can add members');
    }

    // Check if user to be added exists
    const userExists = await client.query(
      `SELECT user_id, gender FROM users WHERE user_id = $1`,
      [user_id]
    );

    if (userExists.rows.length === 0) {
      throw new ApiError(404, 'User not found');
    }

    // Check if already a member
    const memberCheck = await client.query(
      `SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, user_id]
    );

    if (memberCheck.rows.length > 0) {
      throw new ApiError(400, 'User is already a member of this group');
    }

    // Check member count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM group_members WHERE group_id = $1`,
      [groupId]
    );

    if (parseInt(countResult.rows[0].count) >= group.max_members) {
      throw new ApiError(400, 'Group is full');
    }

    // Create anonymous identity if adding as anonymous
    let anonymousIdentityId = null;
    if (is_anonymous) {
      const anonymousResult = await client.query(
        `INSERT INTO anonymous_identities (
          user_id,
          group_id,
          random_string,
          display_gender
        ) VALUES ($1, $2, $3, $4)
        RETURNING identity_id`,
        [
          user_id,
          groupId,
          `anon_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`,
          userExists.rows[0].gender
        ]
      );

      anonymousIdentityId = anonymousResult.rows[0].identity_id;
    }

    // Add user as member
    await client.query(
      `INSERT INTO group_members (
        group_id,
        user_id,
        is_admin,
        is_owner,
        is_anonymous,
        anonymous_identity_id
      ) VALUES ($1, $2, false, false, $3, $4)`,
      [groupId, user_id, is_anonymous, anonymousIdentityId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Member added successfully'
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error adding member to group:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Get group members (for admins/owners)
export const getGroupMembers = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  try {
    // Check if user is a member of the group
    const memberCheck = await query(
      `SELECT is_admin, is_owner FROM group_members 
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      throw new ApiError(403, 'You must be a member to view group members');
    }

    // Get all members
    const result = await query(
      `SELECT 
        gm.member_id,
        gm.user_id,
        gm.is_admin,
        gm.is_owner,
        gm.is_anonymous,
        gm.joined_at,
        u.name,
        u.roll_no,
        u.dp_url,
        u.branch,
        ai.random_string as anonymous_name,
        ai.display_gender as anonymous_gender
      FROM group_members gm
      INNER JOIN users u ON gm.user_id = u.user_id
      LEFT JOIN anonymous_identities ai ON gm.anonymous_identity_id = ai.identity_id
      WHERE gm.group_id = $1
      ORDER BY gm.is_owner DESC, gm.is_admin DESC, gm.joined_at ASC`,
      [groupId]
    );

    res.json({
      success: true,
      data: { members: result.rows }
    });
  } catch (error: any) {
    console.error('Error fetching group members:', error);
    throw error;
  }
};

// Remove member from group (for admins/owners, private groups only)
export const removeMemberFromGroup = async (req: Request, res: Response) => {
  const { groupId, memberId } = req.params;
  const adminUserId = req.user?.userId;

  if (!adminUserId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if group is private
    const groupCheck = await client.query(
      `SELECT is_public FROM groups WHERE group_id = $1`,
      [groupId]
    );

    if (groupCheck.rows.length === 0) {
      throw new ApiError(404, 'Group not found');
    }

    if (groupCheck.rows[0].is_public) {
      throw new ApiError(403, 'Cannot remove members from public groups. Members must leave on their own.');
    }

    // Check if requester is admin or owner
    const adminCheck = await client.query(
      `SELECT is_admin, is_owner FROM group_members 
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, adminUserId]
    );

    if (adminCheck.rows.length === 0 || (!adminCheck.rows[0].is_admin && !adminCheck.rows[0].is_owner)) {
      throw new ApiError(403, 'Only group admins can remove members');
    }

    // Get member to remove
    const memberToRemove = await client.query(
      `SELECT user_id, is_owner, is_admin FROM group_members 
       WHERE group_id = $1 AND member_id = $2`,
      [groupId, memberId]
    );

    if (memberToRemove.rows.length === 0) {
      throw new ApiError(404, 'Member not found in this group');
    }

    // Prevent removing the owner
    if (memberToRemove.rows[0].is_owner) {
      throw new ApiError(403, 'Cannot remove the group owner');
    }

    // Prevent non-owners from removing admins
    if (memberToRemove.rows[0].is_admin && !adminCheck.rows[0].is_owner) {
      throw new ApiError(403, 'Only the group owner can remove admins');
    }

    // Remove the member
    await client.query(
      `DELETE FROM group_members WHERE group_id = $1 AND member_id = $2`,
      [groupId, memberId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error removing member from group:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Leave group (for all members)
export const leaveGroup = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if user is a member
    const memberCheck = await client.query(
      `SELECT member_id, is_owner, is_admin FROM group_members 
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      throw new ApiError(400, 'You are not a member of this group');
    }

    const member = memberCheck.rows[0];

    // Remove the member
    await client.query(
      `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    // Check remaining members count
    const remainingMembers = await client.query(
      `SELECT COUNT(*) as count, 
              COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_count
       FROM group_members WHERE group_id = $1`,
      [groupId]
    );

    const memberCount = parseInt(remainingMembers.rows[0].count);
    const adminCount = parseInt(remainingMembers.rows[0].admin_count);

    // If no members left, delete the group
    if (memberCount === 0) {
      await client.query(
        `UPDATE groups SET is_active = false WHERE group_id = $1`,
        [groupId]
      );
    }
    // If member was admin and no admins left, promote oldest member to admin
    else if (member.is_admin && adminCount === 0) {
      await client.query(
        `UPDATE group_members 
         SET is_admin = true, is_owner = true
         WHERE member_id = (
           SELECT member_id FROM group_members 
           WHERE group_id = $1 
           ORDER BY joined_at ASC 
           LIMIT 1
         )`,
        [groupId]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: memberCount === 0 ? 'Left group and group deleted' : 'Left group successfully'
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error leaving group:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Update group details (for admins/owners)
export const updateGroup = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { group_name, group_desc, group_dp_url, max_members } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if user is admin or owner
    const adminCheck = await client.query(
      `SELECT is_admin, is_owner FROM group_members 
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (adminCheck.rows.length === 0 || (!adminCheck.rows[0].is_admin && !adminCheck.rows[0].is_owner)) {
      throw new ApiError(403, 'Only group admins can update group details');
    }

    // Validate max_members if provided
    if (max_members !== undefined && (max_members < 2 || max_members > 500)) {
      throw new ApiError(400, 'Max members must be between 2 and 500');
    }

    // Check current member count if max_members is being reduced
    if (max_members !== undefined) {
      const memberCount = await client.query(
        `SELECT COUNT(*) as count FROM group_members WHERE group_id = $1`,
        [groupId]
      );

      if (parseInt(memberCount.rows[0].count) > max_members) {
        throw new ApiError(400, 'Cannot set max members below current member count');
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (group_name !== undefined && group_name.trim().length > 0) {
      updates.push(`group_name = $${paramCount}`);
      values.push(group_name.trim());
      paramCount++;
    }

    if (group_desc !== undefined) {
      updates.push(`group_desc = $${paramCount}`);
      values.push(group_desc.trim());
      paramCount++;
    }

    if (group_dp_url !== undefined) {
      updates.push(`group_dp_url = $${paramCount}`);
      values.push(group_dp_url?.trim() || null);
      paramCount++;
    }

    if (max_members !== undefined) {
      updates.push(`max_members = $${paramCount}`);
      values.push(max_members);
      paramCount++;
    }

    if (updates.length === 0) {
      throw new ApiError(400, 'No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(groupId);

    const updateQuery = `
      UPDATE groups 
      SET ${updates.join(', ')}
      WHERE group_id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(updateQuery, values);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Group updated successfully',
      data: { group: result.rows[0] }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating group:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Get group messages
export const getGroupMessages = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { limit = 50, before } = req.query;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  try {
    // Ensure user is a member of the group
    const memberCheck = await pool.query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      throw new ApiError(403, 'Access denied to this group');
    }

    const result = await pool.query(
      `SELECT 
        cm.*,
        (cm.sender_id = $2) as is_my_message,
        jsonb_build_object(
          'user_id', u.user_id,
          'name', u.name,
          'roll_no', u.roll_no,
          'display_gender', u.gender,
          'dp_url', u.dp_url,
          'is_anonymous', false
        ) as sender,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'emoji', r.emoji,
                'count', r.count,
                'users', r.users
              )
            )
            FROM (
              SELECT 
                mr.emoji,
                COUNT(*)::int as count,
                json_agg(
                  json_build_object(
                    'user_id', ru.user_id,
                    'name', ru.name
                  ) ORDER BY mr.created_at
                ) as users
              FROM message_reactions mr
              JOIN users ru ON mr.user_id = ru.user_id
              WHERE mr.message_id = cm.message_id
              GROUP BY mr.emoji
            ) r
          ),
          '[]'::json
        ) as reactions
      FROM chat_messages cm
      LEFT JOIN users u ON cm.sender_id = u.user_id
      WHERE cm.group_id = $1
      ${before ? 'AND cm.created_at < $4' : ''}
      AND cm.is_deleted = false
      AND cm.deleted_for_everyone = false
      AND NOT ($2::uuid = ANY(COALESCE(cm.deleted_for_user_ids, ARRAY[]::uuid[])))
      ORDER BY cm.created_at DESC
      LIMIT $3`,
      before ? [groupId, userId, limit, before] : [groupId, userId, limit]
    );

    res.json({
      success: true,
      data: {
        messages: result.rows.reverse()
      }
    });
  } catch (error: any) {
    console.error('Error fetching group messages:', error);
    throw error;
  }
};

// Send a group message
export const sendGroupMessage = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.user?.userId;
  const {
    encryptedContent,
    contentIv,
    contentAuthTag,
    messageType = 'text',
    mediaUrl,
    mediaSize,
    mediaMimeType,
    thumbnailUrl,
    keyId
  } = req.body;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  if (!encryptedContent || !contentIv || !contentAuthTag) {
    throw new ApiError(400, 'Missing required fields');
  }

  // Ensure user is a member of the group
  const memberCheck = await pool.query(
    `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );

  if (memberCheck.rows.length === 0) {
    throw new ApiError(403, 'Access denied to this group');
  }

  const result = await pool.query(
    `INSERT INTO chat_messages (
      group_id,
      sender_id,
      message_type,
      encrypted_content,
      content_iv,
      content_auth_tag,
      media_url,
      media_size,
      media_mime_type,
      thumbnail_url,
      is_anonymous,
      anonymous_identity_id,
      key_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, NULL, $11)
    RETURNING *`,
    [
      groupId,
      userId,
      messageType,
      encryptedContent,
      contentIv,
      contentAuthTag,
      mediaUrl,
      mediaSize,
      mediaMimeType,
      thumbnailUrl,
      keyId
    ]
  );

  const message = result.rows[0];

  // Emit socket event
  if (io) {
    const userInfo = await pool.query(
      'SELECT name, gender, dp_url FROM users WHERE user_id = $1',
      [userId]
    );

    const senderInfo = {
      user_id: userId,
      name: userInfo.rows[0].name,
      display_gender: userInfo.rows[0].gender,
      dp_url: userInfo.rows[0].dp_url,
      is_anonymous: false
    };

    io.to(`group:${groupId}`).emit('new-group-message', {
      ...message,
      sender: senderInfo
    });
  }

  res.json({
    success: true,
    data: message
  });
};

// Promote member to admin (for owners only)
export const promoteMemberToAdmin = async (req: Request, res: Response) => {
  const { groupId, memberId } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if user is owner
    const ownerCheck = await client.query(
      `SELECT is_owner FROM group_members 
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (ownerCheck.rows.length === 0 || !ownerCheck.rows[0].is_owner) {
      throw new ApiError(403, 'Only group owners can promote members to admin');
    }

    // Check if member exists
    const memberCheck = await client.query(
      `SELECT is_admin FROM group_members 
       WHERE group_id = $1 AND member_id = $2`,
      [groupId, memberId]
    );

    if (memberCheck.rows.length === 0) {
      throw new ApiError(404, 'Member not found in this group');
    }

    if (memberCheck.rows[0].is_admin) {
      throw new ApiError(400, 'Member is already an admin');
    }

    // Promote to admin
    await client.query(
      `UPDATE group_members 
       SET is_admin = true 
       WHERE group_id = $1 AND member_id = $2`,
      [groupId, memberId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Member promoted to admin successfully'
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error promoting member:', error);
    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// Create a poll (admins only)
// ============================================================
export const createPoll = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { poll_type, title, description, target_user_id, expires_in_hours = 6, options } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  // Validate poll type
  const validPollTypes = ['kick_member', 'make_admin', 'remove_admin', 'General'];
  if (!validPollTypes.includes(poll_type)) {
    throw new ApiError(400, 'Invalid poll type');
  }

  if (!title || title.trim().length === 0) {
    throw new ApiError(400, 'Poll title is required');
  }

  // expires_in_hours: min 1, max 24, default 6
  const hoursNum = Math.min(24, Math.max(1, Number(expires_in_hours) || 6));

  // For General poll, validate options
  if (poll_type === 'General') {
    if (!Array.isArray(options) || options.length < 2) {
      throw new ApiError(400, 'General polls require at least 2 options');
    }
    for (const opt of options) {
      if (typeof opt !== 'string' || !opt.trim()) {
        throw new ApiError(400, 'Each option must be a non-empty string');
      }
    }
  }

  // Polls that affect a specific member must have a target
  const memberPollTypes = ['kick_member', 'make_admin', 'remove_admin'];
  if (memberPollTypes.includes(poll_type) && !target_user_id) {
    throw new ApiError(400, `Poll type '${poll_type}' requires a target_user_id`);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Confirm requesting user is a member of this group
    const memberRow = await client.query(
      `SELECT is_admin, is_owner FROM group_members
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );
    if (memberRow.rows.length === 0) {
      throw new ApiError(403, 'You are not a member of this group');
    }

    // Relaxed permission: Any member can create governance polls.
    // If we had sensitive "admin-only" polls, we'd check them here.
    // The current types (kick_member, make_admin, remove_admin, object_removal) are democratic.
    const groupMember = memberRow.rows[0];

    // 2. If targeting someone, validate target membership & prevent self-targeting
    if (target_user_id) {
      if (target_user_id === userId) {
        throw new ApiError(400, 'You cannot create a poll targeting yourself');
      }
      const targetCheck = await client.query(
        `SELECT is_owner FROM group_members WHERE group_id = $1 AND user_id = $2`,
        [groupId, target_user_id]
      );
      if (targetCheck.rows.length === 0) {
        throw new ApiError(404, 'Target user is not a member of this group');
      }
      if (targetCheck.rows[0].is_owner) {
        throw new ApiError(403, 'The group owner cannot be targeted by polls');
      }
    }

    // 3. Guard: no duplicate active poll for same (group, target, type)
    //    (DB unique index also enforces this, but we give a friendly message)
    const dupCheck = await client.query(
      `SELECT poll_id FROM polls
       WHERE group_id = $1
         AND poll_type = $2
         AND status = 'active'
         AND ($3::UUID IS NULL OR target_user_id = $3::UUID)`,
      [groupId, poll_type, target_user_id || null]
    );
    if (dupCheck.rows.length > 0) {
      throw new ApiError(400, 'An active poll of this type already exists for this target');
    }

    // 4. Get current member count for total_voters display
    const memberCountResult = await client.query(
      `SELECT COUNT(*) as count FROM group_members WHERE group_id = $1`,
      [groupId]
    );
    const memberCount = parseInt(memberCountResult.rows[0].count);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + hoursNum);

    // 5. Insert the poll
    const pollResult = await client.query(
      `INSERT INTO polls (
        group_id, created_by, target_user_id, poll_type,
        title, description, total_voters, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        groupId,
        userId,
        target_user_id || null,
        poll_type,
        title.trim(),
        description?.trim() || null,
        memberCount,
        expiresAt,
      ]
    );

    const poll = pollResult.rows[0];

    // If General poll, insert options
    if (poll_type === 'General') {
      for (let i = 0; i < options.length; i++) {
        await client.query(
          `INSERT INTO poll_options (poll_id, option_text, option_order) VALUES ($1, $2, $3)`,
          [poll.poll_id, options[i], i]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch options for response if General
    let pollWithOptions = poll;
    if (poll_type === 'General') {
      const optsRes = await client.query(`SELECT * FROM poll_options WHERE poll_id = $1 ORDER BY option_order`, [poll.poll_id]);
      pollWithOptions = { ...poll, options: optsRes.rows };
    }

    io.to(`group:${groupId}`).emit('new-poll', pollWithOptions);

    res.status(201).json({
      success: true,
      message: 'Poll created successfully',
      data: pollWithOptions,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating poll:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, error.message || 'Failed to create poll');
  } finally {
    client.release();
  }
};

// Get all polls for a group
export const getGroupPolls = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.user?.userId;
  const { status = 'active' } = req.query;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  try {
    // Check if user is a member of the group
    const memberCheck = await query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      throw new ApiError(403, 'You are not a member of this group');
    }

    // Get polls with creator info and user's vote status
    let queryText = `
      SELECT 
        p.*,
        u.name as creator_name,
        u.roll_no as creator_roll_no,
        tu.name as target_name,
        tu.roll_no as target_roll_no,
        EXISTS (
          SELECT 1 FROM votes v 
          WHERE v.poll_id = p.poll_id 
          AND v.user_id = $2
        ) as has_voted,
        (
          SELECT vote_value FROM votes v 
          WHERE v.poll_id = p.poll_id 
          AND v.user_id = $2
        ) as user_vote
      FROM polls p
      JOIN users u ON p.created_by = u.user_id
      LEFT JOIN users tu ON p.target_user_id = tu.user_id
      WHERE p.group_id = $1
    `;

    const params: any[] = [groupId, userId];

    if (status && status !== 'all') {
      queryText += ` AND p.status = $3`;
      params.push(status);
    }

    queryText += ` ORDER BY p.created_at DESC`;

    const result = await query(queryText, params);

    // For General polls, fetch options
    const polls = result.rows;
    const pollIds = polls.filter(p => p.poll_type === 'General').map(p => p.poll_id);
    let optionsMap: Record<string, any[]> = {};
    if (pollIds.length > 0) {
      const optsRes = await query(
        `SELECT * FROM poll_options WHERE poll_id = ANY($1) ORDER BY option_order`,
        [pollIds]
      );
      // for (const opt of optsRes.rows) {
      //   if (opt.poll_id !== undefined) {
      //     if (!optionsMap[opt.poll_id]) optionsMap[opt.poll_id] = [];
      //     optionsMap[opt.poll_id].push(opt);
      //   }
      // }
      for (const opt of optsRes.rows) {
        const pollId = opt.poll_id;
        if (pollId !== undefined && pollId !== null) {
          if (!optionsMap[pollId]) optionsMap[pollId] = [];
          optionsMap[pollId].push(opt);
        }
      }
    }
    const pollsWithOptions = polls.map(p =>
      p.poll_type === 'General' ? { ...p, options: optionsMap[p.poll_id] || [] } : p
    );

    res.json({
      success: true,
      data: pollsWithOptions
    });
  } 
  catch (error: any) {
    console.error('Error fetching group polls:', error);
    throw error;
  }
};

// ============================================================
// Vote on a poll
// ============================================================
export const voteOnPoll = async (req: Request, res: Response) => {
  const { groupId, pollId } = req.params;
  const { vote_value, option_id } = req.body; // For General: option_id, for others: vote_value
  const userId = req.user?.userId;

  if (!userId) throw new ApiError(401, 'Unauthorized');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Confirm user is a group member
    const memberCheck = await client.query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );
    if (memberCheck.rows.length === 0) throw new ApiError(403, 'You are not a member of this group');

    // 2. Fetch poll and lock it (prevents concurrent double-votes)
    const pollResult = await client.query(
      `SELECT poll_id, status, expires_at, poll_type, target_user_id
       FROM polls
       WHERE poll_id = $1 AND group_id = $2
       FOR UPDATE`,
      [pollId, groupId]
    );
    if (pollResult.rows.length === 0) throw new ApiError(404, 'Poll not found in this group');
    const poll = pollResult.rows[0];


    // 3. Guards
    if (poll.status !== 'active') {
      throw new ApiError(400, `Cannot vote on a ${poll.status} poll`);
    }
    if (new Date(poll.expires_at) <= new Date()) {
      // Expire inline so next caller sees the right status
      await client.query(
        `UPDATE polls SET status = 'expired', updated_at = NOW() WHERE poll_id = $1`,
        [pollId]
      );
      await client.query('COMMIT');
      io.to(`group:${groupId}`).emit('poll-expired', { poll_id: pollId, group_id: groupId });
      throw new ApiError(400, 'This poll has expired');
    }
    // Target of a kick poll cannot vote on their own removal
    if (poll.poll_type === 'kick_member' && poll.target_user_id === userId) {
      throw new ApiError(403, 'You cannot vote on a poll targeting you for removal');
    }

    let upsertResult, voteWasNew;
    if (poll.poll_type === 'General') {
      // Validate option_id
      if (!option_id) throw new ApiError(400, 'option_id is required for General polls');
      // Check option exists for this poll
      const optRes = await client.query(`SELECT 1 FROM poll_options WHERE poll_id = $1 AND option_id = $2`, [pollId, option_id]);
      if (optRes.rows.length === 0) throw new ApiError(400, 'Invalid option_id');
      upsertResult = await client.query(
        `INSERT INTO votes (poll_id, user_id, option_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (poll_id, user_id)
           WHERE user_id IS NOT NULL
         DO UPDATE SET option_id = EXCLUDED.option_id, voted_at = NOW()
         RETURNING (xmax = 0) AS inserted`,
        [pollId, userId, option_id]
      );
      voteWasNew = upsertResult.rows[0]?.inserted ?? true;
    } else {
      if (typeof vote_value !== 'boolean') {
        throw new ApiError(400, 'vote_value must be a boolean (true = yes, false = no)');
      }
      upsertResult = await client.query(
        `INSERT INTO votes (poll_id, user_id, vote_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (poll_id, user_id)
           WHERE user_id IS NOT NULL
         DO UPDATE SET vote_value = EXCLUDED.vote_value, voted_at = NOW()
         RETURNING (xmax = 0) AS inserted`,
        [pollId, userId, vote_value]
      );
      voteWasNew = upsertResult.rows[0]?.inserted ?? true;
    }

    // 5. Commit — stats trigger updates counters only. Status resolution happens at expiry.
    await client.query('COMMIT');

    // 6. Read final poll state
    const finalPoll = await query(
      `SELECT p.*,
              u.name  AS creator_name,
              tu.name AS target_name
       FROM polls p
       JOIN  users u  ON p.created_by      = u.user_id
       LEFT JOIN users tu ON p.target_user_id = tu.user_id
       WHERE p.poll_id = $1`,
      [pollId]
    );
    const updatedPoll = finalPoll.rows[0];

    // 7. Emit socket events
    io.to(`group:${groupId}`).emit('poll-updated', updatedPoll);

    res.json({
      success: true,
      message: voteWasNew ? 'Vote cast successfully' : 'Vote updated successfully',
      data: { poll: updatedPoll, user_vote: vote_value },
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error voting on poll:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, error.message || 'Failed to cast vote');
  } finally {
    client.release();
  }
};

// ============================================================
// Cancel a poll (creator or any admin)
// ============================================================
export const cancelPoll = async (req: Request, res: Response) => {
  const { groupId, pollId } = req.params;
  const { reason } = req.body;
  const userId = req.user?.userId;

  if (!userId) throw new ApiError(401, 'Unauthorized');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify membership
    const memberRow = await client.query(
      `SELECT is_admin, is_owner FROM group_members
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );
    if (memberRow.rows.length === 0) {
      throw new ApiError(403, 'You are not a member of this group');
    }
    const { is_admin, is_owner } = memberRow.rows[0];

    // Fetch poll
    const pollRow = await client.query(
      `SELECT poll_id, status, created_by FROM polls
       WHERE poll_id = $1 AND group_id = $2`,
      [pollId, groupId]
    );
    if (pollRow.rows.length === 0) {
      throw new ApiError(404, 'Poll not found');
    }
    const poll = pollRow.rows[0];

    if (poll.status !== 'active') {
      throw new ApiError(400, `Cannot cancel a ${poll.status} poll`);
    }

    // Authorization: poll creator OR group admin/owner
    const isCreator = poll.created_by === userId;
    if (!isCreator && !is_admin && !is_owner) {
      throw new ApiError(403, 'Only the poll creator or a group admin can cancel this poll');
    }

    await client.query(
      `UPDATE polls
       SET status = 'cancelled',
           cancelled_by = $1,
           cancellation_reason = $2,
           updated_at = NOW()
       WHERE poll_id = $3`,
      [userId, reason?.trim() || null, pollId]
    );

    await client.query('COMMIT');

    io.to(`group:${groupId}`).emit('poll-cancelled', {
      poll_id: pollId,
      group_id: groupId,
      cancelled_by: userId,
    });

    res.json({
      success: true,
      message: 'Poll cancelled successfully',
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error cancelling poll:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, error.message || 'Failed to cancel poll');
  } finally {
    client.release();
  }
};

// ============================================================
// Manually execute a passed (but not yet executed) poll — admins only
// Useful if auto-execution failed for any reason.
// ============================================================
export const executePoll = async (req: Request, res: Response) => {
  const { groupId, pollId } = req.params;
  const userId = req.user?.userId;

  if (!userId) throw new ApiError(401, 'Unauthorized');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Admin only
    const adminRow = await client.query(
      `SELECT is_admin, is_owner FROM group_members
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );
    if (adminRow.rows.length === 0) {
      throw new ApiError(403, 'You are not a member of this group');
    }
    if (!adminRow.rows[0].is_admin && !adminRow.rows[0].is_owner) {
      throw new ApiError(403, 'Only group admins can manually execute a poll');
    }

    // Fetch poll
    const pollRow = await client.query(
      `SELECT * FROM polls WHERE poll_id = $1 AND group_id = $2 FOR UPDATE`,
      [pollId, groupId]
    );
    if (pollRow.rows.length === 0) {
      throw new ApiError(404, 'Poll not found');
    }
    const poll = pollRow.rows[0];

    if (poll.status !== 'passed') {
      throw new ApiError(400, `Poll must be in 'passed' status to execute (current: ${poll.status})`);
    }
    if (poll.is_executed) {
      throw new ApiError(400, 'This poll has already been executed');
    }

    // Re-fire the DB execution trigger fn_execute_passed_poll by toggling status.
    // The trigger fires on: NEW.status='passed' AND OLD.status IS DISTINCT FROM 'passed'
    // AND NEW.is_executed=FALSE — so we reset is_executed then do the toggle.
    await client.query(
      `UPDATE polls SET is_executed = FALSE, updated_at = NOW() WHERE poll_id = $1`,
      [pollId]
    );
    await client.query(
      `UPDATE polls SET status = 'active', updated_at = NOW() WHERE poll_id = $1`,
      [pollId]
    );
    // This UPDATE fires fn_execute_passed_poll (BEFORE UPDATE OF status):
    // does the DELETE/INSERT/is_executed=TRUE inside the same transaction.
    await client.query(
      `UPDATE polls SET status = 'passed', updated_at = NOW() WHERE poll_id = $1`,
      [pollId]
    );

    await client.query('COMMIT');

    // Read final state and emit socket events
    const finalRow = await query(`SELECT * FROM polls WHERE poll_id = $1`, [pollId]);
    const fp = finalRow.rows[0];

    if (fp?.is_executed) {
      if (fp.poll_type === 'kick_member' && fp.target_user_id) {
        io.to(`group:${groupId}`).emit('member-removed', {
          group_id: groupId,
          user_id: fp.target_user_id,
          reason: 'poll_manual_execute',
          poll_id: pollId,
        });
      }
      io.to(`group:${groupId}`).emit('poll-executed', {
        poll_id: pollId,
        group_id: groupId,
        poll_type: fp.poll_type,
        executed_at: fp.executed_at,
      });
    }

    res.json({ success: true, message: 'Poll executed successfully' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error executing poll:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, error.message || 'Failed to execute poll');
  } finally {
    client.release();
  }
};


// Upload group picture (admins/owners only)
export const uploadGroupPicture = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  if (!req.file) {
    throw new ApiError(400, 'No image file provided');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if user is admin or owner
    const adminCheck = await client.query(
      `SELECT is_admin, is_owner FROM group_members 
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (adminCheck.rows.length === 0 || (!adminCheck.rows[0].is_admin && !adminCheck.rows[0].is_owner)) {
      throw new ApiError(403, 'Only group admins can update group picture');
    }

    // Get current group data
    const groupResult = await client.query(
      'SELECT group_dp_url FROM groups WHERE group_id = $1',
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      throw new ApiError(404, 'Group not found');
    }

    const currentDpUrl = groupResult.rows[0].group_dp_url;

    // Delete old image from Cloudinary if exists
    if (currentDpUrl) {
      const publicId = extractPublicId(currentDpUrl);
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    }

    // Upload new image to Cloudinary
    const uploadResult = await uploadToCloudinary(
      req.file.buffer,
      'group_pictures',
      `group_${groupId}_${Date.now()}`
    );

    // Update database with new image URL
    const updateResult = await client.query(
      `UPDATE groups 
       SET group_dp_url = $1, updated_at = NOW()
       WHERE group_id = $2
       RETURNING *`,
      [uploadResult.secure_url, groupId]
    );

    await client.query('COMMIT');

    // Emit socket event for real-time update
    io.to(`group-${groupId}`).emit('group-updated', updateResult.rows[0]);

    res.json({
      success: true,
      message: 'Group picture uploaded successfully',
      data: {
        group: updateResult.rows[0],
        imageUrl: uploadResult.secure_url
      }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error uploading group picture:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Delete group picture (admins/owners only)
export const deleteGroupPicture = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if user is admin or owner
    const adminCheck = await client.query(
      `SELECT is_admin, is_owner FROM group_members 
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (adminCheck.rows.length === 0 || (!adminCheck.rows[0].is_admin && !adminCheck.rows[0].is_owner)) {
      throw new ApiError(403, 'Only group admins can delete group picture');
    }

    // Get current group data
    const groupResult = await client.query(
      'SELECT group_dp_url FROM groups WHERE group_id = $1',
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      throw new ApiError(404, 'Group not found');
    }

    const currentDpUrl = groupResult.rows[0].group_dp_url;

    // Delete old image from Cloudinary if exists
    if (currentDpUrl) {
      const publicId = extractPublicId(currentDpUrl);
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    }

    // Update database to remove image URL
    const updateResult = await client.query(
      `UPDATE groups 
       SET group_dp_url = NULL, updated_at = NOW()
       WHERE group_id = $1
       RETURNING *`,
      [groupId]
    );

    await client.query('COMMIT');

    // Emit socket event for real-time update
    io.to(`group-${groupId}`).emit('group-updated', updateResult.rows[0]);

    res.json({
      success: true,
      message: 'Group picture deleted successfully',
      data: {
        group: updateResult.rows[0]
      }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error deleting group picture:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Configure Multer for memory storage
export const uploadGroup = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only image files are allowed') as any);
    }
  },
});

// Select preset avatar for group (admins/owners only)
export const selectGroupPresetAvatar = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.user?.userId;
  const { avatarId } = req.body;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if user is admin or owner
    const adminCheck = await client.query(
      `SELECT is_admin, is_owner FROM group_members 
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (adminCheck.rows.length === 0 || (!adminCheck.rows[0].is_admin && !adminCheck.rows[0].is_owner)) {
      throw new ApiError(403, 'Only group admins can update group picture');
    }

    // Validate avatar ID if provided, otherwise use random
    let selectedAvatarId = avatarId;

    if (avatarId) {
      if (!isValidPresetAvatar(avatarId)) {
        throw new ApiError(400, 'Invalid avatar ID');
      }
    } else {
      // No avatar selected, assign random
      selectedAvatarId = getRandomAvatar();
    }

    // Get current group data
    const groupResult = await client.query(
      'SELECT group_dp_url FROM groups WHERE group_id = $1',
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      throw new ApiError(404, 'Group not found');
    }

    const currentDpUrl = groupResult.rows[0].group_dp_url;

    // Delete old custom uploaded image from Cloudinary if exists (but not preset avatars)
    if (currentDpUrl) {
      const publicId = extractPublicId(currentDpUrl);
      if (publicId && !publicId.startsWith('avatars/')) {
        await deleteFromCloudinary(publicId);
      }
    }

    // Generate avatar URL
    const avatarUrl = getAvatarUrl(selectedAvatarId);

    // Update database with new avatar
    const updateResult = await client.query(
      `UPDATE groups 
       SET group_dp_url = $1, updated_at = NOW()
       WHERE group_id = $2
       RETURNING *`,
      [avatarUrl, groupId]
    );

    await client.query('COMMIT');

    // Emit socket event for real-time update
    io.to(`group-${groupId}`).emit('group-updated', updateResult.rows[0]);

    res.json({
      success: true,
      message: 'Group avatar selected successfully',
      data: {
        group: updateResult.rows[0],
        imageUrl: avatarUrl
      }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error selecting group avatar:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Upload group chat image to Cloudinary
export const uploadGroupChatImage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { groupId } = req.params;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    // Ensure user is a member of the group
    const memberCheck = await pool.query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      throw new ApiError(403, 'Access denied to this group');
    }

    if (!req.file) {
      throw new ApiError(400, 'No image file provided');
    }

    // Validate file size (5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      throw new ApiError(400, 'Image size must be less than 5MB');
    }

    // Upload to Cloudinary in chat_images folder with unique ID
    const randomStr = Math.random().toString(36).substring(2, 10);
    const uniqueId = `group_${groupId}_${userId}_${Date.now()}_${randomStr}`;
    const result = await uploadToCloudinary(
      req.file.buffer,
      'chat_images',
      uniqueId,
      true // Skip transformation for chat images
    );

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        size: req.file.size,
        mimeType: req.file.mimetype,
      }
    });

  } catch (error) {
    console.error('[ERROR] Upload group chat image error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to upload image');
  }
};
