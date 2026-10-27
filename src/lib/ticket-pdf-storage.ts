import { db } from '@/src/db/index.ts';
import { orders } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { createServiceRoleClient, TICKET_PDF_BUCKET } from '@/src/lib/supabase/admin.ts';

async function ensureTicketPdfBucket(client: ReturnType<typeof createServiceRoleClient>) {
  const { data: buckets } = await client.storage.listBuckets();
  const exists = (buckets || []).some((b) => b.name === TICKET_PDF_BUCKET);
  if (!exists) {
    const { error } = await client.storage.createBucket(TICKET_PDF_BUCKET, {
      public: true,
      fileSizeLimit: 8 * 1024 * 1024,
      allowedMimeTypes: ['application/pdf'],
    });
    if (error && !/already exists/i.test(error.message)) {
      throw error;
    }
  }
}

/** Upload PDF buffer and save public URL on orders.ticket_pdf_url */
export async function uploadAndSaveOrderTicketPdf(opts: {
  orderId: number;
  orderNumber: string;
  ticketCode: string;
  buffer: Buffer;
}): Promise<string | null> {
  try {
    const client = createServiceRoleClient();
    await ensureTicketPdfBucket(client);
    const path = `orders/${opts.orderNumber}/${opts.ticketCode}-${Date.now()}.pdf`;
    const { error } = await client.storage.from(TICKET_PDF_BUCKET).upload(path, opts.buffer, {
      contentType: 'application/pdf',
      upsert: true,
      cacheControl: '86400',
    });
    if (error) {
      console.warn('[ticket-pdf-storage] upload failed:', error.message);
      return null;
    }
    const { data: pub } = client.storage.from(TICKET_PDF_BUCKET).getPublicUrl(path);
    const url = pub.publicUrl || null;
    if (url) {
      await db
        .update(orders)
        .set({ ticketPdfUrl: url, updatedAt: new Date() })
        .where(eq(orders.id, opts.orderId));
    }
    return url;
  } catch (err: any) {
    console.warn('[ticket-pdf-storage] skip persist:', err?.message || err);
    return null;
  }
}
