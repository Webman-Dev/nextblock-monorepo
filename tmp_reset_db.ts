import postgres from 'postgres';
import { SANDBOX_RESET_SQL } from './apps/nextblock/app/api/cron/reset-sandbox/sandboxResetSql';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function reset() {
    console.log('[Direct Reset] Starting manual sandbox reset...');
    const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('ERROR: Missing POSTGRES_URL in .env.local');
        process.exit(1);
    }
    
    const sql = postgres(dbUrl, { ssl: 'require' });
    
    try {
        console.log('[Direct Reset] Executing SQL script...');
        await sql.unsafe(SANDBOX_RESET_SQL);
        console.log('[Direct Reset] ✅ Database reset successfully!');
    } catch (err) {
        console.error('[Direct Reset] ❌ Reset failed:', err);
    } finally {
        await sql.end();
    }
}

reset();
