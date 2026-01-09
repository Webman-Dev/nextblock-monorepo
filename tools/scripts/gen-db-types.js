const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env from monorepo root .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const PROJECT_ID = process.env.SUPABASE_PROJECT_ID || process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
const OUTPUT_PATH = path.resolve(process.cwd(), 'libs/db/src/lib/supabase/types.ts');

function ensureDirFor(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function main() {
  if (!PROJECT_ID) {
    console.error('Error: SUPABASE_PROJECT_ID is not set in .env.local');
    process.exit(1);
  }

  console.log(`Generating Supabase types for project '${PROJECT_ID}'...`);

  const cmd = `npx supabase gen types typescript --project-id ${PROJECT_ID} --schema public`;
  exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) {
      console.error('Failed to generate types via Supabase CLI.');
      console.error(stderr || error.message);
      process.exit(error.code || 1);
    }

    try {
      ensureDirFor(OUTPUT_PATH);
      fs.writeFileSync(OUTPUT_PATH, stdout, 'utf8');
      console.log(`Types written to ${OUTPUT_PATH}`);
      process.exit(0);
    } catch (e) {
      console.error(`Failed to write types to ${OUTPUT_PATH}`);
      console.error(e.message);
      process.exit(1);
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

