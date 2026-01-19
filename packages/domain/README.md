# @empat-challenge/domain

Domain constants, types, and utilities for the interviews-tool project.

## Purpose

This package centralizes all domain-level constants and types, providing a single source of truth for enum-like values used throughout the application.

## Structure

```
packages/domain/
├── src/
│   ├── constants/          # Domain constants
│   │   ├── currency.ts
│   │   ├── interview-status.ts
│   │   └── index.ts
│   └── types/              # Utility types
│       └── index.ts
├── dist/                   # Built output
├── package.json
├── tsconfig.json
└── tsdown.config.ts
```

## Usage

### Importing Constants

```typescript
import { CURRENCIES, CURRENCY_INFO, INTERVIEW_STATUSES } from "@empat-challenge/domain/constants";
```

### Importing Types

```typescript
import type { Currency, InterviewStatus } from "@empat-challenge/domain/constants";
```

### Importing Utility Types

```typescript
import type { ObjectProperties } from "@empat-challenge/domain/types";
```

## Development

### Build

```bash
bun run build
```

### Watch Mode

```bash
bun run dev:watch
```

### Type Check

```bash
bun run check-types
```

## Constants Pattern

This package follows the type-safe constants pattern. See the [Constants Pattern documentation](../../apps/fumadocs/content/docs/constants-pattern.mdx) for details.
