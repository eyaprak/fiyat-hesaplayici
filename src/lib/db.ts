import { Pool } from "pg";

const globalForPg = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForPg.pool ??
  new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgres://postgres:postgres@localhost:5433/fiyat",
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForPg.pool = pool;
