import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function checkRLS() {
    const client = await pool.connect();
    
    // Check if RLS is enabled
    const rlsCheck = await client.query(`
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'message_reactions'
    `);
    console.log('\nRLS Status:', rlsCheck.rows);
    
    // Check policies
    const policies = await client.query(`
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE tablename = 'message_reactions'
    `);
    console.log('\nPolicies:', policies.rows);
    
    client.release();
    await pool.end();
}

checkRLS().catch(console.error);
