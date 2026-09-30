import { NextResponse } from 'next/server';
import { pool } from '@/src/db/index';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * Safe liveness + database connectivity check.
 * Never exposes passwords or internal stack traces.
 */
export async function GET() {
  const started = Date.now();
  let database: 'connected' | 'disconnected' = 'disconnected';
  let supabase: 'configured' | 'missing' = 'missing';

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      supabase = 'configured';
    } else if (process.env.SQL_HOST?.includes('supabase') || process.env.DATABASE_URL?.includes('supabase')) {
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
      latencyMs: Date.now() - started,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        app: 'MahaTicket',
        database: 'disconnected',
        supabase,
        latencyMs: Date.now() - started,
      },
      { status: 503 }
    );
  }
}
