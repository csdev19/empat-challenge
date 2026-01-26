import { eq, and, isNull } from "drizzle-orm";
import { config } from "dotenv";
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import ws from "ws";
import * as schema from "../src/schema";
import { slpTable, studentTable, caseloadTable } from "../src/schema";

// Load environment variables from .env file FIRST (before any imports that use process.env)
config({
  path: "../../.env",
});

neonConfig.webSocketConstructor = ws;

/**
 * Seed script to populate the database with initial data
 *
 * Usage:
 *   bun run packages/db/src/seed.ts
 *
 * Or from the db package:
 *   bun run --filter=@empat-challenge/db seed
 *
 * Note: This seed creates students and caseload entries.
 * Users and SLP profiles should be created through the normal signup flow.
 *
 * To seed with a specific SLP:
 *   1. Sign up a user through the app
 *   2. Create SLP profile through the app
 *   3. Run this seed to add students to that SLP's caseload
 */

interface SeedOptions {
  slpId?: string; // If provided, add students to this SLP's caseload
  createStudentsOnly?: boolean; // If true, only create students (no caseload)
}

async function seed(options: SeedOptions = {}) {
  console.log("🌱 Starting database seed...");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL environment variable is required. Make sure it's set in your .env file.",
    );
  }

  // Create database client directly (avoiding the module-level initialization issue)
  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    // Create test students
    const students = [
      {
        id: crypto.randomUUID(),
        name: "Emma Johnson",
        age: 7,
      },
      {
        id: crypto.randomUUID(),
        name: "Lucas Martinez",
        age: 9,
      },
      {
        id: crypto.randomUUID(),
        name: "Sophia Chen",
        age: 6,
      },
      {
        id: crypto.randomUUID(),
        name: "Oliver Brown",
        age: 8,
      },
      {
        id: crypto.randomUUID(),
        name: "Ava Wilson",
        age: 7,
      },
    ];

    // Check if students already exist
    const existingStudents = await db.select().from(studentTable).limit(1);
    if (existingStudents.length > 0 && !options.createStudentsOnly) {
      console.log("⚠️  Students already exist in database.");
      console.log("   Use --create-students-only to add more students.");
      return;
    }

    const createdStudents = await db.insert(studentTable).values(students).returning();
    console.log(`✅ Created ${createdStudents.length} students`);

    // Add students to SLP's caseload if SLP ID is provided
    if (options.slpId && !options.createStudentsOnly) {
      // Verify SLP exists
      const [slp] = await db
        .select()
        .from(slpTable)
        .where(and(eq(slpTable.id, options.slpId), isNull(slpTable.deletedAt)))
        .limit(1);

      if (!slp) {
        console.log(`⚠️  SLP with ID ${options.slpId} not found. Skipping caseload creation.`);
        console.log("   Students were created but not added to any caseload.");
        return;
      }

      // Check existing caseload entries
      const existingCaseloads = await db
        .select()
        .from(caseloadTable)
        .where(eq(caseloadTable.slpId, options.slpId))
        .limit(1);

      if (existingCaseloads.length > 0) {
        console.log("⚠️  Caseload entries already exist for this SLP.");
        console.log("   Students were created but not added to caseload.");
        return;
      }

      // Add students to SLP's caseload
      const caseloads = createdStudents.map((student) => ({
        id: crypto.randomUUID(),
        slpId: options.slpId!,
        studentId: student.id,
      }));

      await db.insert(caseloadTable).values(caseloads);
      console.log(`✅ Added ${caseloads.length} students to SLP caseload`);
    } else if (!options.createStudentsOnly) {
      console.log("ℹ️  No SLP ID provided. Students created but not added to any caseload.");
      console.log("   To add students to a caseload:");
      console.log("   1. Get your SLP ID from the database");
      console.log("   2. Run: bun run seed.ts --slp-id=<your-slp-id>");
    }

    console.log("\n🎉 Seed completed successfully!");
    console.log("\n📝 Created Students:");
    createdStudents.forEach((student) => {
      console.log(`   - ${student.name} (Age: ${student.age || "N/A"})`);
    });

    if (options.slpId) {
      console.log(`\n✅ Students added to SLP caseload (ID: ${options.slpId})`);
    } else {
      console.log("\n💡 To add these students to an SLP's caseload:");
      console.log("   1. Sign up and create your SLP profile through the app");
      console.log("   2. Get your SLP ID from the database");
      console.log("   3. Run this seed again with --slp-id option");
    }
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run seed if this file is executed directly
if (import.meta.main) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options: SeedOptions = {};

  // Check for --slp-id argument
  const slpIdIndex = args.indexOf("--slp-id");
  if (slpIdIndex !== -1 && args[slpIdIndex + 1]) {
    options.slpId = args[slpIdIndex + 1];
  }

  // Check for --create-students-only flag
  if (args.includes("--create-students-only")) {
    options.createStudentsOnly = true;
  }

  seed(options)
    .then(() => {
      console.log("✅ Seed script finished");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seed script failed:", error);
      process.exit(1);
    });
}

export { seed };
export type { SeedOptions };
