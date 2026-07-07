import dotenv from 'dotenv';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { DynamicLayoutEngine } from '../components/renderers/DynamicLayoutEngine';
import {
  buildCortexWidgetDefinitionInsertPayload,
  buildCortexProfileCardVerificationDefinition,
  validateCortexWidgetDefinitionOutput,
} from '@nextblock-cms/cortex';

dotenv.config({ path: '.env.local' });

const args = process.argv.slice(2);
const prompt =
  args.filter((arg) => !arg.startsWith('--')).join(' ') ||
  'Synthesize a multi-tier profile card with an inner flex column housing an R2 picture asset slot and a customer list relation link.';

function renderVerificationHtml(definition: ReturnType<typeof validateCortexWidgetDefinitionOutput>) {
  return renderToStaticMarkup(
    <DynamicLayoutEngine
      definition={{
        fields: definition.fields,
        id: '77777777-7777-4777-8777-777777777777',
        layout_schema: definition.layout_schema,
        name: definition.name,
        slug: definition.slug,
      }}
      data={{
        customer_list: ['profile-1', 'profile-2'],
        profile_name: 'Ada Lovelace',
        profile_photo: {
          alt: 'Ada Lovelace profile photo',
          object_key: 'cortex/profile-card/ada.webp',
          url: 'https://cdn.nextblock.dev/cortex/profile-card/ada.webp',
        },
        profile_role: 'Principal Architect',
        profile_summary:
          '<p>Builds multi-tier product systems with direct media and live relation data.</p>',
        resolved_relations: {
          customer_list: [
            {
              record: { full_name: 'Analytical Engine Society', id: 'profile-1' },
              table: 'profiles',
              value: 'profile-1',
            },
            {
              record: { full_name: 'Difference Labs', id: 'profile-2' },
              table: 'profiles',
              value: 'profile-2',
            },
          ],
        },
      }}
    />
  );
}

async function main() {
  const definition = validateCortexWidgetDefinitionOutput(
    buildCortexProfileCardVerificationDefinition()
  );
  const payload = buildCortexWidgetDefinitionInsertPayload(definition);
  const html = renderVerificationHtml(definition);

  console.log(
    JSON.stringify(
      {
        atomicInsert: {
          payload,
          status: 'validated-payload',
        },
        fieldTypes: definition.fields.map((field) => ({
          key: field.key,
          type: field.type,
        })),
        prompt,
        renderChecks: {
          containsCustomerRelations:
            html.includes('Analytical Engine Society') && html.includes('Difference Labs'),
          containsImageSlot: html.includes('cortex/profile-card/ada.webp'),
          containsNestedTailwind:
            html.includes('flex flex-col gap-6 md:flex-row') &&
            html.includes('flex min-w-0 flex-1 flex-col gap-4'),
          htmlLength: html.length,
        },
        slug: definition.slug,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
