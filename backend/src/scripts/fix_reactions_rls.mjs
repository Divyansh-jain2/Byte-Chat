import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
});

async function fixRLS() {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected!\n');

    try {
        // Check current RLS status
        console.log('Checking RLS status...');
        const rlsCheck = await client.query(`
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = 'message_reactions'
        `);
        console.log('RLS Status:', rlsCheck.rows);

        // Check existing policies
        const policiesCheck = await client.query(`
            SELECT policyname 
            FROM pg_policies
            WHERE tablename = 'message_reactions'
        `);
        console.log('Existing Policies:', policiesCheck.rows.map(r => r.policyname));

        // Disable RLS temporarily if enabled
        console.log('\nDisabling RLS on message_reactions...');
        await client.query(`ALTER TABLE message_reactions DISABLE ROW LEVEL SECURITY`);
        console.log('✓ RLS disabled');

        // Verify
        const verification = await client.query(`
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = 'message_reactions'
        `);
        console.log('\nFinal Status:', verification.rows);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        await pool.end();
        console.log('\nDone!');
    }
}

fixRLS().catch(console.error);
