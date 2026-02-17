Part 2: The "Missing Orders UI" Project Plan
We need to build the visualization for this data. Since the database schema is already set, this is purely a Frontend + Server Action implementation.

Copy/Paste these prompts into your IDE Agent.

Phase 1: Data Access & Types
Goal: Create the strong types and data fetching logic needed to display orders, handling the nuances of different providers.

Prompt 1 (Copy/Paste):

Markdown
We need to build the "Orders" management section in the CMS Admin.
First, let's set up the data fetching layer.

1.  **Inspect Schema:**
    - Check `libs/db` for the `orders` and `order_items` tables.
    - Note that `orders` now has a `provider` column ('stripe' | 'lemon_squeezy').

2.  **Define Types (`apps/nextblock/app/cms/orders/types.ts`):**
    - Define an `OrderWithDetails` type that includes:
      - The Order fields (id, status, total, currency, provider, created_at).
      - The Customer info (email, and `profiles` relation if available).
      - The `order_items` array (product_name, quantity, price).

3.  **Create Server Actions (`apps/nextblock/app/cms/orders/actions.ts`):**
    - `getOrders(page: number, status?: string)`: Fetch paginated orders. Order by `created_at` desc.
    - `getOrderDetails(orderId: string)`: Fetch a single order with all its items and customer profile.
    - `markOrderAsPaid(orderId: string)`: A manual override action (just in case webhooks fail in the future).

4.  **Migration Check (Safety):** \* Verify if we need to add any indexes to `orders(created_at)` for performance. If so, generate a migration.
    Phase 2: The Orders List Page
    Goal: A clean dashboard table showing who bought what.

Prompt 2 (Copy/Paste):

Markdown
Now let's build the Orders List page.
Location: `apps/nextblock/app/cms/orders/page.tsx`

1.  **UI Layout:**
    - Use the `AdminLayout` or standard CMS wrapper.
    - Title: "Orders".
    - Top Bar: Filter dropdown (All, Paid, Pending, Failed) and a "Refresh" button.

2.  **The Table:**
    - Use our shared `Table` component from `libs/ui` (or `shadcn/ui`).
    - **Columns:**
      - **ID:** Shortened UUID (e.g., `#a1b2...`).
      - **Customer:** Email address.
      - **Amount:** Format as Currency (handle USD/CAD based on the row data).
      - **Provider:** Show a small Badge or Icon (Stripe Logo / Lemon Icon) based on the `provider` column.
      - **Status:** Color-coded Badge (Green=Paid, Yellow=Pending, Red=Failed).
      - **Date:** Localized date string.
      - **Actions:** "View Details" button.

3.  **Implementation:**
    _ Fetch data using the `getOrders` action from Phase 1.
    _ Implement basic pagination (Previous/Next buttons).
    Phase 3: The Order Detail View
    Goal: A detailed invoice view to see exactly what a user purchased and debug webhook data if needed.

Prompt 3 (Copy/Paste):

Markdown
Finally, build the Order Detail View.
Location: `apps/nextblock/app/cms/orders/[id]/page.tsx`

1.  **Header:**
    - Breadcrumb: Orders > [Order ID]
    - Status Badge (Large).
    - Action Button: "Manual Sync" (Reloads page) or "Mark Paid" (if user is admin and status is pending).

2.  **Grid Layout (2 Columns):**
    - **Left Column (Order Items):**
      - A list of items purchased.
      - Show: Product Name, Quantity, Unit Price, Total.
    - **Right Column (Metadata):**
      - **Customer:** Email, User ID (link to User Profile if it exists).
      - **Payment Info:** Provider (Stripe/LS), External Transaction ID (e.g., the Stripe Payment Intent ID or LS Order ID).
      - **Timeline:** Created At date.

3.  **JSON Dump (For Debugging):**
    - At the very bottom, inside a collapsible `Details` element, render the raw `checkout_data` or `metadata` JSON column. This is crucial for debugging webhook issues.
