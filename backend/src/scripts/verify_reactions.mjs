import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
});

async function verifyReactionsSetup() {
    console.log('Verifying message reactions setup...\n');
    const client = await pool.connect();

    try {
        // 1. Check if table exists
        console.log('1. Checking if message_reactions table exists...');
        const tableCheck = await client.query(`
            SELECT table_name, 
                   (SELECT COUNT(*) FROM message_reactions) as row_count
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'message_reactions'
        `);
        
        if (tableCheck.rows.length > 0) {
            console.log('   [OK] Table exists');
            console.log(`   [OK] Current row count: ${tableCheck.rows[0].row_count}`);
        } else {
            console.log('   [ERR] Table does not exist!');
            return;
        }

        // 2. Check columns
        console.log('\n2. Checking table structure...');
        const columnsCheck = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'message_reactions'
            ORDER BY ordinal_position
        `);
        console.log('   Columns:');
        columnsCheck.rows.forEach(col => {
            console.log(`     - ${col.column_name} (${col.data_type})`);
        });

        // 3. Check indexes
        console.log('\n3. Checking indexes...');
        const indexCheck = await client.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'message_reactions'
        `);
        console.log('   Indexes:');
        indexCheck.rows.forEach(idx => {
            console.log(`     - ${idx.indexname}`);
        });

        // 4. Check RLS status
        console.log('\n4. Checking Row Level Security (RLS)...');
        const rlsCheck = await client.query(`
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = 'message_reactions'
        `);
        const rlsEnabled = rlsCheck.rows[0]?.rowsecurity;
        console.log(`   RLS: ${rlsEnabled ? 'ENABLED [err]' : 'DISABLED [ok]'}`);

        // 5. Check policies (if RLS is enabled)
        if (rlsEnabled) {
            console.log('\n5. Checking RLS policies...');
            const policiesCheck = await client.query(`
                SELECT policyname, cmd 
                FROM pg_policies
                WHERE tablename = 'message_reactions'
            `);
            if (policiesCheck.rows.length > 0) {
                console.log('   Policies:');
                policiesCheck.rows.forEach(pol => {
                    console.log(`     - ${pol.policyname} (${pol.cmd})`);
                });
            } else {
                console.log('   ⚠️  WARNING: RLS is enabled but NO policies are defined!');
                console.log('   This will block all operations. RLS should be disabled.');
            }
        }

        // 6. Check foreign key constraints
        console.log('\n6. Checking foreign key constraints...');
        const fkCheck = await client.query(`
            SELECT 
                tc.constraint_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'message_reactions'
        `);
        console.log('   Foreign Keys:');
        fkCheck.rows.forEach(fk => {
            console.log(`     - ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });

        // 7. Check for unique constraints
        console.log('\n7. Checking unique constraints...');
        const uniqueCheck = await client.query(`
            SELECT constraint_name
            FROM information_schema.table_constraints 
            WHERE table_schema = 'public' 
            AND table_name = 'message_reactions'
            AND constraint_type = 'UNIQUE'
        `);
        if (uniqueCheck.rows.length > 0) {
            console.log('   Unique Constraints:');
            uniqueCheck.rows.forEach(uc => {
                console.log(`     - ${uc.constraint_name}`);
            });
        } else {
            console.log('   No unique constraints found');
        }

        console.log('\n═══════════════════════════════════════');
        console.log('      Verification complete!');
        console.log('═══════════════════════════════════════\n');

    } catch (error) {
        console.error('Error during verification:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

verifyReactionsSetup().catch(console.error);
