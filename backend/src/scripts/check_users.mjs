import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function getUsers() {
    const client = await pool.connect();
    
    try {
        const result = await client.query(`
            SELECT user_id, roll_no, name, is_verified 
            FROM users 
            LIMIT 5
        `);
        
        console.log('\nUsers in database:');
        console.log('==================');
        result.rows.forEach(user => {
            console.log(`- ${user.roll_no} | ${user.name} | Verified: ${user.is_verified} | ID: ${user.user_id}`);
        });
        
        // Get a message for testing
        const msgResult = await client.query(`
            SELECT message_id, sender_id, conversation_id, group_id,
                   LEFT(encrypted_content, 30) as content_preview
            FROM chat_messages 
            LIMIT 3
        `);
        
        console.log('\nMessages in database:');
        console.log('=====================');
        msgResult.rows.forEach(msg => {
            console.log(`- ${msg.message_id}`);
            console.log(`  Content: ${msg.content_preview}...`);
            console.log(`  Conversation: ${msg.conversation_id || 'N/A'}, Group: ${msg.group_id || 'N/A'}`);
        });
        
    } catch (error) {
        console.error('[Err] Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

getUsers().catch(console.error);
