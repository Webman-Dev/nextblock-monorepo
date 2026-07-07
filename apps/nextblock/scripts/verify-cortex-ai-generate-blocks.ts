import dotenv from 'dotenv';

import { generateEditorHtmlFragment } from '@nextblock-cms/cortex';

dotenv.config({ path: '.env.local' });

const args = process.argv.slice(2);
const modelFlag = args.find((arg) => arg.startsWith('--model='));
const prompt =
  args.filter((arg) => !arg.startsWith('--model=')).join(' ') ||
  'Generate a 3-tier pricing table';
const modelId = modelFlag?.slice('--model='.length);

async function main() {
  const result = await generateEditorHtmlFragment({
    fallbackModelIds: modelId ? [] : undefined,
    modelId,
    prompt,
  });
  const hasTable = /<table\b/i.test(result.html);

  console.log(result.html);
  console.error(
    JSON.stringify(
      {
        attempts: result.attempts.map((attempt) => ({
          modelId: attempt.modelId,
          status: attempt.status,
        })),
        credentialSource: result.credentialSource,
        hasTable,
        modelId: result.modelId,
        outputCharacters: result.html.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  if (error && typeof error === 'object' && 'attempts' in error) {
    console.error(JSON.stringify((error as { attempts: unknown }).attempts, null, 2));
  }
  if (error && typeof error === 'object' && 'cause' in error) {
    const cause = (error as { cause?: { cause?: unknown; message?: string; text?: string } }).cause;
    console.error(
      JSON.stringify(
        {
          cause: cause?.message,
          causeCause:
            cause?.cause instanceof Error ? cause.cause.message : String(cause?.cause || ''),
          text: cause?.text,
        },
        null,
        2
      )
    );
  }
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
