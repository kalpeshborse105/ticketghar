import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: path.resolve(process.cwd(), '.env'), override: true });

async function main() {
  const connectionString = (process.env.DATABASE_URL || '')
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '');

  const pool = connectionString
    ? new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      })
    : new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME || 'postgres',
        port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      });

  const client = await pool.connect();
  try {
    console.log('Connected to database. Creating home_sections table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS home_sections (
        id SERIAL PRIMARY KEY,
        section_key TEXT UNIQUE NOT NULL,
        title_en TEXT NOT NULL,
        title_mr TEXT NOT NULL,
        subtitle_en TEXT DEFAULT '',
        subtitle_mr TEXT DEFAULT '',
        badge_en TEXT DEFAULT '',
        badge_mr TEXT DEFAULT '',
        sort_order INT DEFAULT 0,
        is_visible INT DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    const defaultSections = [
      {
        section_key: 'hero',
        title_en: 'Featured Shows',
        title_mr: 'विशेष शिफारस व थेट बुकिंग',
        subtitle_en: 'Explore top trending Marathi dramas & concerts',
        subtitle_mr: 'महाराष्ट्रातील लोकप्रिय नाट्यप्रयोग व थेट संगीतमय मैफिली',
        badge_en: 'LIVE BOOKING',
        badge_mr: 'थेट बुकिंग',
        sort_order: 1,
      },
      {
        section_key: 'trending',
        title_en: 'Trending Shows This Week',
        title_mr: 'या आठवड्यातील लोकप्रिय प्रयोग',
        subtitle_en: 'Top rated theatre shows based on genuine audience reviews',
        subtitle_mr: 'रसिक प्रेक्षकांच्या पसंतीस उतरलेली लोकप्रिय नाटके',
        badge_en: 'POPULAR TRENDING',
        badge_mr: 'लोकप्रिय ट्रेंडिंग',
        sort_order: 2,
      },
      {
        section_key: 'today',
        title_en: "What to Watch Today?",
        title_mr: 'आज काय पाहायचं?',
        subtitle_en: 'Special shows in your city today',
        subtitle_mr: 'तुमच्या परिसरातील आजचे खास नाट्यप्रयोग',
        badge_en: "TODAY'S SPECIAL",
        badge_mr: 'आजचे प्रयोग',
        sort_order: 3,
      },
      {
        section_key: 'promoted',
        title_en: 'Promoted & Editor Picks',
        title_mr: 'विशेष शिफारस',
        subtitle_en: 'Most anticipated shows across Maharashtra',
        subtitle_mr: 'पुणे व महाराष्ट्रातील सर्वाधिक लोकप्रिय कार्यक्रम',
        badge_en: 'PROMOTED',
        badge_mr: 'विशेष शिफारस',
        sort_order: 4,
      },
      {
        section_key: 'categories',
        title_en: 'Explore by Category',
        title_mr: 'कॅटेगरीनुसार शोधा',
        subtitle_en: 'Choose your best entertainment experience',
        subtitle_mr: 'सर्वोत्कृष्ट कला व मनोरंजनाचा अनुभव निवडा',
        badge_en: 'GENRES',
        badge_mr: 'प्रकार निवडा',
        sort_order: 5,
      },
      {
        section_key: 'drama',
        title_en: 'Marathi Theatre Special',
        title_mr: 'मराठी रंगभूमी विशेष 🎭',
        subtitle_en: 'Maharashtra\'s favorite classic and modern plays',
        subtitle_mr: 'महाराष्ट्रातील सर्वाधिक पसंतीची नाटके',
        badge_en: 'THEATRE',
        badge_mr: 'नाट्य विशेष',
        sort_order: 6,
      },
      {
        section_key: 'music',
        title_en: 'Live Music & Concerts',
        title_mr: 'थेट संगीत व नवरात्री गरबा 🪘',
        subtitle_en: 'Dandiya, folk arts and live musical concerts',
        subtitle_mr: 'दांडिया, लोककला व लाईव्ह कॉन्सर्ट्स',
        badge_en: 'CONCERTS',
        badge_mr: 'संगीत महोत्सव',
        sort_order: 7,
      },
      {
        section_key: 'venues',
        title_en: 'Iconic Theatres',
        title_mr: 'शहरातील प्रतिष्ठित नाट्यगृहे 🏛️',
        subtitle_en: 'Historic auditoriums with premium acoustic seating',
        subtitle_mr: 'अत्याधुनिक आसनव्यवस्था व ध्वनी सुविधा असलेली प्रेक्षागृहे',
        badge_en: 'AUDITORIUMS',
        badge_mr: 'प्रतिष्ठित नाट्यगृहे',
        sort_order: 8,
      },
      {
        section_key: 'festival',
        title_en: 'Maharashtra Mahotsav Offer',
        title_mr: 'महाराष्ट्र महोत्सव विशेष ऑफर',
        subtitle_en: 'Flat ₹50 OFF on advance online booking with code MAHA50',
        subtitle_mr: 'MAHA50 कोड वापरा आणि मिळवा फ्लॅट ₹५० ची सूट',
        badge_en: 'LIMITED OFFER',
        badge_mr: 'मर्यादित ऑफर',
        sort_order: 9,
      },
    ];

    for (const sec of defaultSections) {
      await client.query(`
        INSERT INTO home_sections (section_key, title_en, title_mr, subtitle_en, subtitle_mr, badge_en, badge_mr, sort_order, is_visible)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
        ON CONFLICT (section_key) DO UPDATE SET
          title_en = EXCLUDED.title_en,
          title_mr = EXCLUDED.title_mr,
          subtitle_en = EXCLUDED.subtitle_en,
          subtitle_mr = EXCLUDED.subtitle_mr,
          badge_en = EXCLUDED.badge_en,
          badge_mr = EXCLUDED.badge_mr,
          sort_order = EXCLUDED.sort_order;
      `, [sec.section_key, sec.title_en, sec.title_mr, sec.subtitle_en, sec.subtitle_mr, sec.badge_en, sec.badge_mr, sec.sort_order]);
    }

    const { rows } = await client.query('SELECT section_key, title_mr, title_en, sort_order, is_visible FROM home_sections ORDER BY sort_order ASC');
    console.log('home_sections successfully initialized! Total:', rows.length);
    console.table(rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
