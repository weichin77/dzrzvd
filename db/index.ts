import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDatabaseUrl } from "@/lib/config";
import * as schema from "./schema";

type SqlClient = ReturnType<typeof postgres>;
type Database = ReturnType<typeof drizzle<typeof schema>>;

let sqlClient: SqlClient | null = null;
let database: Database | null = null;

export function getSql(): SqlClient {
  if (!sqlClient) {
    sqlClient = postgres(getDatabaseUrl(), {
      prepare: false,
      max: 1,
      connect_timeout: 10,
      idle_timeout: 20,
      max_lifetime: 60 * 15,
    });
  }

  return sqlClient;
}

export function getDb(): Database {
  if (!database) {
    database = drizzle(getSql(), { schema });
  }

  return database;
}
