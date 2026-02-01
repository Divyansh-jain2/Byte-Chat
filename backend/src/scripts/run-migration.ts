import { pool } from '../lib/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
  try {
    console.log('🔄 Running database migration...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '001_add_anonymous_context.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');
    console.log('Added columns:');
    console.log('  • context_type (VARCHAR(10)) - Indicates chat or group context');
    console.log('  • display_year (VARCHAR(10)) - Shows user year (1st, 2nd, 3rd, 4th, Alumni)\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

runMigration();
