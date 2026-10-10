import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index.ts';
import { venues, eventSessions, events } from '@/src/db/schema.ts';
import { eq, and, gte, sql } from 'drizzle-orm';

const CANONICAL_MAHARASHTRA_VENUES = [
  // Nagpur
  {
    id: 101,
    name: 'Dr. Vasantrao Deshpande Hall',
    nameMr: 'डॉ. वसंतराव देशपांडे सभागृह',
    address: 'Civil Lines, Nagpur',
    city: 'Nagpur',
    totalCapacity: 850,
    facilitiesList: ['AC सभागृह', 'अत्याधुनिक ध्वनी यंत्रणा', 'विस्तीर्ण वाहनतळ'],
    showCount: 4,
  },
  {
    id: 102,
    name: 'Kavivarya Suresh Bhat Sabhagruh',
    nameMr: 'कविवर्य सुरेश भट सभागृह',
    address: 'Reshimbagh, Great Nag Road, Nagpur',
    city: 'Nagpur',
    totalCapacity: 2000,
    facilitiesList: ['भव्य सभागृह', 'सेंट्रल AC', 'प्रशस्त वाहनतळ'],
    showCount: 3,
  },
  {
    id: 103,
    name: 'Sai Sabhagruh',
    nameMr: 'श्री साई सभागृह',
    address: 'Shankar Nagar, Nagpur',
    city: 'Nagpur',
    totalCapacity: 600,
    facilitiesList: ['AC सभागृह', 'ध्वनी व्यवस्था', 'कॅफेटेरिया'],
    showCount: 2,
  },

  // Pune
  {
    id: 1,
    name: 'Bal Gandharva Ranga Mandir',
    nameMr: 'बालगंधर्व रंगमंदिर',
    address: 'JM Road, Shivajinagar, Pune',
    city: 'Pune',
    totalCapacity: 950,
    facilitiesList: ['AC सभागृह', 'अत्याधुनिक ध्वनी', 'वाहनतळ'],
    showCount: 6,
  },
  {
    id: 2,
    name: 'Yashwantrao Chavan Natyagruha',
    nameMr: 'यशवंतराव चव्हाण नाट्यगृह',
    address: 'Kothrud, Pune',
    city: 'Pune',
    totalCapacity: 900,
    facilitiesList: ['AC सभागृह', 'लिफ्ट', 'प्रशस्त वाहनतळ'],
    showCount: 5,
  },
  {
    id: 3,
    name: 'Tilak Smarak Mandir',
    nameMr: 'टिळक स्मारक मंदिर',
    address: 'Tilak Road, Sadashiv Peth, Pune',
    city: 'Pune',
    totalCapacity: 750,
    facilitiesList: ['मध्यवर्ती स्थान', 'AC सभागृह', 'कॅफेटेरिया'],
    showCount: 4,
  },

  // Mumbai
  {
    id: 4,
    name: 'Shri Chhatrapati Shivaji Mandir',
    nameMr: 'श्री छत्रपती शिवाजी मंदिर नाट्यगृह',
    address: 'Dadar West, Mumbai',
    city: 'Mumbai',
    totalCapacity: 1025,
    facilitiesList: ['ऐतिहासिक वारसा', 'AC सभागृह', 'दादर स्टेशन जवळ'],
    showCount: 6,
  },
  {
    id: 5,
    name: 'Dinanath Mangeshkar Natyagruha',
    nameMr: 'दीनानाथ मंगेशकर नाट्यगृह',
    address: 'Vile Parle East, Mumbai',
    city: 'Mumbai',
    totalCapacity: 900,
    facilitiesList: ['उत्कृष्ट ध्वनी', 'AC सभागृह', 'वाहनतळ'],
    showCount: 5,
  },
  {
    id: 6,
    name: 'Damodar Hall',
    nameMr: 'दामोदर नाट्यगृह',
    address: 'Parel, Mumbai',
    city: 'Mumbai',
    totalCapacity: 700,
    facilitiesList: ['AC सभागृह', 'नाट्य परंपरा', 'कॅफे'],
    showCount: 3,
  },

  // Thane
  {
    id: 7,
    name: 'Ram Ganesh Gadkari Rangayatan',
    nameMr: 'राम गणेश गडकरी रंगायतन',
    address: 'Talao Pali, Thane West',
    city: 'Thane',
    totalCapacity: 1080,
    facilitiesList: ['तलाव पाळी परिसर', 'AC सभागृह', 'वाहनतळ'],
    showCount: 5,
  },
  {
    id: 8,
    name: 'Dr. Kashinath Ghanekar Natyagruha',
    nameMr: 'डॉ. काशिनाथ घाणेकर नाट्यगृह',
    address: 'Hiranandani Meadows, Ghodbunder Rd, Thane',
    city: 'Thane',
    totalCapacity: 1200,
    facilitiesList: ['भव्य आधुनिक सभागृह', 'सेंट्रल AC', 'प्रशस्त पार्किंग'],
    showCount: 4,
  },

  // Nashik
  {
    id: 9,
    name: 'Mahakavi Kalidas Kalamandir',
    nameMr: 'महाकवी कालिदास कलामंदिर',
    address: 'Shalimar, Nashik',
    city: 'Nashik',
    totalCapacity: 880,
    facilitiesList: ['मध्यवर्ती ठिकाण', 'AC सभागृह', 'अत्याधुनिक ध्वनी'],
    showCount: 4,
  },
  {
    id: 10,
    name: 'Parshuram Saikhedkar Natyagruha',
    nameMr: 'परशुराम सायखेडकर नाट्यगृह',
    address: 'Old CBS, Nashik',
    city: 'Nashik',
    totalCapacity: 650,
    facilitiesList: ['वारसा रंगमंच', 'AC सभागृह', 'कॅफेटेरिया'],
    showCount: 3,
  },

  // Chhatrapati Sambhaji Nagar
  {
    id: 11,
    name: 'Sant Eknath Rangmandir',
    nameMr: 'संत एकनाथ रंगमंदिर',
    address: 'Osmanpura, Chhatrapati Sambhaji Nagar',
    city: 'Chhatrapati Sambhaji Nagar',
    totalCapacity: 920,
    facilitiesList: ['AC सभागृह', 'विशाल रंगमंच', 'पार्किंग'],
    showCount: 3,
  },

  // Kolhapur
  {
    id: 12,
    name: 'Sangeetsurya Keshavrao Bhosle Natyagruha',
    nameMr: 'संगीतसूर्य केशवराव भोसले नाट्यगृह',
    address: 'Khasbag, Kolhapur',
    city: 'Kolhapur',
    totalCapacity: 950,
    facilitiesList: ['ऐतिहासिक खासबाग परिसर', 'AC सभागृह', 'उत्कृष्ट ध्वनी'],
    showCount: 4,
  },

  // Solapur
  {
    id: 13,
    name: 'Hutatma Smruti Mandir',
    nameMr: 'हुतात्मा स्मृती मंदिर नाट्यगृह',
    address: 'Park Chowk, Solapur',
    city: 'Solapur',
    totalCapacity: 800,
    facilitiesList: ['मध्यवर्ती चौक', 'AC सभागृह', 'पार्किंग'],
    showCount: 3,
  },

  // Sangli
  {
    id: 14,
    name: 'Deval Club Natyagruha',
    nameMr: 'गोविंदराव टेंबे रंगमंच (देवल क्लब)',
    address: 'Rajwada Chowk, Sangli',
    city: 'Sangli',
    totalCapacity: 750,
    facilitiesList: ['नाट्य परंपरा', 'AC सभागृह', 'वाहनतळ'],
    showCount: 3,
  },

  // Satara
  {
    id: 15,
    name: 'Chhatrapati Shahu Rangmandir',
    nameMr: 'छत्रपती शाहू रंगमंदिर',
    address: 'Powai Naka, Satara',
    city: 'Satara',
    totalCapacity: 850,
    facilitiesList: ['मध्यवर्ती स्थान', 'AC सभागृह', 'अत्याधुनिक ध्वनी'],
    showCount: 3,
  },

  // Amravati
  {
    id: 16,
    name: 'Sant Gadge Baba Sabhagruh',
    nameMr: 'संत गाडगे बाबा सभागृह',
    address: 'Camp Area, Amravati',
    city: 'Amravati',
    totalCapacity: 900,
    facilitiesList: ['AC सभागृह', 'प्रशस्त व्यासपीठ', 'कॅफेटेरिया'],
    showCount: 2,
  },

  // Nanded
  {
    id: 17,
    name: 'Kusumagraj Natyagruha',
    nameMr: 'कुसुमाग्रज नाट्यगृह',
    address: 'Vazirabad, Nanded',
    city: 'Nanded',
    totalCapacity: 800,
    facilitiesList: ['AC सभागृह', 'ध्वनी यंत्रणा', 'पार्किंग'],
    showCount: 2,
  },

  // Ratnagiri
  {
    id: 18,
    name: 'Swatantryaveer Savarkar Natyagruha',
    nameMr: 'स्वातंत्र्यवीर सावरकर नाट्यगृह',
    address: 'Thiba Palace Road, Ratnagiri',
    city: 'Ratnagiri',
    totalCapacity: 700,
    facilitiesList: ['कोकण नाट्यकेंद्र', 'AC सभागृह', 'समुद्रकिनारा परिसर'],
    showCount: 3,
  },

  // Jalgaon
  {
    id: 19,
    name: 'Chhatrapati Sambhaji Raje Natyagruha',
    nameMr: 'छत्रपती संभाजी राजे नाट्यगृह',
    address: 'Mehrun, Jalgaon',
    city: 'Jalgaon',
    totalCapacity: 850,
    facilitiesList: ['AC सभागृह', 'आधुनिक सोयी', 'वाहनतळ'],
    showCount: 2,
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedCity = (searchParams.get('city') || 'महाराष्ट्र (All)').trim();

    let dbVenues: any[] = [];
    try {
      dbVenues = await db
        .select({
          id: venues.id,
          name: venues.name,
          nameMr: venues.nameMr,
          address: venues.address,
          city: venues.city,
          facilities: venues.facilities,
          totalCapacity: venues.totalCapacity,
          latitude: venues.latitude,
          longitude: venues.longitude,
        })
        .from(venues);
    } catch (e) {
      console.warn('DB venues read fallback:', e);
    }

    const now = new Date();

    // Batch fetch active show counts per venue in 1 single GROUP BY query
    const showCountMap: Record<number, number> = {};
    try {
      const showCounts = await db
        .select({
          venueId: events.venueId,
          count: sql<number>`count(*)::int`,
        })
        .from(eventSessions)
        .innerJoin(events, eq(eventSessions.eventId, events.id))
        .where(gte(eventSessions.sessionStartTime, now))
        .groupBy(events.venueId);

      showCounts.forEach((sc) => {
        if (sc.venueId) showCountMap[sc.venueId] = Number(sc.count);
      });
    } catch { }

    // Map DB venues with batch show counts
    const mappedDbVenues = dbVenues.map((v) => {
      let parsedFacilities: string[] = ['AC सभागृह', 'वाहनतळ', 'कॅफेटेरिया'];
      if (v.facilities) {
        try {
          parsedFacilities = typeof v.facilities === 'string' ? JSON.parse(v.facilities) : v.facilities;
        } catch { }
      }

      return {
        ...v,
        showCount: showCountMap[v.id] || 2,
        facilitiesList: parsedFacilities,
      };
    });

    // Combine DB venues with canonical catalog
    const combinedVenues = [...mappedDbVenues];
    for (const canonical of CANONICAL_MAHARASHTRA_VENUES) {
      const exists = combinedVenues.some(
        (v) =>
          v.name.toLowerCase().includes(canonical.name.toLowerCase()) ||
          canonical.name.toLowerCase().includes(v.name.toLowerCase()) ||
          (v.nameMr && canonical.nameMr && v.nameMr === canonical.nameMr)
      );
      if (!exists) {
        combinedVenues.push(canonical);
      }
    }

    // STRICT CITY FILTERING — NEVER leak cross-city venues
    const MARATHI_TO_ENG_CITY: Record<string, string> = {
      'पुणे': 'Pune',
      'मुंबई': 'Mumbai',
      'ठाणे': 'Thane',
      'नागपूर': 'Nagpur',
      'नाशिक': 'Nashik',
      'संभाजीनगर': 'Chhatrapati Sambhaji Nagar',
      'छत्रपती संभाजीनगर': 'Chhatrapati Sambhaji Nagar',
      'औरंगाबाद': 'Chhatrapati Sambhaji Nagar',
      'कोल्हापूर': 'Kolhapur',
      'सोलापूर': 'Solapur',
      'सांगली': 'Sangli',
      'सातारा': 'Satara',
      'अमरावती': 'Amravati',
      'नांदेड': 'Nanded',
      'रत्नागिरी': 'Ratnagiri',
      'जळगाव': 'Jalgaon',
    };

    let filteredVenues: any[] = [];
    if (
      selectedCity &&
      selectedCity !== 'महाराष्ट्र (All)' &&
      selectedCity !== 'Maharashtra' &&
      selectedCity.toLowerCase() !== 'all'
    ) {
      const normalizedTarget = (MARATHI_TO_ENG_CITY[selectedCity] || selectedCity).toLowerCase();
      filteredVenues = combinedVenues.filter((v) => {
        if (!v.city) return false;
        const venueCity = v.city.toLowerCase();
        return (
          venueCity === normalizedTarget ||
          venueCity.includes(normalizedTarget) ||
          normalizedTarget.includes(venueCity)
        );
      });
    } else {
      // All Maharashtra: showcase up to 6 iconic theatres, strictly 1 theatre per city!
      const seenCities = new Set<string>();
      filteredVenues = [];
      for (const v of combinedVenues) {
        if (!v.city) continue;
        const normCity = v.city.toLowerCase();
        if (!seenCities.has(normCity)) {
          seenCities.add(normCity);
          filteredVenues.push(v);
          if (filteredVenues.length >= 6) break;
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        city: selectedCity,
        totalCount: filteredVenues.length,
        venues: filteredVenues,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } }
    );
  } catch (error: any) {
    console.error('Error fetching venues:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch venues',
        venues: [],
      },
      { status: 500 }
    );
  }
}
