import { randomUUID, scryptSync } from "node:crypto";
import nextEnv from "@next/env";
import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

const { loadEnvConfig } = nextEnv;
const { Client } = pg;

function hashPassword(password) {
  const salt = randomUUID();
  const hash = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}

loadEnvConfig(process.cwd());

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is missing. Add it to .env.local before migrating.");
  process.exit(1);
}

const migrationsDirectory = new URL("../database/migrations/", import.meta.url);
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((file) => /^\d+.*\.sql$/.test(file))
  .sort();
const client = new Client({ connectionString, connectionTimeoutMillis: 10000 });

try {
  await client.connect();
  await client.query("BEGIN");
  for (const file of migrationFiles) {
    const migrationSql = await readFile(new URL(file, migrationsDirectory), "utf8");
    await client.query(migrationSql);
  }
  await client.query("COMMIT");

  const result = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' ORDER BY table_name"
  );
  console.log(`Migration applied. Tables in current schema: ${result.rows.map((row) => row.table_name).join(", ")}`);

  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  if (adminEmail && adminPassword.length >= 8) {
    const inserted = await client.query(
      `INSERT INTO fundora_users (id, email, password_hash, full_name, role)
       SELECT $1, $2, $3, $4, 'admin'
       WHERE NOT EXISTS (SELECT 1 FROM fundora_users WHERE LOWER(email) = $2)
       RETURNING email`,
      [randomUUID(), adminEmail, hashPassword(adminPassword), "Administrateur Fundora"]
    );
    if (inserted.rowCount) console.log(`Admin account created for ${adminEmail}.`);
    else console.log(`Admin account already exists for ${adminEmail}.`);
  } else {
    console.log("Skip admin seed: set ADMIN_EMAIL and ADMIN_PASSWORD (min. 8 chars) in .env.local to create the first admin.");
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(`PostgreSQL migration failed (${error.code ?? "unknown"}): ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}