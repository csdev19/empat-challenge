# Hiring Tool

A modern web application for tracking job interviews and managing hiring processes. Built to help job seekers organize their applications, track company information, and manage interactions with potential employers.

## 🎯 Features

- **Hiring Process Management** - Create and track multiple job applications with status tracking (ongoing, rejected, dropped-out, hired)
- **Company Information** - Store comprehensive company details including salary, benefits, location, website, and contact information
- **Interview Tracking** - Track interview sessions and interactions with companies (prepared for future implementation)
- **User Authentication** - Secure authentication with Better-Auth
- **Responsive Design** - Modern, mobile-friendly interface built with TailwindCSS and shadcn/ui

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.3.4 or higher)
- PostgreSQL database
- Node.js 18+ (if not using Bun)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd hiring-tool
```

2. Install dependencies:

```bash
bun install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in `apps/server/` (if available)
   - Configure your PostgreSQL connection string
   - Set up authentication secrets

4. Set up the database:

```bash
bun run db:push
```

5. Start the development servers:

```bash
bun run dev
```

The application will be available at:

- **Web App**: [http://localhost:3001](http://localhost:3001)
- **API Server**: [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
hiring-tool/
├── apps/
│   ├── web/              # Frontend application (React + TanStack Start)
│   ├── server/            # Backend API (Elysia)
│   └── fumadocs/         # Documentation site
├── packages/
│   ├── auth/             # Authentication configuration
│   ├── db/                # Database schema & Drizzle ORM
│   ├── domain/            # Domain types, constants, and utilities
│   └── config/            # Shared TypeScript configuration
```

## 🛠️ Available Scripts

### Development

- `bun run dev` - Start all applications in development mode
- `bun run dev:web` - Start only the web application
- `bun run dev:server` - Start only the server

### Building

- `bun run build` - Build all applications for production

### Database

- `bun run db:push` - Push schema changes to database
- `bun run db:studio` - Open Drizzle Studio (database GUI)
- `bun run db:generate` - Generate migration files
- `bun run db:migrate` - Run database migrations

### Code Quality

- `bun run check-types` - Check TypeScript types across all apps
- `bun run lint` - Lint all files with oxlint
- `bun run format` - Format all files with oxfmt
- `bun run format:tracked` - Format only tracked files (excludes untracked)
- `bun run check` - Run both lint and format (linting & formatting)

## 🚢 Deployment

### Alchemy (Cloudflare Workers)

```bash
# Development
cd apps/web && bun run dev

# Deploy
cd apps/web && bun run deploy

# Destroy
cd apps/web && bun run destroy
```

## 📚 Documentation

Comprehensive documentation is available in the `apps/fumadocs` directory:

- **Backend Patterns**: API response types, error handling, promise handlers
- **Frontend Patterns**: Data fetching, hooks, component patterns
- **Architecture**: System design and decision records
- **Features**: Implementation details for each feature

## 🏗️ Tech Stack

This project was built using the [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack) template as a foundation.

### Frontend

- **React 19** - UI library
- **TanStack Start** - SSR framework with file-based routing
- **TanStack Router** - Type-safe routing
- **TanStack Query** - Data fetching and caching
- **TanStack Form** - Form state management
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - Reusable UI components
- **Eden Treaty** - End-to-end type-safe API client

### Backend

- **Elysia** - Type-safe, high-performance web framework
- **Bun** - JavaScript runtime and package manager
- **Drizzle ORM** - TypeScript-first SQL ORM
- **PostgreSQL** - Relational database
- **Better-Auth** - Authentication library

### Development Tools

- **TypeScript** - Type safety
- **Turborepo** - Monorepo build system
- **Oxlint** - Fast linter
- **Oxfmt** - Code formatter
- **Husky** - Git hooks
- **Drizzle Studio** - Database GUI

### Architecture

- **Monorepo** - Turborepo for managing multiple packages
- **Domain-Driven Design** - Separated domain, infrastructure, and application layers
- **Type Safety** - End-to-end type safety from database to frontend

## 🙏 Credits

This project was created using the [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack) template, a modern TypeScript stack that combines React, TanStack Start, Elysia, and more. Special thanks to [AmanVarshney01](https://github.com/AmanVarshney01) for creating this excellent starter template.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

The MIT License allows you to:

- ✅ Use the code commercially
- ✅ Modify the code
- ✅ Distribute the code
- ✅ Use privately

**The only requirement is that you include the original copyright notice and license when you use, modify, or distribute the code.**

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Note**: This project is actively under development. Some features may be in progress or planned for future releases.
