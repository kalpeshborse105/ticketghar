import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, verifyAdminSession } from '@/src/lib/admin-auth.ts';
import { createServiceRoleClient, EVENT_MEDIA_BUCKET } from '@/src/lib/supabase/admin.ts';

export const runtime = 'nodejs';

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB
const ALLOWED = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);

async function ensureBucket(client: ReturnType<typeof createServiceRoleClient>) {
  const { data: buckets } = await client.storage.listBuckets();
  const exists = (buckets || []).some((b) => b.name === EVENT_MEDIA_BUCKET);
  if (!exists) {
    const { error } = await client.storage.createBucket(EVENT_MEDIA_BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: Array.from(ALLOWED),
    });
    if (error && !/already exists/i.test(error.message)) {
      throw error;
    }
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const session = verifyAdminSession(request);

  try {
    const form = await request.formData();
    const file = form.get('file');
    const kind = String(form.get('kind') || 'gallery'); // cover | gallery
    const eventId = form.get('eventId') ? String(form.get('eventId')) : 'draft';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, WebP, or GIF images are allowed.' },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image must be 6 MB or smaller.' }, { status: 400 });
    }

    const client = createServiceRoleClient();
    await ensureBucket(client);

    const ext =
      file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
          ? 'webp'
          : file.type === 'image/gif'
            ? 'gif'
            : 'jpg';
    const safeKind = kind === 'cover' ? 'cover' : 'gallery';
    const path = `events/${eventId}/${safeKind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await client.storage.from(EVENT_MEDIA_BUCKET).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
      cacheControl: '31536000',
    });

    if (uploadError) {
      console.error('Upload error:', uploadError.message);
      return NextResponse.json({ error: uploadError.message || 'Upload failed' }, { status: 502 });
    }

    const { data: pub } = client.storage.from(EVENT_MEDIA_BUCKET).getPublicUrl(path);
    return NextResponse.json({
      success: true,
      url: pub.publicUrl,
      path,
      kind: safeKind,
      uploadedBy: session.user?.email || session.role || 'admin',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    console.error('Admin upload error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
