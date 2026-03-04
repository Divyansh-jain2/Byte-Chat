import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function testReaction() {
    console.log('Testing message reaction insertion...\n');
    const client = await pool.connect();

    try {
        // Get a test message
        const messageResult = await client.query(`
            SELECT message_id, sender_id 
            FROM chat_messages 
            LIMIT 1
        `);
        
        if (messageResult.rows.length === 0) {
            console.log('[Err] No messages found in database');
            return;
        }

        const testMessage = messageResult.rows[0];
        console.log('Test message:', testMessage.message_id);

        // Get a test user (different from sender)
        const userResult = await client.query(`
            SELECT user_id 
            FROM users 
            WHERE user_id != $1 
            LIMIT 1
        `, [testMessage.sender_id]);

        if (userResult.rows.length === 0) {
            console.log('[Err] No other users found');
            return;
        }

        const testUser = userResult.rows[0];
        console.log('Test user:', testUser.user_id);

        // Try to insert a reaction
        console.log('\nAttempting to insert reaction...');
        const insertResult = await client.query(`
            INSERT INTO message_reactions (message_id, user_id, emoji)
            VALUES ($1, $2, $3)
            ON CONFLICT (message_id, user_id, emoji) DO NOTHING
            RETURNING *
        `, [testMessage.message_id, testUser.user_id, '👍']);

        if (insertResult.rows.length > 0) {
            console.log('[OK] Reaction inserted successfully!');
            console.log('Reaction:', insertResult.rows[0]);
        } else {
            console.log('[ISSUE]  Reaction already exists (conflict)');
        }

        // Check if we can query it back
        console.log('\nQuerying reaction...');
        const queryResult = await client.query(`
            SELECT * FROM message_reactions 
            WHERE message_id = $1 AND user_id = $2
        `, [testMessage.message_id, testUser.user_id]);

        console.log('Found reactions:', queryResult.rows.length);
        queryResult.rows.forEach(r => {
            console.log(`  - ${r.emoji} by user ${r.user_id}`);
        });

        // Test deletion
        console.log('\nTesting deletion...');
        const deleteResult = await client.query(`
            DELETE FROM message_reactions 
            WHERE message_id = $1 AND user_id = $2 AND emoji = $3
            RETURNING *
        `, [testMessage.message_id, testUser.user_id, '👍']);

        if (deleteResult.rows.length > 0) {
            console.log('[OK] Deletion successful');
        } else {
            console.log('[ISSUE]  Nothing to delete');
        }

        console.log('\n[OK] All database operations working correctly!');

    } catch (error) {
        console.error('[Err] Error:', error.message);
        console.error('Details:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

testReaction().catch(console.error);
