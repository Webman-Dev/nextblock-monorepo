import { toJSONSchema, z } from './zod-config';

const nullableStringSchema = z.string().nullable().optional();
const nullableBooleanSchema = z.boolean().nullable().optional();
const nullableNumberSchema = z.number().nullable().optional();

const dataAttributesSchema = z
  .record(
    z.string().regex(/^data-[A-Za-z0-9_:-]+$/),
    z.string()
  )
  .nullable()
  .optional();

const preservedHtmlAttrsSchema = z
  .strictObject({
    class: nullableStringSchema,
    dataAttributes: dataAttributesSchema,
    id: nullableStringSchema,
    style: nullableStringSchema,
  })
  .partial();

const textAlignSchema = z.enum(['left', 'center', 'right', 'justify']);
const draggableAttrsSchema = z.strictObject({
  draggable: z.boolean().optional(),
});

const preservedDraggableAttrsSchema = preservedHtmlAttrsSchema
  .extend({
    draggable: z.boolean().optional(),
  })
  .partial();

const alignableBlockAttrsSchema = preservedDraggableAttrsSchema
  .extend({
    textAlign: textAlignSchema.nullable().optional(),
  })
  .partial();

const textStyleMarkAttrsSchema = preservedHtmlAttrsSchema
  .extend({
    color: nullableStringSchema,
    fontFamily: nullableStringSchema,
    fontSize: nullableStringSchema,
  })
  .partial();

export const editorMarkSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('bold'),
  }),
  z.strictObject({
    type: z.literal('italic'),
  }),
  z.strictObject({
    type: z.literal('strike'),
  }),
  z.strictObject({
    type: z.literal('code'),
  }),
  z.strictObject({
    attrs: z
      .strictObject({
        class: nullableStringSchema,
        href: z.string().min(1),
        rel: nullableStringSchema,
        target: z.enum(['_blank', '_self', '_parent', '_top']).nullable().optional(),
      })
      .partial()
      .extend({
        href: z.string().min(1),
      }),
    type: z.literal('link'),
  }),
  z.strictObject({
    attrs: z
      .strictObject({
        color: nullableStringSchema,
      })
      .partial()
      .optional(),
    type: z.literal('highlight'),
  }),
  z.strictObject({
    attrs: textStyleMarkAttrsSchema.optional(),
    type: z.literal('textStyle'),
  }),
  z.strictObject({
    type: z.literal('subscript'),
  }),
  z.strictObject({
    type: z.literal('superscript'),
  }),
]);

export type EditorMark = z.infer<typeof editorMarkSchema>;

const textNodeSchema = z.strictObject({
  marks: z.array(editorMarkSchema).optional(),
  text: z.string(),
  type: z.literal('text'),
});

const plainTextNodeSchema = z.strictObject({
  text: z.string(),
  type: z.literal('text'),
});

type EditorInlineNodeShape =
  | z.infer<typeof textNodeSchema>
  | {
      attrs?: Record<string, unknown>;
      content?: EditorInlineNodeShape[];
      type: 'hardBreak' | 'image' | 'spanComponent' | 'svg';
    };

type EditorBlockNodeShape = {
  attrs?: Record<string, unknown>;
  content?: Array<EditorBlockNodeShape | EditorInlineNodeShape>;
  type: string;
};

// eslint-disable-next-line prefer-const
let inlineNodeSchema: z.ZodType<EditorInlineNodeShape>;
// eslint-disable-next-line prefer-const
let blockNodeSchema: z.ZodType<EditorBlockNodeShape>;

const inlineContentSchema: z.ZodType<EditorInlineNodeShape[]> = z.lazy(() =>
  z.array(inlineNodeSchema)
);
const blockContentSchema: z.ZodType<EditorBlockNodeShape[]> = z.lazy(() =>
  z.array(blockNodeSchema)
);
const nonEmptyBlockContentSchema: z.ZodType<EditorBlockNodeShape[]> = z.lazy(() =>
  z.array(blockNodeSchema).min(1)
);

const paragraphNodeSchema = z.strictObject({
  attrs: alignableBlockAttrsSchema.optional(),
  content: inlineContentSchema.optional(),
  type: z.literal('paragraph'),
});

const headingNodeSchema = z.strictObject({
  attrs: alignableBlockAttrsSchema
    .extend({
      level: z.union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(5),
        z.literal(6),
      ]),
    })
    .partial()
    .extend({
      level: z.union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(5),
        z.literal(6),
      ]),
    }),
  content: inlineContentSchema.optional(),
  type: z.literal('heading'),
});

