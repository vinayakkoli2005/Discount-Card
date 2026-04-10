/**
 * VoLo — Appwrite Schema Migration (Phase 0.3)
 *
 * Run with:  npx tsx scripts/migrate-appwrite.ts
 *
 * Safe to re-run — skips attributes/indexes/collections that already exist.
 */

import { Client, Databases, Storage, ID, DatabasesIndexType, Permission, Role } from "node-appwrite";
import * as fs from "fs";
import * as path from "path";

// ─── Load .env ────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) throw new Error(".env file not found");
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const ENDPOINT  = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!;
const PROJECT   = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!;
const DB_ID     = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const STORES_COL = process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!;
const BUCKET_ID  = process.env.EXPO_PUBLIC_APPWRITE_STORE_IMAGES_BUCKET_ID!;
const API_KEY    = process.env.APPWRITE_API_KEY_MIGRATIONS!;

if (!ENDPOINT || !PROJECT || !DB_ID || !STORES_COL || !API_KEY) {
  console.error("❌ Missing required env vars. Check your .env file.");
  process.exit(1);
}

// ─── Appwrite Client ──────────────────────────────────────────────────────────
const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT)
  .setKey(API_KEY);

const databases = new Databases(client);
const storage   = new Storage(client);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function safeRun(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    console.log(`  ✅ ${label}`);
  } catch (e: unknown) {
    const err = e as { code?: number; message?: string };
    if (err.code === 409) {
      console.log(`  ⏭  ${label} — already exists, skipping`);
    } else {
      console.error(`  ❌ ${label} — ${err.message}`);
      throw e;
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🚀 VoLo Appwrite Migration — Phase 0.3\n");
  console.log(`   Endpoint : ${ENDPOINT}`);
  console.log(`   Project  : ${PROJECT}`);
  console.log(`   Database : ${DB_ID}`);
  console.log(`   Stores   : ${STORES_COL}\n`);

  // ── 1. Add attributes to Stores collection ──────────────────────────────────
  console.log("📦 Step 1: Adding attributes to stores collection…");

  await safeRun("images (String[], max 5 per store)", () =>
    databases.createStringAttribute(DB_ID, STORES_COL, "images", 256, false, undefined, true)
  );

  await safeRun("phone (String, optional)", () =>
    databases.createStringAttribute(DB_ID, STORES_COL, "phone", 32, false)
  );

  await safeRun("opening_hours (String, optional)", () =>
    databases.createStringAttribute(DB_ID, STORES_COL, "opening_hours", 128, false)
  );

  await safeRun("is_active (Boolean, default true)", () =>
    databases.createBooleanAttribute(DB_ID, STORES_COL, "is_active", false, true)
  );

  await safeRun("product_count (Integer, default 0)", () =>
    databases.createIntegerAttribute(DB_ID, STORES_COL, "product_count", false, 0, 99999, 0)
  );

  await safeRun("owner_id (String, required)", () =>
    databases.createStringAttribute(DB_ID, STORES_COL, "owner_id", 64, false)
  );

  // Wait for Appwrite to settle attributes before creating indexes
  console.log("\n  ⏳ Waiting 3s for attributes to settle before creating indexes…");
  await sleep(3000);

  // ── 2. Add indexes to Stores collection ─────────────────────────────────────
  console.log("\n🔍 Step 2: Adding indexes to stores collection…");

  await safeRun("fulltext index on name", () =>
    databases.createIndex(DB_ID, STORES_COL, "idx_name_fulltext", DatabasesIndexType.Fulltext, ["name"])
  );

  await safeRun("fulltext index on address", () =>
    databases.createIndex(DB_ID, STORES_COL, "idx_address_fulltext", DatabasesIndexType.Fulltext, ["address"])
  );

  await safeRun("fulltext index on description", () =>
    databases.createIndex(DB_ID, STORES_COL, "idx_description_fulltext", DatabasesIndexType.Fulltext, ["description"])
  );

  await safeRun("key index on owner_id", () =>
    databases.createIndex(DB_ID, STORES_COL, "idx_owner_id", DatabasesIndexType.Key, ["owner_id"])
  );

  await safeRun("key index on is_active", () =>
    databases.createIndex(DB_ID, STORES_COL, "idx_is_active", DatabasesIndexType.Key, ["is_active"])
  );

  // ── 3. Create Products collection ───────────────────────────────────────────
  console.log("\n📦 Step 3: Creating products collection…");
  const PRODUCTS_COL = "products";

  await safeRun("create products collection", () =>
    databases.createCollection(
      DB_ID,
      PRODUCTS_COL,
      "Products",
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    )
  );

  await safeRun("products.store_id (String, required)", () =>
    databases.createStringAttribute(DB_ID, PRODUCTS_COL, "store_id", 64, true)
  );

  await safeRun("products.name (String, required)", () =>
    databases.createStringAttribute(DB_ID, PRODUCTS_COL, "name", 128, true)
  );

  await safeRun("products.price (Float, optional)", () =>
    databases.createFloatAttribute(DB_ID, PRODUCTS_COL, "price", false)
  );

  await safeRun("products.description (String, optional)", () =>
    databases.createStringAttribute(DB_ID, PRODUCTS_COL, "description", 1024, false)
  );

  await safeRun("products.image_id (String, optional)", () =>
    databases.createStringAttribute(DB_ID, PRODUCTS_COL, "image_id", 64, false)
  );

  await safeRun("products.category (String, required)", () =>
    databases.createStringAttribute(DB_ID, PRODUCTS_COL, "category", 64, true)
  );

  await safeRun("products.owner_id (String, required)", () =>
    databases.createStringAttribute(DB_ID, PRODUCTS_COL, "owner_id", 64, true)
  );

  console.log("\n  ⏳ Waiting 3s for products attributes to settle…");
  await sleep(3000);

  await safeRun("products index on store_id", () =>
    databases.createIndex(DB_ID, PRODUCTS_COL, "idx_store_id", DatabasesIndexType.Key, ["store_id"])
  );

  await safeRun("products index on owner_id", () =>
    databases.createIndex(DB_ID, PRODUCTS_COL, "idx_products_owner_id", DatabasesIndexType.Key, ["owner_id"])
  );

  await safeRun("products index on category", () =>
    databases.createIndex(DB_ID, PRODUCTS_COL, "idx_products_category", DatabasesIndexType.Key, ["category"])
  );

  // ── 4. Create user_events collection (recsys stub) ──────────────────────────
  console.log("\n📦 Step 4: Creating user_events collection (recsys stub)…");
  const EVENTS_COL = "user_events";

  await safeRun("create user_events collection", () =>
    databases.createCollection(
      DB_ID,
      EVENTS_COL,
      "User Events",
      [
        Permission.create(Role.users()),
        Permission.read(Role.users()),
      ]
    )
  );

  await safeRun("user_events.user_id", () =>
    databases.createStringAttribute(DB_ID, EVENTS_COL, "user_id", 64, true)
  );

  await safeRun("user_events.event_type", () =>
    databases.createStringAttribute(DB_ID, EVENTS_COL, "event_type", 64, true)
  );

  await safeRun("user_events.store_id (optional)", () =>
    databases.createStringAttribute(DB_ID, EVENTS_COL, "store_id", 64, false)
  );

  await safeRun("user_events.query (optional)", () =>
    databases.createStringAttribute(DB_ID, EVENTS_COL, "query", 256, false)
  );

  await safeRun("user_events.category (optional)", () =>
    databases.createStringAttribute(DB_ID, EVENTS_COL, "category", 64, false)
  );

  // ── 5. Create store-images storage bucket ───────────────────────────────────
  console.log("\n🪣  Step 5: Creating store-images storage bucket…");

  try {
    await storage.createBucket(
      BUCKET_ID,
      "Store Images",
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.delete(Role.users()),
      ],
      false,
      true,
      5 * 1024 * 1024,
      ["jpg", "jpeg", "png", "webp"]
    );
    console.log(`  ✅ bucket: ${BUCKET_ID}`);
  } catch (e: unknown) {
    const err = e as { code?: number; type?: string; message?: string };
    if (err.code === 409) {
      console.log(`  ⏭  bucket: ${BUCKET_ID} — already exists, skipping`);
    } else if (err.type === "additional_resource_not_allowed") {
      console.warn(`  ⚠️  bucket: ${BUCKET_ID} — plan limit reached.`);
      console.warn(`     Check Appwrite Console → Storage for an existing '${BUCKET_ID}' bucket.`);
      console.warn(`     If it exists, you're fine. If not, delete an unused bucket to free a slot.`);
    } else {
      throw e;
    }
  }

  console.log("\n✅ Migration complete!\n");
  console.log("Next steps:");
  console.log("  1. Verify collections in Appwrite Console");
  console.log("  2. Check that fulltext indexes are in AVAILABLE state (may take ~30s)");
  console.log("  3. Proceed with Phase 1 implementation\n");
}

main().catch((e) => {
  console.error("\n💥 Migration failed:", e);
  process.exit(1);
});
