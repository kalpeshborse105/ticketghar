import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

function resolveConnectionString(): string | null {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return null;
  // Strip sslmode so node-pg does not force verify-full against Supabase chain.
  return raw
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');
}

function buildPoolConfig(): ConstructorParameters<typeof Pool>[0] {
  const connectionString = resolveConnectionString();
  if (connectionString) {
    return {
      connectionString,
      max: 10,
      connectionTimeoutMillis: 20000,
      ssl: { rejectUnauthorized: false },
    };
  }

  const host = process.env.SQL_HOST;
  if (!host) {
    throw new Error('Database not configured: set DATABASE_URL or SQL_HOST');
  }

  return {
    host,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME || 'postgres',
    port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432,
    max: 10,
    connectionTimeoutMillis: 20000,
    ssl:
      process.env.SQL_SSL === 'true' || host.includes('supabase')
        ? { rejectUnauthorized: false }
        : undefined,
  };
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool(buildPoolConfig());
    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = drizzle(pool, { schema });
export { pool };