const blockquoteNodeSchema = z.strictObject({
  attrs: preservedDraggableAttrsSchema.optional(),
  content: nonEmptyBlockContentSchema,
  type: z.literal('blockquote'),
});

const codeBlockNodeSchema = z.strictObject({
  attrs: preservedDraggableAttrsSchema
    .extend({
      language: nullableStringSchema,
    })
    .partial()
    .optional(),
  content: z.array(plainTextNodeSchema).optional(),
  type: z.literal('codeBlock'),
});

const listItemNodeSchema = z.strictObject({
  attrs: preservedDraggableAttrsSchema.optional(),
  content: nonEmptyBlockContentSchema,
  type: z.literal('listItem'),
});

const bulletListNodeSchema = z.strictObject({
  attrs: preservedDraggableAttrsSchema.optional(),
  content: z.array(listItemNodeSchema).min(1),
  type: z.literal('bulletList'),
});

const orderedListNodeSchema = z.strictObject({
  attrs: preservedDraggableAttrsSchema
    .extend({
      start: z.number().int().positive().optional(),
    })
    .partial()
    .optional(),
  content: z.array(listItemNodeSchema).min(1),
  type: z.literal('orderedList'),
});

const taskItemNodeSchema = z.strictObject({
  attrs: preservedDraggableAttrsSchema
    .extend({
      checked: z.boolean().optional(),
    })
    .partial()
    .optional(),
  content: nonEmptyBlockContentSchema,
  type: z.literal('taskItem'),
});

const taskListNodeSchema = z.strictObject({
  attrs: draggableAttrsSchema.partial().optional(),
  content: z.array(taskItemNodeSchema).min(1),
  type: z.literal('taskList'),
});

const tableCellAttrsSchema = z
  .strictObject({
    colspan: z.number().int().positive().optional(),
    colwidth: z.array(z.number().int().positive()).nullable().optional(),
    rowspan: z.number().int().positive().optional(),
  })
  .partial();

const tableCellNodeSchema = z.strictObject({
  attrs: tableCellAttrsSchema.optional(),
  content: nonEmptyBlockContentSchema,
  type: z.literal('tableCell'),
});

const tableHeaderNodeSchema = z.strictObject({
  attrs: tableCellAttrsSchema.optional(),
  content: nonEmptyBlockContentSchema,
  type: z.literal('tableHeader'),
});

const tableRowNodeSchema = z.strictObject({
  content: z.array(z.union([tableCellNodeSchema, tableHeaderNodeSchema])).min(1),
  type: z.literal('tableRow'),
});

const tableNodeSchema = z.strictObject({
  attrs: draggableAttrsSchema.partial().optional(),
  content: z.array(tableRowNodeSchema).min(1),
  type: z.literal('table'),
});

const horizontalRuleNodeSchema = z.strictObject({
  type: z.literal('horizontalRule'),
});

const hardBreakNodeSchema = z.strictObject({
  type: z.literal('hardBreak'),
});

const imageNodeSchema = z.strictObject({
  attrs: z
    .strictObject({
      align: nullableStringSchema,
      alt: nullableStringSchema,
      blurDataURL: nullableStringSchema,
      caption: nullableStringSchema,
      focalX: nullableNumberSchema,
      focalY: nullableNumberSchema,
      focusMode: nullableBooleanSchema,
      height: z.union([z.string(), z.number()]).nullable().optional(),
      lockAspect: z.boolean().optional(),
      src: z.string().min(1),
      title: nullableStringSchema,
      width: z.union([z.string(), z.number()]).nullable().optional(),
    })
    .partial()
    .extend({
      src: z.string().min(1),
    }),
  type: z.literal('image'),
});

const divBlockNodeSchema = z.strictObject({
  attrs: preservedHtmlAttrsSchema
    .extend({
      textAlign: textAlignSchema.nullable().optional(),
    })
    .partial()
    .optional(),
  content: blockContentSchema.optional(),
  type: z.literal('divBlock'),
});

const spanComponentNodeSchema = z.strictObject({
  attrs: preservedHtmlAttrsSchema.optional(),
  content: inlineContentSchema.optional(),
  type: z.literal('spanComponent'),
});

const svgNodeSchema = z.strictObject({
  attrs: z
    .strictObject({
      class: nullableStringSchema,
      fill: nullableStringSchema,
      height: nullableStringSchema,
      html: z.string().optional(),
      stroke: nullableStringSchema,
      style: nullableStringSchema,
      viewBox: nullableStringSchema,
      width: nullableStringSchema,
      xmlns: nullableStringSchema,
    })
    .partial()
    .optional(),
  type: z.literal('svg'),
});

