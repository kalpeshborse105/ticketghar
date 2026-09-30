import { NextResponse } from 'next/server';
import { pool } from '@/src/db/index';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health — safe liveness + DB check. Never exposes credentials.
 */
export async function GET() {
  const started = Date.now();
  let database: 'connected' | 'disconnected' = 'disconnected';
  let supabase: 'configured' | 'missing' = 'missing';
  const environment =
    process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
      ? 'production'
      : 'development';

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      supabase = 'configured';
    } else if (
      process.env.SQL_HOST?.includes('supabase') ||
      process.env.DATABASE_URL?.includes('supabase')
    ) {
      supabase = 'configured';
    }

    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      database = 'connected';
    } finally {
      client.release();
    }

    return NextResponse.json({
      ok: true,
      app: 'MahaTicket',
      database,
      supabase,
      environment,
      latencyMs: Date.now() - started,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        app: 'MahaTicket',
        database: 'disconnected',
        supabase,
        environment,
        latencyMs: Date.now() - started,
      },
      { status: 503 }
    );
  }
}
