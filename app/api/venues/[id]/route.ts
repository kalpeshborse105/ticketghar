import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { venues, events, eventSessions, ticketTypes } from '@/src/db/schema.ts';
import { eq, or, ilike, sql, and, gte } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Venue ID is required' }, { status: 400 });
    }

    const numId = parseInt(id, 10);
    const isNumeric = !isNaN(numId);

    // 1. Fetch Venue details
    let venueRows: any[] = [];
    if (isNumeric) {
      venueRows = await db.select().from(venues).where(eq(venues.id, numId)).limit(1);
    } else {
      const searchPattern = `%${id.replace(/-/g, '%')}%`;
      venueRows = await db
        .select()
        .from(venues)
        .where(
          or(
            ilike(venues.name, searchPattern),
            ilike(venues.nameMr, searchPattern),
            ilike(venues.address, searchPattern)
          )
        )
        .limit(1);
    }

    if (venueRows.length === 0) {
      // Fallback for curated iconic theatres if not in DB
      const ICONIC_FALLBACKS: Record<string, any> = {
        'bal-gandharva': {
          id: 1,
          name: 'Bal Gandharva Ranga Mandir',
          nameMr: 'बालगंधर्व रंगमंदिर',
          address: 'झांशीची राणी लक्ष्मीबाई चौक, JM रोड, शिवाजीनगर',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411005',
          latitude: '18.5204',
          longitude: '73.8567',
          facilities: JSON.stringify(['९५० आसने', 'AC सभागृह', 'कॅफेटेरिया', 'व्हीआयपी पार्किंग', 'उत्कृष्ट ध्वनीसंयोजन']),
          totalCapacity: 950,
          description: 'महाराष्ट्राच्या नाट्यसंस्कृतीचे केंद्रस्थान. अत्याधुनिक ध्वनी यंत्रणा, प्रशस्त वातानुकूलित सभागृह आणि विस्तीर्ण वाहनतळ.',
        },
        'yashwantrao': {
          id: 3,
          name: 'Yashwantrao Chavan Natyagruha',
          nameMr: 'यशवंतराव चव्हाण नाट्यगृह',
          address: 'पौड रोड, कोथरूड, पुणे',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411038',
          latitude: '18.5074',
          longitude: '73.8077',
          facilities: JSON.stringify(['८००+ आसने', 'मेट्रो थेट जोडणी', 'मोठे पार्किंग', 'वातानुकूलित सभागृह']),
          totalCapacity: 800,
          description: 'पश्चिम पुण्यातील रसिकांचे आवडते नाट्यगृह. आरामदायक सिटिंग, दर्जेदार अकौस्टिक्स आणि मेट्रो स्टेशनच्या अगदी लगत.',
        },
        'tilak-smarak': {
          id: 5,
          name: 'Tilak Smarak Mandir',
          nameMr: 'टिळक स्मारक मंदिर',
          address: 'टिळक रोड, सदाशिव पेठ, पुणे',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411030',
          latitude: '18.5098',
          longitude: '73.8523',
          facilities: JSON.stringify(['७२० आसने', 'पेठ परिसराच्या केंद्रस्थानी', 'पारंपरिक स्टेज', 'स्नॅक कॉर्नर']),
          totalCapacity: 720,
          description: 'पुण्याच्या मध्यवस्तीतील ऐतिहासिक नाट्यगृह. संगीत नाटके, प्रायोगिक रंगभूमी व व्याख्यानांसाठी सुप्रसिद्ध ठिकाण.',
        },
      };

      const matchedFallback = ICONIC_FALLBACKS[id.toLowerCase()] || (isNumeric ? Object.values(ICONIC_FALLBACKS).find(v => v.id === numId) : null);
      if (!matchedFallback) {
        return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
      }
      venueRows = [matchedFallback];
    }

    const venue = venueRows[0];
    const venueId = venue.id;

    // 2. Fetch all upcoming shows/events at this venue from current to future
    const rawEvents = await db
      .select({
        id: events.id,
        title: events.title,
        titleMr: events.titleMr,
        slug: events.slug,
        category: events.category,
        categoryMr: events.categoryMr,
        posterUrl: events.posterUrl,
        durationMinutes: events.durationMinutes,
        description: events.description,
        descriptionMr: events.descriptionMr,
        status: events.status,
      })
      .from(events)
      .where(eq(events.venueId, venueId));

    // Also fetch sessions for these events
    const eventIds = rawEvents.map((e) => e.id);
    let sessionsList: any[] = [];
    let ticketTypesList: any[] = [];

    if (eventIds.length > 0) {
      sessionsList = await db
        .select()
        .from(eventSessions)
        .where(
          and(
            sql`${eventSessions.eventId} IN ${eventIds}`,
            eq(eventSessions.status, 'active')
          )
        )
        .orderBy(eventSessions.sessionStartTime);

      const sessionIds = sessionsList.map((s) => s.id);
      if (sessionIds.length > 0) {
        ticketTypesList = await db
          .select()
          .from(ticketTypes)
          .where(sql`${ticketTypes.sessionId} IN ${sessionIds}`);
      }
    }

    // Attach sessions and ticket prices to events
    const upcomingEvents = rawEvents.map((ev) => {
      const evSessions = sessionsList
        .filter((s) => s.eventId === ev.id)
        .map((s) => ({
          ...s,
          ticketTypes: ticketTypesList.filter((tt) => tt.sessionId === s.id),
        }));

      return {
        ...ev,
        sessions: evSessions,
        nextSession: evSessions[0] || null,
        minPrice: evSessions[0]?.ticketTypes?.[0]?.price || 25000,
      };
    });

    return NextResponse.json({
      success: true,
      venue,
      upcomingEvents,
      totalShowsCount: upcomingEvents.reduce((acc, curr) => acc + (curr.sessions?.length || 0), 0),
    });
  } catch (error: any) {
    console.error('Error fetching venue details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venue details' },
      { status: 500 }
    );
  }
}
