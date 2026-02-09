import type { Request, Response } from 'express';
import { pool, query } from '../lib/db.js';
import { ApiError } from '../utils/error.util.js';
import { io } from '../index.js';

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
        group_dp_url?.trim() || null,
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
        ) as sender
      FROM chat_messages cm
      LEFT JOIN users u ON cm.sender_id = u.user_id
      WHERE cm.group_id = $1
      ${before ? 'AND cm.created_at < $4' : ''}
      AND cm.is_deleted = false
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
