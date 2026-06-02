SYSTEM CONTEXT & ARCHITECTURAL ROLE
You are a principal full-stack software engineer and cloud software architect specializing in Next.js 16 App Router, Tailwind CSS, Supabase (PostgreSQL JSONB validation), Cloudflare R2 storage layers, and ProseMirror/Tiptap core extension mechanics.

We are expanding the unified core of "NextBlock CMS"—a blazing-fast, developer-first block CMS platform. NextBlock eliminates traditional headless complexity by shipping an integrated, high-performance frontend powered by Next.js 16 Server Components and strict PostgreSQL JSONB block definitions. Your task is to implement a complete Custom Block CRUD Dashboard that empowers users to create, duplicate, and modify their own block types. These blocks must support native references to live database collections and direct media uploads to Cloudflare R2 buckets. 

Crucially, for the layout system, we are building a fully open-ended, self-referential structural tree engine. The architecture must completely avoid rigid layouts; instead, it must support infinitely nested structural containers that map Tailwind utility classes dynamically at runtime. Once implemented, this layout architecture will be exposed to our premium AI module, "NextBlock Cortex," allowing it to generate deep UI layouts and complete custom widget blocks on demand via schema-constrained decoding.

EXTERNAL CONTEXT REFERENCES
When parsing implementation context, you must cross-reference and align your code output with the structural patterns defined within the following core architectural assets:
1. "CMS AI Integration Master Prompt" — for the baseline parameters of the Cortex AI pipeline.
2. "Comprehensive Developer Relations and Growth Strategy for NextBlock CMS" — for the structural definitions of the premium e-commerce and block distribution architecture.
3. read [docs](docs/) for more info on the CMS project
4. use context7 mcp for latest docs

CRITICAL RULES OF ENGAGEMENT
1. Zero Runtime Code Compilation: We do not compile code, components, or TSX files at runtime. All user-generated blocks are dynamic data rows stored in the database, parsed recursively by an optimized React Server Component (RSC) tree.
2. Infinitely Nested Recursive Engine: Milestone 4 layout mapping must be completely open-ended and self-referential. Code a strict recursive renderer capable of handling unbounded nested layout layers (Container -> Container -> Field).
3. Next.js 16 Speed Guardrails: Leverage modern caching layers ('use cache' or cacheTag boundaries) for custom block configurations and dynamic relations to ensure a 100/100 Lighthouse performance line.
4. Step-By-Step Token Safety: You are receiving a 5-milestone plan. Implement exactly ONE milestone at a time. After completing a milestone, you must HALT immediately, run validation tests, summarize changes, and wait for human developer confirmation before proceeding.

---

MILESTONE 1: Custom Block Registry Table & Clustered CRUD API Actions

Objective: Create the custom block database schema blueprint and backend service primitives, facilitating smooth creation, retrieval, deletion, and complete duplication of dynamic blocks.

Implementation Steps:
1. SQL Migration Script: Author a Supabase SQL script adding a table named `custom_block_definitions`. Columns must strictly include: `id` (UUID), `slug` (text, unique), `name` (text), `description` (text), `fields` (JSONB for fields declarations), `layout_schema` (JSONB for the open-ended self-referential tree structure), and `is_original` (boolean).
2. Deep Duplication Engine: Code a PostgreSQL function or a Supabase service file method `duplicate_block_definition(target_id UUID)`. It must execute a deep copy of the configuration rows, append a distinct copy suffix to the slug, set `is_original = false`, and securely commit the record.
3. Strict Zod Schema Boundaries: Build a validation model (`schemas/custom-blocks.ts`). Fields must be strongly validated against allowed core structural types: 'text', 'rich-text', 'image_r2', and 'db_relation'.
4. Next.js 16 Server Actions: Code the full suite of CRUD actions with explicit error containment and automatic caching tag invalidation (`revalidateTag`).

Verification Checkpoint: Halt execution. Provide a mock execution script demonstrating a successful row insertion for an intricate testimonial card, verify the duplication logic, and output the resulting table record. Wait for confirmation.

---

MILESTONE 2: Direct Cloudflare R2 Upload Flow & Live Relational Table Resolvers

Objective: Build properties-panel input components and background token hydration methods that manage direct uploads to Cloudflare R2 and dynamically resolve live target database entities.

