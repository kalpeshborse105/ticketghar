import { NextRequest, NextResponse } from 'next/server';
import { pool, db } from '@/src/db/index';
import { eventReviews, orders } from '@/src/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getCustomerSession } from '@/src/lib/auth-service';

async function ensureReviewsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.event_reviews (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
        user_email TEXT NOT NULL,
        user_name TEXT NOT NULL,
        city TEXT,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT NOT NULL,
        verified_attendance INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_event_user_review UNIQUE (event_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_event_reviews_event ON public.event_reviews (event_id);
    `);
  } catch (err) {
    console.warn('Could not run ensureReviewsTable:', err);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureReviewsTable();
    const { id } = await params;
    const eventId = Number(id);

    if (!eventId || isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    // Check current user session
    const customerUser = await getCustomerSession();

    // Fetch reviews from DB
    const reviewsList = await db
      .select()
      .from(eventReviews)
      .where(eq(eventReviews.eventId, eventId))
      .orderBy(desc(eventReviews.createdAt));

    // Calculate real stats
    const totalCount = reviewsList.length;
    const sumRatings = reviewsList.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = totalCount > 0 ? Number((sumRatings / totalCount).toFixed(1)) : 0;

    const breakdown = {
      five: 0,
      four: 0,
      three: 0,
      two: 0,
      one: 0,
    };

    reviewsList.forEach((r) => {
      if (r.rating === 5) breakdown.five++;
      else if (r.rating === 4) breakdown.four++;
      else if (r.rating === 3) breakdown.three++;
      else if (r.rating === 2) breakdown.two++;
      else if (r.rating === 1) breakdown.one++;
    });

    const breakdownPercent = {
      five: totalCount > 0 ? Math.round((breakdown.five / totalCount) * 100) : 0,
      four: totalCount > 0 ? Math.round((breakdown.four / totalCount) * 100) : 0,
      three: totalCount > 0 ? Math.round((breakdown.three / totalCount) * 100) : 0,
      two: totalCount > 0 ? Math.round((breakdown.two / totalCount) * 100) : 0,
      one: totalCount > 0 ? Math.round((breakdown.one / totalCount) * 100) : 0,
    };

    const hasUserReviewed = customerUser
      ? reviewsList.some((r) => r.userId === customerUser.id || r.userEmail === customerUser.email)
      : false;

    return NextResponse.json({
      reviews: reviewsList.map((r) => ({
        id: r.id,
        author: r.userName,
        email: r.userEmail,
        city: r.city || 'पुणे',
        rating: r.rating,
        date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('mr-IN') : 'आत्ताच',
        comment: r.comment,
        verified: r.verifiedAttendance === 1,
      })),
      totalCount,
      averageRating,
      breakdown: breakdownPercent,
      hasUserReviewed,
      currentUser: customerUser
        ? {
            id: customerUser.id,
            name: customerUser.fullName,
            email: customerUser.email,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Error fetching event reviews:', error);
    return NextResponse.json(
      {
        reviews: [],
        totalCount: 0,
        averageRating: 0,
        breakdown: { five: 0, four: 0, three: 0, two: 0, one: 0 },
        hasUserReviewed: false,
        currentUser: null,
      },
      { status: 200 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureReviewsTable();
    const { id } = await params;
    const eventId = Number(id);

    if (!eventId || isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const body = await request.json();
    const { rating, comment, city, userEmail: bodyEmail, userName: bodyName } = body;

    // 1. User identification (Web session or Mobile payload)
    const customerUser = await getCustomerSession();
    const effectiveEmail = customerUser?.email || bodyEmail;
    const effectiveName = customerUser?.fullName || bodyName || (effectiveEmail ? effectiveEmail.split('@')[0] : 'प्रेक्षक');
    let effectiveUserId = customerUser?.id || null;

    if (!effectiveEmail) {
      return NextResponse.json(
        { error: 'परीक्षण नोंदवण्यासाठी कृपया लॉगिन करा (Login required to rate this show)' },
        { status: 401 }
      );
    }

    if (!effectiveUserId) {
      // Look up user in db by email if present
      const uRes = await pool.query('SELECT id, full_name FROM users WHERE email = $1 LIMIT 1', [effectiveEmail.toLowerCase()]);
      if (uRes.rows.length > 0) {
        effectiveUserId = uRes.rows[0].id;
      }
    }

    // Never invent user_id=1 — reviews require a real users row
    if (!effectiveUserId) {
      return NextResponse.json(
        {
          error:
            'परीक्षण नोंदवण्यासाठी कृपया लॉगिन करा (Login required — no matching user account)',
        },
        { status: 401 }
      );
    }

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return NextResponse.json(
        { error: 'कृपया १ ते ५ मधील स्टार रेटिंग निवडा (Rating between 1 and 5 is required)' },
        { status: 400 }
      );
    }

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return NextResponse.json(
        { error: 'कृपया आपले मत किंवा परीक्षण लिहा (Comment is required)' },
        { status: 400 }
      );
    }

    // 2. Prevent duplicate rating for the same event by the same user
    const existing = await pool.query(
      `SELECT id FROM event_reviews 
       WHERE event_id = $1 
         AND (LOWER(user_email) = LOWER($2) ${effectiveUserId ? 'OR user_id = ' + effectiveUserId : ''}) 
       LIMIT 1`,
      [eventId, effectiveEmail]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'तुम्ही या कार्यक्रमाचे परीक्षण आधीच नोंदवले आहे (You have already reviewed this event)' },
        { status: 409 }
      );
    }

    // Check if user has an actual confirmed order for this event (verified attendance)
    let verifiedAttendance = 0;
    try {
      if (effectiveUserId) {
        const userOrders = await db
          .select({ id: orders.id })
          .from(orders)
          .where(
            and(
              eq(orders.eventId, eventId),
              eq(orders.userId, effectiveUserId),
              eq(orders.orderStatus, 'confirmed')
            )
          )
          .limit(1);
        if (userOrders.length > 0) {
          verifiedAttendance = 1;
        }
      }
    } catch {
      // Non-blocking
    }

    // 3. Insert review into database
    const insertRes = await pool.query(
      `INSERT INTO event_reviews (event_id, user_id, user_email, user_name, city, rating, comment, verified_attendance, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [
        eventId,
        effectiveUserId,
        effectiveEmail.toLowerCase(),
        effectiveName,
        city?.trim() || 'पुणे',
        numRating,
        comment.trim(),
        verifiedAttendance,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'आपले परीक्षण यशस्वीरीत्या नोंदवले गेले आहे (Review submitted successfully)',
      review: insertRes.rows[0],
    });
  } catch (error: any) {
    console.error('Error submitting review:', error);
    if (error?.message?.includes('duplicate key') || error?.code === '23505') {
      return NextResponse.json(
        { error: 'तुम्ही या कार्यक्रमाचे परीक्षण आधीच नोंदवले आहे (You have already reviewed this event)' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error?.message || 'परीक्षण नोंदवताना त्रुटी आली' },
      { status: 500 }
    );
  }
}