const styleTagNodeSchema = z.strictObject({
  attrs: z
    .strictObject({
      cssContent: z.string().optional(),
      media: nullableStringSchema,
      type: nullableStringSchema,
    })
    .partial()
    .optional(),
  type: z.literal('styleTag'),
});

const scriptTagNodeSchema = z.strictObject({
  attrs: z
    .strictObject({
      async: nullableStringSchema,
      defer: nullableStringSchema,
      jsContent: z.string().optional(),
      src: nullableStringSchema,
      type: nullableStringSchema,
    })
    .partial()
    .optional(),
  type: z.literal('scriptTag'),
});

const alertWidgetNodeSchema = z.strictObject({
  attrs: z
    .strictObject({
      align: z.enum(['left', 'center', 'right']).optional(),
      message: z.string().optional(),
      size: z.enum(['small', 'medium', 'large']).optional(),
      textAlign: z.enum(['left', 'center', 'right']).optional(),
      title: z.string().optional(),
      type: z.enum(['info', 'warning', 'error', 'success']).optional(),
    })
    .partial()
    .optional(),
  type: z.literal('alertWidget'),
});

const ctaWidgetNodeSchema = z.strictObject({
  attrs: z
    .strictObject({
      size: z.string().optional(),
      style: z.string().optional(),
      text: z.string().optional(),
      textAlign: z.string().optional(),
      url: z.string().optional(),
    })
    .partial()
    .optional(),
  type: z.literal('ctaWidget'),
});

const generatedMarkSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('bold'),
  }),
  z.strictObject({
    type: z.literal('italic'),
  }),
  z.strictObject({
    type: z.literal('strike'),
  }),
  z.strictObject({
    type: z.literal('code'),
  }),
  z.strictObject({
    attrs: z.strictObject({
      href: z.string().min(1),
      target: z.enum(['_blank', '_self', '_parent', '_top']).nullable().optional(),
    }),
    type: z.literal('link'),
  }),
  z.strictObject({
    attrs: z
      .strictObject({
        color: nullableStringSchema,
      })
      .partial()
      .optional(),
    type: z.literal('highlight'),
  }),
  z.strictObject({
    attrs: z
      .strictObject({
        color: nullableStringSchema,
        fontFamily: nullableStringSchema,
        fontSize: nullableStringSchema,
      })
      .partial()
      .optional(),
    type: z.literal('textStyle'),
  }),
  z.strictObject({
    type: z.literal('subscript'),
  }),
  z.strictObject({
    type: z.literal('superscript'),
  }),
]);

const generatedTextNodeSchema = z.strictObject({
  marks: z.array(generatedMarkSchema).optional(),
  text: z.string(),
  type: z.literal('text'),
});

const generatedInlineNodeSchema = z.discriminatedUnion('type', [
  generatedTextNodeSchema,
  hardBreakNodeSchema,
]);

const generatedInlineContentSchema = z.array(generatedInlineNodeSchema);

const generatedTextAlignAttrsSchema = z
  .strictObject({
    textAlign: textAlignSchema.nullable().optional(),
  })
  .partial();

const generatedParagraphNodeSchema = z.strictObject({
  attrs: generatedTextAlignAttrsSchema.optional(),
  content: generatedInlineContentSchema.optional(),
  type: z.literal('paragraph'),
});

const generatedHeadingNodeSchema = z.strictObject({
  attrs: generatedTextAlignAttrsSchema.extend({
    level: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
    ]),
  }),
  content: generatedInlineContentSchema.optional(),
  type: z.literal('heading'),
});

const generatedCodeBlockNodeSchema = z.strictObject({
  attrs: z
    .strictObject({
      language: nullableStringSchema,
    })
    .partial()
    .optional(),
  content: z.array(plainTextNodeSchema).optional(),
  type: z.literal('codeBlock'),
});

const generatedHorizontalRuleNodeSchema = z.strictObject({
  type: z.literal('horizontalRule'),
});

const generatedAlertWidgetNodeSchema = alertWidgetNodeSchema;
const generatedCtaWidgetNodeSchema = ctaWidgetNodeSchema;

const generatedLeafBlockNodeSchema = z.discriminatedUnion('type', [
  generatedParagraphNodeSchema,
  generatedHeadingNodeSchema,
  generatedCodeBlockNodeSchema,
  generatedHorizontalRuleNodeSchema,
  generatedAlertWidgetNodeSchema,
  generatedCtaWidgetNodeSchema,
]);

