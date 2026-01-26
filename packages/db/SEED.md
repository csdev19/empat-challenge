# Database Seed Script

This seed script helps populate the database with initial test data for development and testing.

## Usage

The seed script automatically loads `DATABASE_URL` from your `.env` file (same as drizzle.config.ts).

### Basic Usage (Create Students Only)

```bash
# From project root
bun run --filter=@empat-challenge/db seed

# Or directly
cd packages/db
bun run src/seed.ts
```

This will create 5 test students but won't add them to any caseload.

### Create Students and Add to SLP Caseload

```bash
# First, get your SLP ID from the database or after creating your SLP profile
bun run --filter=@empat-challenge/db seed -- --slp-id=<your-slp-id>
```

### Create Students Only (Force)

```bash
bun run --filter=@empat-challenge/db seed -- --create-students-only
```

## Workflow

1. **Sign up** a user through the app (`/auth/signup`)
2. **Create SLP profile** through the app (dialog will appear automatically)
3. **Get your SLP ID** from the database or API response
4. **Run seed** with your SLP ID to add students to your caseload

## What Gets Created

- **5 Test Students**:
  - Emma Johnson (Age: 7)
  - Lucas Martinez (Age: 9)
  - Sophia Chen (Age: 6)
  - Oliver Brown (Age: 8)
  - Ava Wilson (Age: 7)

- **Caseload entries** (if SLP ID provided):
  - Links all created students to the specified SLP

## Notes

- The seed script does **NOT** create users or SLP profiles
- Users must sign up through the normal app flow
- SLP profiles are created through the app UI (dialog appears automatically)
- The script checks for existing data to avoid duplicates
