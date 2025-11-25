<table style="border:2px solid #dc2626;border-radius:6px;background:#fee2e2;padding:12px;">
  <tr>
    <td>
      <strong>Warning:</strong> This project is not ready to be tested locally. I'm still working on a database seed to help people start with a basic template.
    </td>
  </tr>
</table>

# NextBlock CMS Monorepo

This is the **factory** for NextBlock CMS, an Open-Core, block-based content management system built with Next.js 16 and Supabase.

**Note:** If you just want to **build a website** with NextBlock, you do not need this repo. Instead, run:

```bash
npx create-nextblock my-app
```

This repository is for **contributing to the core platform**, developing premium extensions, or understanding the internal architecture.

## 📚 Documentation

The primary documentation for this monorepo is located in the [`docs/`](./docs) directory.

👉 **[Start Here: Documentation Index](./docs/README.md)**

The index will guide you through:

- **[Architectural Mandate](./docs/Architectural-Mandate-and-End-Goal.md)**: The "Constitution" of the project (Open-Core model, licensing, etc.).
- **[Onboarding Guide](./docs/AI-Dev-Onboarding-Guide.md)**: Mission, strategy, and roadmap.
- **[Monorepo Architecture](./docs/monorepo-architecture.md)**: How the Nx workspace is organized.

## 🏗️ Monorepo Structure

This workspace uses [Nx](https://nx.dev) to manage applications and libraries.

| Path                    | Type | Description                                                                                                        |
| :---------------------- | :--- | :----------------------------------------------------------------------------------------------------------------- |
| `apps/nextblock`        | App  | The "Dev" instance of the CMS. Used for developing and testing libraries locally.                                  |
| `apps/create-nextblock` | CLI  | The CLI tool (`npx create-nextblock`). Contains the **actual product template** in `templates/nextblock-template`. |
| `libs/ui`               | Lib  | Shared `shadcn/ui` components and design system (`@nextblock-monorepo/ui`).                                        |
| `libs/db`               | Lib  | Supabase client, migrations, and types (`@nextblock-monorepo/db`).                                                 |
| `libs/editor`           | Lib  | The Tiptap-based rich text editor (`@nextblock-monorepo/editor`).                                                  |

## 🛠️ Development

### Prerequisites

- Node.js 18+
- Supabase CLI
- Docker (optional, for local Supabase)

### Quick Start (Contributors)

1.  **Clone the repo:**

    ```bash
    git clone https://github.com/Webman-Dev/nextblock-monorepo.git
    cd nextblock-monorepo
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Setup Environment:**
    Copy `.env.exemple` to `apps/nextblock/.env.local` and fill in your Supabase/R2 credentials.

4.  **Run the Dev Server:**
    ```bash
    nx serve nextblock
    ```

### Common Commands

| Command              | Description                     |
| :------------------- | :------------------------------ |
| `nx serve nextblock` | Run the dev app.                |
| `nx build nextblock` | Build the dev app.              |
| `nx lint`            | Lint all projects.              |
| `nx graph`           | Visualize the dependency graph. |

---

## 🤝 Contributing

Please read the **[Architectural Mandate](./docs/Architectural-Mandate-and-End-Goal.md)** before submitting a PR. We enforce strict separation between the Open-Source Core and Premium Extensions.
