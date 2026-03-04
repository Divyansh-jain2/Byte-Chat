import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
});

const migrations = [
    // 1. Create message_reactions table
    `CREATE TABLE IF NOT EXISTS message_reactions (
        reaction_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        message_id UUID NOT NULL REFERENCES chat_messages(message_id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        emoji VARCHAR(10) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(message_id, user_id, emoji)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions (message_id)`,
    `CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions (user_id)`,

    // 2. Create message_edit_history table
    `CREATE TABLE IF NOT EXISTS message_edit_history (
    edit_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES chat_messages(message_id) ON DELETE CASCADE,
    previous_encrypted_content TEXT NOT NULL,
    previous_content_iv VARCHAR(50) NOT NULL,
    previous_content_auth_tag VARCHAR(50) NOT NULL,
    edited_at TIMESTAMPTZ DEFAULT NOW()
  )`,

    // 3. Add columns to chat_messages (safe - all IF NOT EXISTS)
    `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ`,
    `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS deleted_for_user_ids UUID[] DEFAULT '{}'`,
    `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE`,
];

async function run() {
    console.log('Connecting to Supabase...');
    let client;
    try {
        client = await pool.connect();
        console.log('Connected!\n');
    } catch (e) {
        console.error('Connection failed:', e.message);
        process.exit(1);
    }

    for (const sql of migrations) {
        const label = sql.slice(0, 70).replace(/\s+/g, ' ').trim();
        try {
            await client.query(sql);
            console.log('✓', label);
        } catch (e) {
            console.error('✗', label, '\n  →', e.message);
        }
    }

    console.log('\n--- Verification ---');
    const check = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('message_reactions','message_edit_history')
    ORDER BY table_name
  `);
    console.log('Tables:', check.rows.map(r => r.table_name).join(', ') || 'NONE FOUND');

    const cols = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'chat_messages' 
    AND column_name IN ('deleted_for_everyone','deleted_for_user_ids','is_edited','edited_at')
    ORDER BY column_name
  `);
    console.log('chat_messages new columns:', cols.rows.map(r => r.column_name).join(', ') || 'NONE FOUND');

    client.release();
    await pool.end();
    console.log('\nMigration complete!');
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