Implementation Steps:
1. Direct R2 Presigned Handler: Program a Next.js App Router API route (`/api/media/r2-presigned/route.ts`) that generates secure S3-compatible presigned PUT URLs pointing directly to an asset container in Cloudflare R2.
2. Chunk-Agnostic Image Picker: Code a frontend React properties panel component (`ImageR2Picker`). It must fetch the presigned URL, execute a direct binary PUT transmission to Cloudflare R2, and output a crisp asset location URL to the block data state.
3. Supabase Schema Schema Inspector: Write a property selector component (`DBRelationSelect`) that queries internal Supabase structural tables, populating asynchronous select menus with searchable target rows from foreign tables.
4. Server-Side Relationship Hydrator: Write a highly optimized backend utility (`lib/resolve-block-relations.ts`). Before dynamic page rendering, this utility must scan incoming block instances. If a `db_relation` node containing an identifier reference is discovered, it must perform a batched database query to stitch the fresh target properties onto the tree before layout emission.

Verification Checkpoint: Halt execution. Confirm through runtime evaluations that your R2 handler outputs valid upload spaces and verify that the relationship data tool correctly fetches active record nodes from neighboring application tables. Wait for confirmation.

---

MILESTONE 3: Self-Referential Programmatic Tiptap Extension Generation

Objective: Map the dynamic, database-configured block schemas straight into the visual Tiptap workspace using loops and metadata-driven node constructors.

Implementation Steps:
1. Dynamic Tiptap Extension Factory: Write a configuration loader (`lib/editor/dynamic-extensions.ts`) that pulls structural rows from the database.
2. Runtime ProseMirror Translation: Map those array objects into live Tiptap node formats via programmatic `Node.create()` factories. Every registered field must resolve to valid schema attributes inside the ProseMirror document context.
3. Open Container Handling: Create custom logic to ensure that layout node blocks can accommodate infinitely mutable block placements without triggering formatting collisions or node splitting issues.
4. Custom visual NodeView: Construct an architectural `NodeViewRenderer` layout container. This handles rendering element options directly within the content management panel, ensuring properties parameters update inside the editing frame seamlessly.

Verification Checkpoint: Halt execution. Compile your workspace modules and prove that user-generated database schema items load successfully alongside fixed elements within the text canvas, parsing data attributes perfectly. Wait for confirmation.

---

MILESTONE 4: High-Performance Open-Ended Recursive Layout Engine

Objective: Develop the definitive server-side rendering pipeline that recursively parses the open-ended, self-referential JSONB layout structures directly into performance-optimized Tailwind layouts.

Implementation Steps:
1. Recursive Tree Parser: Write a Next.js Server Component (`components/renderers/DynamicLayoutEngine.tsx`) that recursively processes the user's `layout_schema` data tree down to an infinite depth.
2. Node Type Evaluator: Implement a pattern-matching conditional walker:
   - If the node is type "container", render a standard HTML element (`div`), map its dynamic string value straight into the Tailwind CSS className attribute, and recursively evaluate its `children` collection.
   - If the node is type "field_render", extract the data value matched with the corresponding block field property, apply custom Tailwind element styling overrides, and emit the final semantic markup.
3. Advanced Caching Controls: Wrap this database layout engine with the Next.js 16 `use cache` directive, attaching distinct caching tag tags to ensure instantaneous static edge delivery.
4. Exception Sanitization Guardrails: Ensure the component includes clean error boundaries. If a user defines an infinite rendering loop or references a corrupted layout property, the engine must safely catch it and display a minimal warning tag instead of throwing unhandled exceptions.

Verification Checkpoint: Halt execution. Execute a processing validation test utilizing an intricately nested container schema (Container -> Container -> Multi-Column Flex -> Fields) and prove it processes cleanly into perfect Tailwind structural code. Wait for confirmation.

---

MILESTONE 5: Cortex AI Infinite Widget Builder Integration

Objective: Establish a secure structured output channel using constrained decoding, empowering NextBlock Cortex to construct complex, infinitely nested custom block specifications.

Implementation Steps:
1. Cortex Synthesis Handler: Code a secure Next.js API entry point (`/api/ai/cortex/build-widget/route.ts`).
2. Self-Referential Zod Validation: Write a comprehensive Zod confirmation model matching your open-ended layout blueprint. The Zod model must explicitly support self-referential array structures (`z.lazy()`) to validate an infinite chain of layout components.
3. Prompt Engineering Contextual Injection: Build a system instructions template defining Cortex as an expert web platform engineer. Inject explicit constraints instructing the agent to utilize Tailwind utility classes and emit ONLY clean, raw JSON matching the Zod schema layout. All markdown formatting wrappers must be aggressively blocked.
4. Atomic Registry Insertion: Wire up the endpoint execution logic using the Vercel AI SDK (`generateObject`). The structured JSON returned from the LLM must be committed directly via a single atomic INSERT transaction into `custom_block_definitions`.

Verification Checkpoint: Final Step. Prompt the interface to "Synthesize a multi-tier profile card with an inner flex column housing an R2 picture asset slot and a customer list relation link." Verify that the engine maps the complex nested JSON properties correctly, writes to the ledger, and renders the result without compilation steps.