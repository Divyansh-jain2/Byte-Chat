import { pool } from '../lib/db.js';
import { hashPassword } from '../utils/password.util.js';
import { generateUserKeyPair, encryptPrivateKey } from '../utils/key.util.js';

const seedData = async () => {
  try {
    console.log('[INIT] Starting seed data creation...\n');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('[CLEAR]  Clearing existing data...');

    // Disable audit triggers temporarily
    await pool.query('DROP TRIGGER IF EXISTS audit_users ON users');
    await pool.query('DROP TRIGGER IF EXISTS audit_groups ON groups');

    await pool.query('DELETE FROM group_members');
    await pool.query('DELETE FROM groups');
    await pool.query('DELETE FROM anonymous_identities');
    await pool.query('DELETE FROM group_session_keys');
    await pool.query('DELETE FROM chat_session_keys');
    await pool.query('DELETE FROM user_encryption_keys');
    await pool.query('DELETE FROM chat_conversations');
    await pool.query('DELETE FROM users');
    await pool.query('DELETE FROM audit_logs');

    console.log('[OK] Cleared all existing data\n');

    // Create 30 dummy users
    console.log('[USERS] Creating 30 dummy users...');
    const users = [];
    const branches = ['ECE', 'CSE', 'MEC'];
    const genders = ['male', 'female', 'other'];
    const degreeTypes = ['B', 'D', 'T']; // B=BTech, D=Dual, T=MTech
    const names = {
      male: ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Arnav', 'Ayaan', 'Krishna', 'Ishaan'],
      female: ['Aadhya', 'Saanvi', 'Ananya', 'Diya', 'Pari', 'Aaradhya', 'Navya', 'Myra', 'Aanya', 'Sara'],
      other: ['Arya', 'Reyansh', 'Avni']
    };

    const hashedPassword = await hashPassword('');
    console.log('[USERS] Hashed password created');
    for (let i = 1; i <= 30; i++) {
      const branch = branches[i % branches.length];
      const gender = genders[i % genders.length];
      const degreeType = degreeTypes[Math.floor((i - 1) / 10) % degreeTypes.length];
      const rollNo = `${degreeType}${String(i).padStart(5, '0')}`; // B00001, B00002, D00011, etc.

      const nameList = names[gender as keyof typeof names];
      const name = nameList[Math.floor(Math.random() * nameList.length)] + ' ' + (i > 9 ? 'Kumar' : 'Sharma');

      const dob = new Date(2004, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const bio = `Hey! I'm ${name}, a student at IIT Mandi. Love coding, music, and adventure! 🚀`;
      const avatarIndex = Math.floor(Math.random() * 60) + 1;
      const dpUrl = `https://res.cloudinary.com/dboibrtkv/image/upload/v1770869367/avatars/avatar-${avatarIndex}.svg`;

      const result = await pool.query(
        `INSERT INTO users (roll_no, name, gender, branch, password_hash, dp_url, dob, bio, is_verified, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, TRUE)
         RETURNING user_id, roll_no, name, gender`,
        [rollNo, name, gender, branch, hashedPassword, dpUrl, dob, bio]
      );

      users.push(result.rows[0]);

      // E2EE: Generate and store RSA keys for the dummy user
      const { publicKey, privateKey } = generateUserKeyPair();
      const encryptedPrivateKey = encryptPrivateKey(privateKey, '');

      await pool.query(
        `INSERT INTO user_encryption_keys (user_id, public_key, encrypted_private_key)
         VALUES ($1, $2, $3)`,
        [result.rows[0].user_id, publicKey, encryptedPrivateKey]
      );

      console.log(`  ✓ Created user ${i}/30: ${result.rows[0].name} (${result.rows[0].roll_no}) + E2EE Keys`);
    }

    console.log(`\n[OK] Created ${users.length} users\n`);

    // Create 10 groups (mix of public and private)
    console.log('[GROUPS] Creating 10 groups...');
    const groups = [];
    const groupThemes = [
      { name: 'CSE Hub 2023', desc: 'All CSE students batch 2023', public: true },
      { name: 'IIT Mandi Memes', desc: 'Dank memes and fun stuff 😂', public: true },
      { name: 'Campus Events', desc: 'All campus events and updates', public: true },
      { name: 'Study Group - DSA', desc: 'Data Structures & Algorithms practice', public: false },
      { name: 'Tech Talks', desc: 'Discuss latest in tech', public: true },
      { name: 'Sports & Fitness', desc: 'Fitness goals and sports updates', public: true },
      { name: 'Music Lovers', desc: 'Share and discover music', public: false },
      { name: 'Photography Club', desc: 'Share your best shots!', public: true },
      { name: 'Hostel 4 Gang', desc: 'Private hostel group', public: false },
      { name: 'Coding Ninjas', desc: 'Competitive programming enthusiasts', public: false }
    ];

    for (let i = 0; i < 10; i++) {
      const theme = groupThemes[i];
      const creator = users[Math.floor(Math.random() * users.length)];

      const result = await pool.query(
        `INSERT INTO groups (group_name, group_desc, is_public, created_by, max_members)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING group_id, group_name, is_public`,
        [theme!.name, theme!.desc, theme!.public, creator.user_id, 100]
      );

      groups.push(result.rows[0]);
      console.log(`  ✓ Created group ${i + 1}/10: ${result.rows[0].group_name} (${result.rows[0].is_public ? 'Public' : 'Private'})`);
    }

    console.log(`\n[OK] Created ${groups.length} groups\n`);

    // Add members to groups (mix of anonymous and regular)
    console.log('[MEMBERS] Adding members to groups...');
    let totalMembers = 0;
    let anonymousMembers = 0;

    for (const group of groups) {
      // Add 5-15 random members to each group
      const memberCount = 5 + Math.floor(Math.random() * 11);
      const selectedUsers = [...users].sort(() => 0.5 - Math.random()).slice(0, memberCount);

      for (const user of selectedUsers) {
        // 40% chance to join as anonymous if group is public
        const joinAsAnonymous = group.is_public && Math.random() < 0.4;

        if (joinAsAnonymous) {
          // Create anonymous identity first
          const randomString = `anon_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;

          const identityResult = await pool.query(
            `INSERT INTO anonymous_identities (user_id, random_string, display_gender, group_id)
             VALUES ($1, $2, $3, $4)
             RETURNING identity_id`,
            [user.user_id, randomString, user.gender, group.group_id]
          );

          // Add as anonymous member
          await pool.query(
            `INSERT INTO group_members (group_id, user_id, anonymous_identity_id, is_anonymous, is_admin)
             VALUES ($1, $2, $3, TRUE, FALSE)`,
            [group.group_id, user.user_id, identityResult.rows[0].identity_id]
          );

          anonymousMembers++;
        } else {
          // Add as regular member (first member is admin/owner)
          const isFirstMember = totalMembers === 0;
          await pool.query(
            `INSERT INTO group_members (group_id, user_id, is_anonymous, is_admin, is_owner)
             VALUES ($1, $2, FALSE, $3, $4)`,
            [group.group_id, user.user_id, isFirstMember, isFirstMember]
          );
        }

        totalMembers++;
      }

      console.log(`[DONE] Added ${memberCount} members to "${group.group_name}" (${anonymousMembers} anonymous)`);
    }

    console.log(`\n[OK] Added ${totalMembers} group memberships (${anonymousMembers} anonymous, ${totalMembers - anonymousMembers} regular)\n`);

    // Create some 1-on-1 conversations with anonymous identities
    console.log('[MSGES] Creating anonymous 1-on-1 conversations...');
    let conversationCount = 0;

    for (let i = 0; i < 15; i++) {
      const user1 = users[Math.floor(Math.random() * users.length)];
      const user2 = users[Math.floor(Math.random() * users.length)];

      if (user1.user_id === user2.user_id) continue;

      // 1. Create conversation without initiator first
      const convResult = await pool.query(
        `INSERT INTO chat_conversations (user1_id, user2_id, is_anonymous, is_accepted)
         VALUES ($1, $2, TRUE, TRUE)
         RETURNING conversation_id`,
        [user1.user_id, user2.user_id]
      );

      const conversationId = convResult.rows[0].conversation_id;

      // 2. Create anonymous identity for user1
      const randomString = `anon_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;

      const identityResult = await pool.query(
        `INSERT INTO anonymous_identities (user_id, random_string, display_gender, target_user_id, conversation_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING identity_id`,
        [user1.user_id, randomString, user1.gender, user2.user_id, conversationId]
      );

      const identityId = identityResult.rows[0].identity_id;

      // 3. Update conversation with initiator
      await pool.query(
        `UPDATE chat_conversations 
         SET anonymous_initiator_id = $1 
         WHERE conversation_id = $2`,
        [identityId, conversationId]
      );

      conversationCount++;
      console.log(`  ✓ Created anonymous chat: ${user1.name} (anonymous) → ${user2.name}`);
    }

    console.log(`\n[OK] Created ${conversationCount} anonymous conversations\n`);

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[DONE] SEED DATA CREATION COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`[FINAL] Summary:`);
    console.log(`   • Users: ${users.length}`);
    console.log(`   • Groups: ${groups.length}`);
    console.log(`   • Group memberships: ${totalMembers} (${anonymousMembers} anonymous)`);
    console.log(`   • Anonymous 1-on-1 chats: ${conversationCount}`);
    console.log(`\n[Test] Test Credentials:`);
    console.log(`   Email: Any roll number from above (e.g., ${users[0].roll_no}@students.iitmandi.ac.in)`);
    console.log(`   Password:`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } 
  catch (error) {
    console.error('[ERR] Error creating seed data:', error);
    throw error;
  } 
  finally {
    await pool.end();
  }
};

// Run seed data creation
seedData();
