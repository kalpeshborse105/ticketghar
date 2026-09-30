// GET /api/admin/audit-logs - Audit trail viewer for compliance
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { auditLogs } from '@/src/db/schema.ts';
import { desc } from 'drizzle-orm';
import { requireAdmin } from '@/src/lib/admin-auth.ts';

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    const logs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(Math.min(limit, 500));

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error('Failed to fetch audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
