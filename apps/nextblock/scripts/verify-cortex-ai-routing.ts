import dotenv from 'dotenv';

import {
  CORTEX_AI_OPENROUTER_FREE_ROUTER_MODEL,
  generateCortexAiText,
} from '@nextblock-cms/cortex';

dotenv.config({ path: '.env.local' });

const prompt =
  'Reply with exactly the text: NextBlock Cortex AI routing verification complete.';

function parseMode() {
  const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
  const mode = modeArg?.split('=')[1] || 'both';

  if (!['both', 'byok', 'free'].includes(mode)) {
    throw new Error('Use --mode=both, --mode=byok, or --mode=free.');
  }

  return mode as 'both' | 'byok' | 'free';
}

async function runCheck(label: string, modelId?: string) {
  const response = await generateCortexAiText({
    maxOutputTokens: 32,
    modelId,
    prompt,
    temperature: 0,
  });

  console.log(`\n${label}`);
  console.log(`credentialSource=${response.credentialSource}`);
  console.log(`modelId=${response.modelId}`);
  console.log(
    `attempts=${response.attempts
      .map((attempt) => `${attempt.modelId}:${attempt.status}`)
      .join(',')}`
  );
  console.log(`text=${response.result.text.trim()}`);
}

async function main() {
  const mode = parseMode();

  if (mode === 'both' || mode === 'byok') {
    await runCheck('BYOK or env credential check');
  }

  if (mode === 'both' || mode === 'free') {
    await runCheck('Zero-cost free-router fallback check', CORTEX_AI_OPENROUTER_FREE_ROUTER_MODEL);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