const generatedListItemNodeSchema = z.strictObject({
  content: z.array(generatedLeafBlockNodeSchema).min(1),
  type: z.literal('listItem'),
});

const generatedBulletListNodeSchema = z.strictObject({
  content: z.array(generatedListItemNodeSchema).min(1),
  type: z.literal('bulletList'),
});

const generatedOrderedListNodeSchema = z.strictObject({
  attrs: z
    .strictObject({
      start: z.number().int().positive().optional(),
    })
    .partial()
    .optional(),
  content: z.array(generatedListItemNodeSchema).min(1),
  type: z.literal('orderedList'),
});

const generatedTaskItemNodeSchema = z.strictObject({
  attrs: z
    .strictObject({
      checked: z.boolean().optional(),
    })
    .partial()
    .optional(),
  content: z.array(generatedLeafBlockNodeSchema).min(1),
  type: z.literal('taskItem'),
});

const generatedTaskListNodeSchema = z.strictObject({
  content: z.array(generatedTaskItemNodeSchema).min(1),
  type: z.literal('taskList'),
});

const generatedBlockquoteNodeSchema = z.strictObject({
  content: z.array(generatedLeafBlockNodeSchema).min(1),
  type: z.literal('blockquote'),
});

const generatedTableTextNodeSchema = z.strictObject({
  marks: z.array(generatedMarkSchema).optional(),
  text: z.string().min(1),
  type: z.literal('text'),
});

const generatedTableParagraphNodeSchema = z.strictObject({
  attrs: generatedTextAlignAttrsSchema.optional(),
  content: z.array(generatedTableTextNodeSchema).min(1),
  type: z.literal('paragraph'),
});

const generatedTableCellBlockNodeSchema = generatedTableParagraphNodeSchema;

const generatedTableCellNodeSchema = z.strictObject({
  attrs: tableCellAttrsSchema.optional(),
  content: z.array(generatedLeafBlockNodeSchema).min(1),
  type: z.literal('tableCell'),
});

const generatedTableHeaderNodeSchema = z.strictObject({
  attrs: tableCellAttrsSchema.optional(),
  content: z.array(generatedLeafBlockNodeSchema).min(1),
  type: z.literal('tableHeader'),
});

const generatedTableRowNodeSchema = z.strictObject({
  content: z.array(z.union([generatedTableCellNodeSchema, generatedTableHeaderNodeSchema])).min(1),
  type: z.literal('tableRow'),
});

const generatedTableNodeSchema = z.strictObject({
  content: z.array(generatedTableRowNodeSchema).min(1),
  type: z.literal('table'),
});

function createGeneratedStrictTableNodeSchema(params?: { minColumns?: number; minRows?: number }) {
  const minColumns = params?.minColumns || 2;
  const minRows = params?.minRows || 2;
  const tableCellNodeSchema = z.strictObject({
    attrs: tableCellAttrsSchema.optional(),
    content: z.array(generatedTableCellBlockNodeSchema).min(1),
    type: z.literal('tableCell'),
  });

  const tableHeaderNodeSchema = z.strictObject({
    attrs: tableCellAttrsSchema.optional(),
    content: z.array(generatedTableCellBlockNodeSchema).min(1),
    type: z.literal('tableHeader'),
  });

  const tableRowNodeSchema = z.strictObject({
    content: z.array(z.union([tableCellNodeSchema, tableHeaderNodeSchema])).min(minColumns),
    type: z.literal('tableRow'),
  });

  return z.strictObject({
    content: z.array(tableRowNodeSchema).min(minRows),
    type: z.literal('table'),
  });
}

export const editorGeneratedNonTableBlockNodeSchema = z.discriminatedUnion('type', [
  generatedParagraphNodeSchema,
  generatedHeadingNodeSchema,
  generatedBlockquoteNodeSchema,
  generatedCodeBlockNodeSchema,
  generatedBulletListNodeSchema,
  generatedOrderedListNodeSchema,
  generatedTaskListNodeSchema,
  generatedHorizontalRuleNodeSchema,
  generatedAlertWidgetNodeSchema,
  generatedCtaWidgetNodeSchema,
]);

export const editorGeneratedBlockNodeSchema = z.discriminatedUnion('type', [
  generatedParagraphNodeSchema,
  generatedHeadingNodeSchema,
  generatedBlockquoteNodeSchema,
  generatedCodeBlockNodeSchema,
  generatedBulletListNodeSchema,
  generatedOrderedListNodeSchema,
  generatedTaskListNodeSchema,
  generatedTableNodeSchema,
  generatedHorizontalRuleNodeSchema,
  generatedAlertWidgetNodeSchema,
  generatedCtaWidgetNodeSchema,
]);

