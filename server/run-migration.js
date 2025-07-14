import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Running migration: Add confidence column to analysis_results...');
    console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_confidence_column.sql'), 
      'utf8'
    );
    
    console.log('Migration SQL:', migrationSQL);
    
    await pool.query(migrationSQL);
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration(); 