import pg from "pg";

const { Pool } = pg;
const globalForDatabase = globalThis as typeof globalThis & { fundoraPool?: pg.Pool };

export const database = globalForDatabase.fundoraPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

database.on("error", (error) => {
  console.error("PostgreSQL idle connection error", (error as NodeJS.ErrnoException).code ?? "unknown");
});

if (process.env.NODE_ENV !== "production") globalForDatabase.fundoraPool = database;