export const editorGeneratedBlockDocumentSchema = z.strictObject({
  content: z.array(editorGeneratedBlockNodeSchema).min(1),
  type: z.literal('doc'),
});

export function createEditorGeneratedMixedTableDocumentSchema(params?: {
  minColumns?: number;
  minRows?: number;
}) {
  return z.strictObject({
    content: z
      .array(z.union([editorGeneratedNonTableBlockNodeSchema, createGeneratedStrictTableNodeSchema(params)]))
      .min(1),
    type: z.literal('doc'),
  });
}

export function createEditorGeneratedTableDocumentSchema(params?: {
  minColumns?: number;
  minRows?: number;
}) {
  return z.strictObject({
    content: z
      .array(createGeneratedStrictTableNodeSchema(params))
      .length(1),
    type: z.literal('doc'),
  });
}

export const editorGeneratedTableDocumentSchema = createEditorGeneratedTableDocumentSchema();

inlineNodeSchema = z.lazy(() =>
  z.discriminatedUnion('type', [
    textNodeSchema,
    hardBreakNodeSchema,
    imageNodeSchema,
    spanComponentNodeSchema,
    svgNodeSchema,
  ])
) as z.ZodType<EditorInlineNodeShape>;

blockNodeSchema = z.lazy(() =>
  z.discriminatedUnion('type', [
    paragraphNodeSchema,
    headingNodeSchema,
    blockquoteNodeSchema,
    codeBlockNodeSchema,
    bulletListNodeSchema,
    orderedListNodeSchema,
    taskListNodeSchema,
    tableNodeSchema,
    horizontalRuleNodeSchema,
    divBlockNodeSchema,
    styleTagNodeSchema,
    scriptTagNodeSchema,
    alertWidgetNodeSchema,
    ctaWidgetNodeSchema,
  ])
) as z.ZodType<EditorBlockNodeShape>;

export const editorInlineNodeSchema = inlineNodeSchema;
export const editorBlockNodeSchema = blockNodeSchema;

export const editorBlockDocumentSchema = z.strictObject({
  content: blockContentSchema.optional(),
  type: z.literal('doc'),
});

export const editorBlocksSchema = editorBlockDocumentSchema;

export type EditorInlineNode = z.infer<typeof editorInlineNodeSchema>;
export type EditorBlockNode = z.infer<typeof editorBlockNodeSchema>;
export type EditorBlockDocument = z.infer<typeof editorBlockDocumentSchema>;

export const EDITOR_BLOCK_ALLOWED_NODE_TYPES = [
  'doc',
  'text',
  'paragraph',
  'heading',
  'blockquote',
  'codeBlock',
  'bulletList',
  'orderedList',
  'listItem',
  'taskList',
  'taskItem',
  'table',
  'tableRow',
  'tableCell',
  'tableHeader',
  'horizontalRule',
  'hardBreak',
  'image',
  'divBlock',
  'spanComponent',
  'svg',
  'styleTag',
  'scriptTag',
  'alertWidget',
  'ctaWidget',
] as const;

export const EDITOR_BLOCK_ALLOWED_MARK_TYPES = [
  'bold',
  'italic',
  'strike',
  'code',
  'link',
  'highlight',
  'textStyle',
  'subscript',
  'superscript',
] as const;

export function getEditorBlocksSchemaAwarenessString() {
  return [
    `Allowed Tiptap node types: ${EDITOR_BLOCK_ALLOWED_NODE_TYPES.join(', ')}.`,
    `Allowed Tiptap mark types: ${EDITOR_BLOCK_ALLOWED_MARK_TYPES.join(', ')}.`,
    'Root output must be a doc object with optional block content.',
    'Text is represented only by text nodes; do not return markdown, HTML strings, or conversational prose outside the JSON object.',
  ].join(' ');
}

function stripStandardMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripStandardMetadata);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== '~standard')
        .map(([key, entryValue]) => [key, stripStandardMetadata(entryValue)])
    );
  }

  return value;
}

export function getEditorBlocksJsonSchema() {
  return stripStandardMetadata(
    toJSONSchema(editorBlockDocumentSchema as any)
  );
}

export function validateEditorBlockDocument(value: unknown) {
  return editorBlockDocumentSchema.parse(value);
}

export function safeValidateEditorBlockDocument(value: unknown) {
  return editorBlockDocumentSchema.safeParse(value);
}
