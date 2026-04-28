import dotenv from 'dotenv';

import { generateEditorBlockDocument } from '../lib/ai-block-generation';

dotenv.config({ path: '.env.local' });

const args = process.argv.slice(2);
const modelFlag = args.find((arg) => arg.startsWith('--model='));
const prompt =
  args.filter((arg) => !arg.startsWith('--model=')).join(' ') ||
  'Generate a 3-tier pricing table';
const modelId = modelFlag?.slice('--model='.length);

function containsNodeType(node: unknown, type: string): boolean {
  if (!node || typeof node !== 'object') {
    return false;
  }

  const record = node as { content?: unknown; type?: unknown };

  if (record.type === type) {
    return true;
  }

  return Array.isArray(record.content)
    ? record.content.some((child) => containsNodeType(child, type))
    : false;
}

async function main() {
  const result = await generateEditorBlockDocument({
    fallbackModelIds: modelId ? [] : undefined,
    modelId,
    prompt,
  });
  const hasTable = containsNodeType(result.document, 'table');

  console.log(JSON.stringify(result.document, null, 2));
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
        topLevelBlocks: result.document.content?.length || 0,
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
