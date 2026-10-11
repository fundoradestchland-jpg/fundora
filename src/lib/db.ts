import pg from "pg";
import { readFileSync } from "node:fs";

const { Pool } = pg;
const globalForDatabase = globalThis as typeof globalThis & { fundoraPool?: pg.Pool };
const sslRootCertificate = process.env.DATABASE_SSL_ROOT_CERT;
const ssl = sslRootCertificate
  ? (() => {
      try {
        return { ca: readFileSync(sslRootCertificate, "utf8"), rejectUnauthorized: true };
      } catch {
        console.warn("DATABASE_SSL_ROOT_CERT is set but the certificate file could not be read. Falling back to default TLS settings.");
        return undefined;
      }
    })()
  : undefined;

export const database = globalForDatabase.fundoraPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(ssl ? { ssl } : {}),
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

database.on("error", (error) => {
  console.error("PostgreSQL idle connection error", (error as NodeJS.ErrnoException).code ?? "unknown");
});

if (process.env.NODE_ENV !== "production") globalForDatabase.fundoraPool = database;