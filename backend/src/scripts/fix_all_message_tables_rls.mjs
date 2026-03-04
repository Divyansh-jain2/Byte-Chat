import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
});

async function fixAllRLS() {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected!\n');

    const tables = ['message_reactions', 'message_edit_history'];

    try {
        for (const table of tables) {
            console.log(`\n=== Processing ${table} ===`);
            
            // Check current RLS status
            const rlsCheck = await client.query(`
                SELECT tablename, rowsecurity 
                FROM pg_tables 
                WHERE schemaname = 'public' 
                AND tablename = $1
            `, [table]);
            
            if (rlsCheck.rows.length === 0) {
                console.log(`Table ${table} does not exist, skipping...`);
                continue;
            }
            
            console.log('RLS Status:', rlsCheck.rows[0]);

            // Check existing policies
            const policiesCheck = await client.query(`
                SELECT policyname 
                FROM pg_policies
                WHERE tablename = $1
            `, [table]);
            console.log('Existing Policies:', policiesCheck.rows.map(r => r.policyname));

            // Disable RLS if enabled
            if (rlsCheck.rows[0].rowsecurity) {
                console.log(`Disabling RLS on ${table}...`);
                await client.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
                console.log('✓ RLS disabled');
            } else {
                console.log('RLS already disabled');
            }
        }

        console.log('\n=== Final Verification ===');
        const finalCheck = await client.query(`
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('message_reactions', 'message_edit_history')
            ORDER BY tablename
        `);
        console.log('Final Status:');
        finalCheck.rows.forEach(row => {
            console.log(`  ${row.tablename}: RLS ${row.rowsecurity ? 'ENABLED' : 'DISABLED'}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        await pool.end();
        console.log('\nDone!');
    }
}

fixAllRLS().catch(console.error);
